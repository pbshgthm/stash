# AGENTS

Conventions for anyone — human or agent — adding to or changing tools in this repo. **stash** is a set of single-file bash CLI tools for macOS; each lives at `tools/<name>/<name>` with a sibling `README.md`. These rules keep every tool consistent, hackable, and dependency-free — follow them. `loco` and `pluck` are the reference implementations; match their shape.

## Core principles

- **One bash script per tool.** No Python, no Node, no build step. Bash keeps the tool hackable on any Unix box with zero runtime deps. If the logic outgrows bash, it's too big to live here — spin it out.
- **Single file, no extension.** `loco`, not `loco.sh`. The shebang says what it is; users type the bare name.
- **Every tool has a sibling `<name>.md`.** The script carries terse inline `--help`; the markdown is the longer reference — what it is, why it exists, how it works, edge cases, troubleshooting.
- **Self-installing, self-removing.** A tool that touches the system (bin entry, LaunchDaemons, config dirs) installs itself via `init` and undoes everything via `teardown`. Nothing left behind.
- **Short, memorable names.** ≤6 characters, one lowercase word, pronounceable. `loco`, `pluck` — not `devnet`, `gitgrab`.

## Shared style kit

Every script starts with this — copy verbatim; consistency is the point.

```bash
#!/usr/bin/env bash
set -euo pipefail

# --- style ---
if [[ -t 1 ]]; then                       # use -t 2 for tools whose result goes on stdout (e.g. pluck)
    B=$'\033[1m'  D=$'\033[2m'  G=$'\033[32m'  R=$'\033[31m'
    C=$'\033[36m' W=$'\033[37m' X=$'\033[0m'
else
    B= D= G= R= C= W= X=
fi

_ok()   { printf '%s\n' "${G}ok${X}  ${D}$*${X}"; }
_err()  { printf '%s\n' "${R}error${X}  $*" >&2; }
_info() { printf '%s\n' "${D}$*${X}"; }
_die()  { _err "$*"; exit 1; }
_yes()  { [[ $1 =~ ^[Yy]([Ee][Ss])?$ ]]; }   # prompt-response helper, bash-3.2 safe
```

- **`$'\033[…m'`** (ANSI-C quoting) stores real escape bytes, so a plain `printf '%s'` works — no `echo -e` portability trap.
- **The TTY guard** strips colors when output is piped, so downstream tools never see escape codes.
- **`_yes` instead of `${var,,}`:** stock macOS ships bash 3.2. Avoid `${var,,}`, `declare -A`, `mapfile`, and other bash-4 features — every script must run on vanilla macOS bash.

## Naming & identifiers

- Lowercase, no dashes, no extension: `loco`, `pluck`.
- Tool lives at `tools/<name>/<name>`; installs (copies) to `~/.local/bin/<name>`.
- Internal identifiers derive from the name: `CONFIG_DIR=~/.config/<name>`, `PLIST_LABEL=com.<name>.<service>`, `BIN_PATH=~/.local/bin/<name>`.

## File locations (XDG)

Anything a tool persists lives under XDG paths (use `${XDG_CONFIG_HOME:-$HOME/.config}` etc. so user overrides are respected):

```
~/.config/<name>/          # user config; kept across teardown unless the user opts to delete
~/.local/state/<name>/     # logs, runtime state; removed by teardown
~/.local/share/<name>/     # caches, app data; removed by teardown
~/.local/bin/<name>        # the installed copy; removed by teardown
```

Root-owned paths (system daemons):

- `/Library/LaunchDaemons/com.<name>.<service>.plist` — install with `sudo install -m 644 -o root -g wheel` (launchd rejects user-owned plists here); remove with `sudo rm` in teardown.

## Command semantics

