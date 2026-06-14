# decal

```text
_________                 ______
______  /________________ ___  /
_  __  /_  _ \  ___/  __ `/_  /
/ /_/ / /  __/ /__ / /_/ /_  /
\__,_/  \___/\___/ \__,_/ /_/
```

`decal` — keep custom icons on your macOS apps, and re-apply them after updates wipe them.

macOS stores a custom app icon *inside* the app bundle. When an app updates — a Homebrew cask, or a self-updater like Sparkle — it replaces the whole bundle and your custom icon reverts to the default. decal keeps your icons in **one folder** (`~/.config/decal/icons/`, one `<App>.icns` per app) and re-applies them on demand. There's no registry and no daemon (macOS forbids background icon changes — see Permissions); the folder *is* the config, and `decal` is the verb.

## Install

```
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s decal
```

Drops `decal` into `~/.local/bin/`. It shells out to [`fileicon`](https://github.com/mklement0/fileicon) and installs it via Homebrew on first use if missing.

## Usage

```
decal                    apply every saved icon (the default)
decal add <app> <icns>   import an icon and set it
decal rm <app>           remove the icon, restore the app's default
decal ls                 list saved icons + live status
decal teardown           restore all, delete the folder + symlink
decal help               the banner + this summary
```

Two ways to add an icon:

- **Drag-and-drop** — drop an `<App>.icns` (named exactly like the app, e.g. `Ghostty.icns`) into `~/.config/decal/icons/`, then run `decal`.
- **`decal add`** — `decal add Ghostty ~/Downloads/whatever.icns`. The source can live anywhere; decal **copies it into its folder** (renamed to match the app), so you can move or delete the original afterward.

Then, forever after, whenever an app updates and loses its icon: just run `decal`.

## How it works

- Icons live in `~/.config/decal/icons/` as `<App>.icns`. That folder is the entire state — back it up / sync it and your icons follow.
- `apply` (the default) walks the folder and, for each `<App>.icns`, sets it on `/Applications/<App>.app` (or `~/Applications/<App>.app`). It skips apps whose icon is already set, so it's cheap to re-run.
- Setting/removing icons is delegated to `fileicon`, which writes the icon into the bundle and flips the `kHasCustomIcon` flag. decal then bumps the bundle's mtime and restarts the Dock so Finder/Dock/⌘-Tab refresh immediately.

## Permissions

macOS gates writing to app bundles behind the **App Management** privacy permission. A **background** process (cron, LaunchAgent) is denied with `Operation not permitted` — which is why decal is a run-it-yourself command, not a daemon. Run it from your terminal; the first time, grant your terminal app **App Management** under *System Settings → Privacy & Security → App Management*. decal detects the denial and prints this hint.

## Limitations

- Matches by name to `/Applications/<App>.app` or `~/Applications/<App>.app`; apps installed elsewhere aren't found.
- One `.icns` per app — point it at a finished icon, not an `.iconset`.
- Can't run unattended (the App Management restriction above). `decal apply` is idempotent, so re-running after an update is the workflow.
- macOS-only.

## Uninstall

```
decal teardown      # restores icons, removes ~/.config/decal + the symlink
```

Or just `rm ~/.local/bin/decal` to drop the command and leave your icons in place.
