# utils — conventions for self-contained CLI tools

This directory holds small, self-contained CLI tools. Each tool is a single bash script with a specific, narrow purpose. `loco` (local dev domains) and `pluck` (GitHub downloader) are the reference implementations — match their shape when adding a new util.

## Core principles

- **One bash script per tool.** No Python, no Node, no build step. Bash keeps the tool hackable on any Unix box and removes runtime dependencies. If the logic needs more than bash, the tool is too big to live here — spin it out.
- **Single file, no extension.** `loco`, not `loco.sh`. The shebang tells the OS what it is; users type the name without `.sh`.
- **Every tool has a sibling `<name>.md`.** The script carries terse inline `--help`; the markdown is the longer-form reference — what it is, why it exists, how it works internally, edge cases, troubleshooting. Users read the `.md` when browsing the repo; the `--help` when they're in-flight. See `loco.md` and `pluck.md`.
- **Self-installing, self-removing.** Tools that touch the system (bin symlinks, LaunchDaemons, config dirs) must install themselves via `init` and undo everything via `teardown`. No orphaned state after `teardown`.
- **Short, memorable names.** Prefer ≤6 characters. Single lowercase word. Pronounceable. `loco`, `pluck` — not `devnet`, `gitgrab`, `system-monitor-tool`.

## Shared style kit

Every script starts with this. Copy verbatim — consistency across tools is the point.

```bash
#!/usr/bin/env bash
set -euo pipefail

# --- style ---
if [[ -t 1 ]]; then                       # use -t 2 for tools whose result goes on stdout and status on stderr (e.g. pluck)
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

**Why `$'\033[…m'`?** ANSI-C quoting makes the vars hold real escape bytes, so plain `echo "$B…"` or `printf '%s\n' "…"` works. Avoids the `echo -e` portability trap.

**Why the TTY guard?** Strips colors when output is piped — downstream tools shouldn't see escape codes.

**Why `_yes` instead of `${var,,}`?** Stock macOS ships bash 3.2; `${var,,}` is bash 4+. Every script here must run on vanilla macOS. Avoid `${var,,}`, `declare -A`, `mapfile`, and other bash-4 features.

## Naming

- Lowercase, no dashes, no extension. `loco`, `pluck`.
- Tool lives at `utils/<name>`, symlinks to `~/.local/bin/<name>`.
- Internal identifiers derive from the tool name: `CONFIG_DIR=~/.config/<name>`, `PLIST_LABEL=com.<name>.<service>`, `SYMLINK_PATH=~/.local/bin/<name>`.

## File locations (XDG)

Anything a tool persists lives under XDG-standard paths:

```
~/.config/<name>/          # user config; preserved across teardown unless user opts in to delete
~/.local/state/<name>/     # logs, runtime state; removed by teardown
~/.local/share/<name>/     # caches, app data; removed by teardown
~/.local/bin/<name>        # the symlink to the script; removed by teardown
```

Use `${XDG_CONFIG_HOME:-$HOME/.config}` etc. so the paths respect user overrides.

**Root-owned paths** (for system daemons):
- `/Library/LaunchDaemons/com.<name>.<service>.plist` — install with `sudo install -m 644 -o root -g wheel`; launchd rejects user-owned plists in this dir. Remove with `sudo rm` in teardown.

## Semantics — verbs

**Registry tools** (tools that manage a named collection, like `loco` does for project mappings):

```
<tool> add <name> <args…>    # create or update (upsert)
<tool> rm <name>             # remove
<tool> list | ls             # show all with status
```

Do **not** use `set`/`unset` — those read like a config store, not a registry. `add`/`rm` matches the package-manager mental model.

**Service tools** (tools that manage a long-running daemon):

```
<tool> init                  # first-time install: bin symlink, plist, dirs, launch
<tool> start                 # start the daemon
<tool> stop                  # stop the daemon (disables auto-start until next 'start')
<tool> status                # show service state + registry
<tool> teardown              # full uninstall; interactive opt-ins for config and deps
<tool> paths                 # list every file/dir the tool owns (for debugging)
```

**One-shot tools** (no persistent state, single job — like `pluck`) stay flag-based:

```
<tool> <required-arg> [options]
```

## Self-install pattern

Any tool with an `init` subcommand self-symlinks. Resolve its own real path via a symlink walker — **not** `cd + pwd`, which only follows *directory* symlinks and leaves you pointing at the file symlink:

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
```