**Registry tools** (manage a named collection, like `loco`'s project mappings):

```
<tool> add <name> <args…>    # create or update (upsert)
<tool> rm <name>             # remove
<tool> list | ls             # show all with status
```

Use `add`/`rm` (the package-manager mental model), not `set`/`unset` (reads like a config store).

**Service tools** (manage a long-running daemon):

```
<tool> init        # first-time install: bin copy, plist, dirs, launch
<tool> start       # start the daemon
<tool> stop        # stop the daemon (disables auto-start until next 'start')
<tool> status      # service state + registry
<tool> teardown    # full uninstall; interactive opt-ins for config and deps
<tool> paths       # every file/dir the tool owns (debugging)
```

**One-shot tools** (no persistent state, single job, like `pluck`) stay flag-based:

```
<tool> <required-arg> [options]
```

## Install & self-install

**Installing is always a copy.** `install <tool>` (from GitHub or a clone) drops a standalone copy at `~/.local/bin/<tool>`. The installed command never depends on this repo — move, rename, or delete the clone and it keeps working. That independence is the whole point: a symlink back into the clone breaks the moment the clone moves.

A tool with an `init` (service tools) places its own binary the same way. Resolve the script's real path with a symlink walker — **not** `cd + pwd`, which only follows *directory* symlinks — so `init` copies the true source whether it's run from the clone or from the already-installed copy:

```bash
_resolve_script() {
    local src="${BASH_SOURCE[0]}"
    while [[ -L "$src" ]]; do
        local target
        target=$(readlink "$src")
        [[ $target = /* ]] || target="$(cd -P "$(dirname "$src")" && pwd)/$target"
        src=$target
    done
    printf '%s/%s' "$(cd -P "$(dirname "$src")" && pwd)" "$(basename "$src")"
}
SCRIPT_PATH="$(_resolve_script)"
BIN_PATH="$HOME/.local/bin/<name>"

_ensure_installed() {
    [[ "$SCRIPT_PATH" == "$BIN_PATH" ]] && return 0   # already the installed copy — no-op
    rm -f "$BIN_PATH"                                  # replace a stale copy; never write through a symlink
    install -m 755 "$SCRIPT_PATH" "$BIN_PATH"
}
```

## Teardown contract

A tool that writes to the system must have a `teardown` that:

1. Prints exactly what it will do, then asks `Continue? [y/N]`.
2. Stops and unloads any launchd daemon (`launchctl bootout system/<label>`).
3. Removes the plist, bin copy, state dir, share dir.
4. Asks **separately** before removing config (`~/.config/<name>/`) — users often keep settings for a re-install.
5. Asks **separately** before uninstalling any package `init` installed (e.g. via brew).
6. Prints what remains and how to re-enable.

After `teardown` with "yes" everywhere, the machine looks exactly as it did before `init`.

## Help & output

- Open `--help` with an ASCII banner of the tool name, bold + cyan (`${B}${C}`), indented two spaces, from `figlet -f speed <name>` inside a `<<'BANNER'` heredoc (so `\` and `$` stay literal). Follow with a blank line, the tagline `  ${B}<tool>${X} ${D}— <pitch>${X}`, then the sections. Mirror the same banner atop `<name>.md`.
- Sections headed `${C}Section:${X}` (Setup, Projects, Options, Examples…). Examples come last.
- Status indicators: `${G}● active${X}` / `${D}○ idle${X}`; `${G}ok${X}` / `${R}error${X}` as line prefixes.
- Column-aligned lists use `printf` with fixed widths, never `echo`.
- One-shot tools send progress/status to **stderr** so `stdout` stays clean for piping the result.

## Error handling

- `set -euo pipefail` in every script.
- Fatal: `_die "message"` → stderr, exit 1.
- Recoverable (bad usage, missing arg): `_err "usage: …"; _info "  hint"; return 1` — the hint says exactly what to type next.
- Don't `sudo` speculatively — only when the step actually needs root.

## Code comments

- Explain **why**, never **what**. `# atomic write — survives a crash mid-write` earns its place; `# write to tmp then mv` just restates the code.
- Section dividers (`# --- helpers ---`, `# --- commands ---`, `# --- main ---`) help navigation.
- Note non-obvious choices: bash 3.2 compat, ordering that matters, a macOS quirk. No multi-paragraph docstrings — bash isn't the place for prose.

## Checklist for a new tool

- [ ] Single bash file, no extension, `chmod +x`.
- [ ] Sibling `<name>.md`: what it does, install, commands, how it works, teardown, limitations.
- [ ] Shebang `#!/usr/bin/env bash`, `set -euo pipefail`, style kit copied verbatim.
- [ ] Short, lowercase, memorable name.
- [ ] Touches the system? Has `init` + an interactive, complete `teardown`.
- [ ] Self-installs by **copying** (standalone, repo-independent); uses `_resolve_script`, not `cd + pwd`.
- [ ] Runs on stock macOS bash 3.2 (no `${var,,}`, `declare -A`, `mapfile`).
- [ ] Persists only under XDG paths; every root-owned path removable via teardown.
- [ ] `--help` opens with the `figlet -f speed <name>` banner; sections formatted; examples last.
- [ ] Comments explain WHY, not WHAT.
