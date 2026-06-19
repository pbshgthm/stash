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
- *Optional, for tailnet mode:* [Tailscale](https://tailscale.com) (already set up) and `dnsmasq` — `loco tailnet on` installs `dnsmasq` if it's missing.

## Install

```
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s loco
loco init
```

The first line drops a **standalone copy** of `loco` into `~/.local/bin/` — it doesn't depend on this repo staying anywhere, so the command keeps working even if you never clone (or later move the clone). The second is the one-time daemon setup. `init` is idempotent and does:

- `brew install caddy` if it isn't already.
- Ensures the `loco` binary is in `~/.local/bin/` (a standalone copy).
- Creates `~/.config/loco/` and generates an initial `Caddyfile`.
- Installs `/Library/LaunchDaemons/com.loco.caddy.plist` (requires `sudo`) and boots it. Caddy now auto-starts on every login.

Make sure `~/.local/bin` is on your `PATH` — the installer prints the line to add if it isn't.

## Commands

### Setup

| Command | What it does |
|---|---|
| `loco init` | First-time setup (caddy + binary + dirs + Caddyfile + daemon). |
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

### Tailnet

Optionally serve every project across your [Tailscale](https://tailscale.com) network, not just locally. With tailnet mode on, each project answers at **both** `name.localhost` (this machine) **and** `name.<tailscale-name>` (every device on your tailnet) — `.localhost` is never affected.

| Command | What it does |
|---|---|
| `loco tailnet on` | Enable. Detects this machine's tailscale name + IP, stands up a `dnsmasq` wildcard resolver for `*.<name>`, writes `/etc/resolver/<name>` for local resolution, and adds the second hostname to every Caddy block. |
| `loco tailnet off` | Disable. Removes the dnsmasq daemon, resolver file, and config; regenerates the Caddyfile back to `.localhost` only. |
| `loco tailnet status` | Show the tailnet domain, resolver IP, and dnsmasq state. |

**One manual step.** So your *other* devices (laptops, phone) can resolve `name.<tailscale-name>`, add a split-DNS nameserver once in the Tailscale admin console: **DNS → Add nameserver → Custom**, set it to this machine's tailscale IP, and **Restrict to domain** `<tailscale-name>`. `loco tailnet on` prints the exact values. This machine resolves the domain locally without that step — it's only needed tailnet-wide (and it's the only way iOS devices, which have no `/etc/resolver`, can resolve it).

**HTTP only.** `.<tailscale-name>` isn't a public TLD, so there's no valid TLS cert — tailnet access is plain `http://`, consistent with loco's `auto_https off`.

### Ports

Port utilities, built on `lsof`:

- `loco kill <port> [...] [-f]` — kill the listener(s) on the given port(s). Sends SIGTERM, polls for ~2s, then escalates to SIGKILL for stragglers. `-f` skips the confirm prompt.
- `loco ps [pattern]` — list TCP listeners. Optional pattern filters on command, address, user, or argv (numeric pattern is treated as an exact port).
- `loco ip` — print the LAN IP of `en0`/`en1`.

## How it works

- `~/.config/loco/projects.conf` is the source of truth — one `name port` line per mapping.
- Every `add`/`rm` regenerates `~/.config/loco/Caddyfile` from that file, then calls `caddy reload`. Don't edit the Caddyfile by hand; next write will clobber it.
- The generated Caddyfile contains one `reverse_proxy` block per entry, all on plain HTTP (`auto_https off`). We rewrite `Host` to `localhost` on the way through so dev servers that bind to `localhost` don't reject the request.
- `com.loco.caddy` is a **system** LaunchDaemon so it starts at boot without anyone being logged in. The plist must be owned `root:wheel 644` — launchd refuses user-owned plists in `/Library/LaunchDaemons`. `init` takes care of this via `sudo install`.
- Logs land in `~/.local/state/loco/caddy.log` and `caddy.err.log`.
- Caddy's own data (certs, state) lives under `~/.local/share/caddy/`.
- **Tailnet mode** (`loco tailnet on`) adds a second hostname per block — `name.localhost, name.<tailscale-name>` — and runs a small `dnsmasq` (its own `com.loco.dnsmasq` LaunchDaemon) that answers the `*.<tailscale-name>` wildcard with this machine's tailscale IP. `/etc/resolver/<tailscale-name>` points local lookups at it; a one-time Tailscale split-DNS nameserver entry covers the rest of the tailnet. `dnsmasq` binds loopback + the tailscale IP only, with `no-resolv`, so it's authoritative for that one domain and never a general/open resolver.

## Files

```
~/.config/loco/projects.conf        registry (human-editable, survives teardown by default)
~/.config/loco/Caddyfile             generated — do not edit
~/.config/loco/tailnet.enabled       tailnet flag — holds "<name> <ip>" when on
~/.config/loco/dnsmasq.conf          generated — *.<tailscale-name> wildcard (tailnet)
~/.local/state/loco/caddy.log        stdout
~/.local/state/loco/caddy.err.log    stderr
~/.local/state/loco/dnsmasq.log      dnsmasq stdout (tailnet)
~/.local/state/loco/dnsmasq.err.log  dnsmasq stderr (tailnet)
~/.local/share/caddy/                caddy internal data
~/.local/bin/loco                    standalone copy of the script
/Library/LaunchDaemons/com.loco.caddy.plist
/Library/LaunchDaemons/com.loco.dnsmasq.plist    (tailnet)
/etc/resolver/<tailscale-name>                   (tailnet) local resolver entry
```

`loco paths` prints these.

## Teardown

```
loco teardown
```

Stops and unloads the caddy daemon (and the dnsmasq daemon, if tailnet was enabled), removes the plists, the bin copy, the dnsmasq config and `/etc/resolver/<name>` entry, logs, and caddy data. Then asks separately whether you want to delete `projects.conf` (kept by default — you'll probably want it if you re-install later) and whether to `brew uninstall caddy` / `dnsmasq`. If you enabled tailnet, it also reminds you to remove the split-DNS nameserver from the Tailscale admin console (loco can't do that for you).

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
