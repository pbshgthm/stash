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

Each tool installs itself with one curl. Pick the ones you want:

```bash
# loco — local dev domains
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install/loco | bash

# pluck — github file downloader
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install/pluck | bash
```

Each script drops the tool into `~/.local/bin/<name>`. If `~/.local/bin` isn't on your `PATH`, the installer prints the exact line to drop in your shell rc.

## tools

- [`loco`](./loco.md) — make any project a local domain in two seconds
- [`pluck`](./pluck.md) — github file downloader

## per-tool setup

`install` only puts binaries on `PATH`. Tools that run as a service (like `loco`) need a one-time `init` to set up their daemon, plist, or config:

```bash
loco init
```

One-shots like `pluck` don't have an `init` — they're ready as soon as they're on `PATH`.

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

For one-shots like `pluck`, just `rm ~/.local/bin/pluck`.

## site

The landing page lives in [`site/`](./site/). Astro + Tailwind v4. Auto-discovers any new util whose `.md` file has a sibling executable in the repo root.