**Why this matters:** if a tool is invoked via its own symlink (`~/.local/bin/loco`) and naïvely recomputes `SCRIPT_PATH` from `BASH_SOURCE[0]`, it ends up being the symlink path itself. Then `ln -s $SCRIPT_PATH $SYMLINK_PATH` produces a self-loop → next invocation hits `ELOOP` → "too many levels of symbolic links." This bit us once; walk the symlinks.

## Teardown contract

Every tool that writes to the system must have a `teardown` subcommand that:

1. Prints exactly what it's about to do, then asks `Continue? [y/N]`.
2. Stops and unloads any launchd daemon (`launchctl bootout system/<label>`).
3. Removes the plist, bin symlink, state dir, share dir.
4. Asks **separately** before removing config (`~/.config/<name>/`) — users often want to keep their settings for a later re-install.
5. Asks **separately** before uninstalling any package the tool's `init` installed (e.g. via brew).
6. Prints what remains (the script file itself is never touched) and how to re-enable.

Contract: after `teardown` with "yes" everywhere, the machine looks exactly as it did before `init`.

## Help and output

- Open with an ASCII banner of the tool name, bold + cyan (`${B}${C}`), indented two spaces, generated with `figlet -f speed <name>`. Follow it with a blank line, then the indented tagline `  ${B}<tool>${X} ${D}— <one-line pitch>${X}`, another blank line, then the sections.
- The banner goes inside a `<<'BANNER'` heredoc so backslashes and `$` stay literal. Mirror the same banner at the top of `<name>.md` in a fenced code block so the repo browsing view and `--help` feel like the same tool.
- Sections headed `${C}Section:${X}` (Setup, Projects, Options, Examples, …).
- Examples are always the last section.
- Status indicators: `${G}● active${X}` / `${D}○ idle${X}`; `${G}ok${X}` / `${R}error${X}` as line prefixes.
- Column-aligned lists use `printf` with fixed widths, never `echo`.
- For one-shot tools, progress/status messages go to **stderr** so `stdout` stays clean for piping the actual result.

## Error handling

- `set -euo pipefail` in every script.
- Fatal: `_die "message"` → stderr, exit 1.
- Recoverable (wrong usage, missing arg): `_err "usage: …"; _info "  hint"; return 1`. The hint should tell the user exactly what to type next.
- Don't `sudo` speculatively — only when the step actually needs root.

## Code comments

- Explain **why**, never **what**. `# atomic write — survives crash mid-write` is useful; `# write to tmp then mv` just restates the code.
- Section dividers (`# --- helpers ---`, `# --- commands ---`, `# --- main ---`) help readers jump around in a long script.
- Leave a one-line note where a choice is non-obvious: bash 3.2 compat, ordering that matters, a macOS quirk. Future-you will not remember.
- No multi-paragraph docstrings. Bash isn't the place for prose.

## Checklist for a new util

Before committing a new tool to this directory:

- [ ] Single bash file, no extension, `chmod +x`.
- [ ] Sibling `<name>.md` covering what it does, install, commands, how it works, teardown/uninstall, limitations.
- [ ] Shebang `#!/usr/bin/env bash`, `set -euo pipefail`.
- [ ] Style block + `_ok/_err/_info/_die` copied verbatim.
- [ ] Name is short, lowercase, memorable.
- [ ] If it touches the system: has `init` + `teardown`; teardown is interactive and complete.
- [ ] If it self-installs: uses `_resolve_script`, not `cd + pwd`.
- [ ] Runs on stock macOS bash 3.2 (no `${var,,}`, `declare -A`, `mapfile`).
- [ ] Persists only under XDG paths; all root-owned paths removable via teardown.
- [ ] `help` starts with a `figlet -f speed <name>` banner in bold cyan, then the tagline. Same banner at the top of `<name>.md`.
- [ ] `help` is section-formatted; examples come last.
- [ ] Comments explain WHY, not WHAT.
