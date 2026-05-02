# stash

```text
       _____              ______
_________  /______ __________  /_
__  ___/  __/  __ `/_  ___/_  __ \
_(__  )/ /_ / /_/ /_(__  )_  / / /
/____/ \__/ \__,_/ /____/ /_/ /_/
```

a personal stash of single-file bash tools for macOS, by [Poobesh Gowtham](https://github.com/pbshgthm).

## install

One installer, one tool name. Pick the ones you want:

```bash
# loco — local dev domains
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s loco

# pluck — github file downloader
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s pluck

# mint — random favicon generator
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s mint
```

Each invocation drops `~/.local/bin/<tool>`. If `~/.local/bin` isn't on your `PATH`, the installer prints the exact line to drop in your shell rc.

## tools

- [`loco`](./tools/loco/README.md) — make any project a local domain in two seconds
- [`pluck`](./tools/pluck/README.md) — github file downloader
- [`mint`](./tools/mint/README.md) — random favicon generator

## per-tool setup

`install` only puts binaries on `PATH`. Tools that run as a service (like `loco`) need a one-time `init` to set up their daemon, plist, or config:

```bash
loco init
```

One-shots like `pluck` and `mint` don't have an `init` — they're ready as soon as they're on `PATH`.

## philosophy

- **one bash file per tool** — no python, no node, no build step. hackable on any unix box.
- **self-installing, self-removing** — every tool installs and removes itself. nothing left behind after teardown.
- **short, memorable names** — six characters or less. one lowercase word. pronounceable.

See [CLAUDE.md](./CLAUDE.md) for the full conventions.

## uninstall

For service tools, tear down their per-tool state first (daemons, configs):

```bash
loco teardown
```

Then remove the binary:

```bash
rm ~/.local/bin/loco
```

For one-shots like `pluck` or `mint`, just `rm ~/.local/bin/<tool>`.

## docs

The landing page lives in [`docs/`](./docs/). Astro + Tailwind v4. Auto-discovers any new tool that lives at `tools/<name>/<name>` with a sibling `README.md`.
