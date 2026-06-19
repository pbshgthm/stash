# stash

```text
       _____              ______
_________  /______ __________  /_
__  ___/  __/  __ `/_  ___/_  __ \
_(__  )/ /_ / /_/ /_(__  )_  / / /
/____/ \__/ \__,_/ /____/ /_/ /_/
```

A personal stash of single-file bash tools for macOS, by [Poobesh Gowtham](https://github.com/pbshgthm).

Every tool is one self-contained bash script. Installing **copies** it to `~/.local/bin/` — the installed command is a standalone copy that never depends on this repo, so you can clone it anywhere, or not at all.

## Install

One installer, one tool name. Run it straight from GitHub — no clone needed:

```bash
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s loco    # local dev domains
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s pluck   # github file downloader
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s mint    # random favicon generator
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s decal   # custom app icons that survive updates
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s therm   # power & thermal read for Apple Silicon
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s wakey   # keep your Mac awake (drives Amphetamine)
```

From a local clone it's the same, offline: `./install <tool>`. Either way you get a standalone copy at `~/.local/bin/<tool>`. If `~/.local/bin` isn't on your `PATH`, the installer prints the exact line to add to your shell rc.

## Tools

- [`loco`](./tools/loco/README.md) — make any project a local domain in two seconds
- [`pluck`](./tools/pluck/README.md) — github file downloader
- [`mint`](./tools/mint/README.md) — random favicon generator
- [`decal`](./tools/decal/README.md) — custom app icons that survive updates
- [`therm`](./tools/therm/README.md) — why is your Mac hot? power & thermal read for Apple Silicon
- [`wakey`](./tools/wakey/README.md) — keep your Mac awake from the terminal (drives Amphetamine)

## Per-tool setup

`install` only puts the binary on your `PATH`. Tools that run as a service (like `loco`) need a one-time `init` to set up their daemon, plist, and config:

```bash
loco init
```

One-shots like `pluck` and `mint` have no `init` — they're ready the moment they're on `PATH`.

## Uninstall

Service tools: tear down the daemon/config first.

```bash
loco teardown
```

One-shots: just remove the binary.

```bash
rm ~/.local/bin/pluck
```

## Contributing

Building or changing a tool? See **[AGENTS.md](./AGENTS.md)** — the conventions every tool here follows: the one-bash-file philosophy, the shared style kit, naming, the copy-install pattern, the teardown contract, and a new-tool checklist.

## Docs

The landing page lives in [`docs/`](./docs/) (Astro + Tailwind v4). It auto-discovers any tool at `tools/<name>/<name>` with a sibling `README.md`.
