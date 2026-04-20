# loco

```
______
___  /_________________
__  /_  __ \  ___/  __ \
_  / / /_/ / /__ / /_/ /
/_/  \____/\___/ \____/
```

**Local dev domains for macOS.** Maps `http://<name>.localhost` → `localhost:<port>` through a Caddy reverse proxy managed by launchd.

Instead of remembering `localhost:5180` / `localhost:42691` / `localhost:4321`, you get `http://myapp.localhost`, `http://admin.localhost`, `http://wiki.localhost`. Works the day you reboot, too — Caddy is installed as a system daemon.

## Requirements

- macOS (uses launchd and `/Library/LaunchDaemons`).
- [Homebrew](https://brew.sh) — `loco init` will install Caddy if it's missing.
- Stock bash 3.2 is fine. No other runtime deps.

## Install

```
bash /path/to/loco init
```

`init` is idempotent and does everything:

- `brew install caddy` if it isn't already.
- Symlinks the script to `~/.local/bin/loco` so you can call it from anywhere.
- Creates `~/.config/loco/` and generates an initial `Caddyfile`.
- Installs `/Library/LaunchDaemons/com.loco.caddy.plist` (requires `sudo`) and boots it. Caddy now auto-starts on every login.

Make sure `~/.local/bin` is on your `PATH`.

## Commands

### Setup

| Command | What it does |
|---|---|
| `loco init` | First-time setup (brew + symlink + dirs + plist + start). |
| `loco start` | Start the Caddy daemon. Re-enables auto-start on boot. |
| `loco stop` | Stop the Caddy daemon. Disables auto-start until next `loco start`. |
| `loco status` | Show daemon state, LAN IP, and the full registry. |
| `loco paths` | Print every file and directory loco owns (debugging). |
| `loco teardown` | Undo everything `init` did. Interactive. |

### Registry

| Command | What it does |
|---|---|
| `loco add <name> <port>` | Map `<name>.localhost` → `localhost:<port>`. Upserts. |
| `loco rm <name>` | Remove a mapping. |
| `loco list` / `loco ls` | List mappings. Shows `● active` / `○ idle` per port. |

Adding or removing reloads Caddy live — no daemon restart, no dropped connections.

A name can contain dots: `loco add admin.myapp 5181` produces `http://admin.myapp.localhost`.

### Ports

Thin wrappers around the `port` util, if you have it installed at `~/.local/bin/port`:

- `loco kill <port> [...]` — kill the process(es) on the given port(s).
- `loco ps [pattern]` — list listeners.
- `loco ip` — print the LAN IP of `en0`/`en1`.

## How it works

- `~/.config/loco/projects.conf` is the source of truth — one `name port` line per mapping.
- Every `add`/`rm` regenerates `~/.config/loco/Caddyfile` from that file, then calls `caddy reload`. Don't edit the Caddyfile by hand; next write will clobber it.
- The generated Caddyfile contains one `reverse_proxy` block per entry, all on plain HTTP (`auto_https off`). We rewrite `Host` to `localhost` on the way through so dev servers that bind to `localhost` don't reject the request.
- `com.loco.caddy` is a **system** LaunchDaemon so it starts at boot without anyone being logged in. The plist must be owned `root:wheel 644` — launchd refuses user-owned plists in `/Library/LaunchDaemons`. `init` takes care of this via `sudo install`.
- Logs land in `~/.local/state/loco/caddy.log` and `caddy.err.log`.
- Caddy's own data (certs, state) lives under `~/.local/share/caddy/`.

## Files

```
~/.config/loco/projects.conf        registry (human-editable, survives teardown by default)
~/.config/loco/Caddyfile             generated — do not edit
~/.local/state/loco/caddy.log        stdout
~/.local/state/loco/caddy.err.log    stderr
~/.local/share/caddy/                caddy internal data
~/.local/bin/loco                    symlink to the script
/Library/LaunchDaemons/com.loco.caddy.plist
```

`loco paths` prints these.

## Teardown

```
loco teardown
```

Stops and unloads the daemon, removes the plist, removes the bin symlink, removes logs and caddy data. Then asks separately whether you want to delete `projects.conf` (kept by default — you'll probably want it if you re-install later) and whether to `brew uninstall caddy`.

After "yes" everywhere, the only thing left is the script file itself.

## Troubleshooting

**`loco` command not found after `init`.** `~/.local/bin` isn't on your `PATH`. Add it to your shell rc.

**Changes to `projects.conf` aren't reflected.** Don't edit it directly if Caddy is running — use `loco add`/`loco rm` so the Caddyfile regenerates and Caddy reloads. Or edit the file, then run `loco start` (which regenerates and bootstraps).

**"too many levels of symbolic links" invoking `loco`.** Means the bin symlink is pointing at itself. Delete it and re-run `init`:

```
rm ~/.local/bin/loco
bash /path/to/loco init
```

(Old versions had a bug where `init` invoked via the existing symlink would re-link it to itself. Fixed — but if you upgraded across that, this is the fix.)

**Stale daemon from a previous name.** If you used to have this tool under a different name, the old plist and daemon may still be live:

```
sudo launchctl bootout system/com.<oldname>.caddy
sudo rm /Library/LaunchDaemons/com.<oldname>.caddy.plist
loco init
```
