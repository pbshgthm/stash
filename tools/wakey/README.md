# wakey

```text
                     ______
  ___      _______ ___  /___________  __
  __ | /| / /  __ `/_  //_/  _ \_  / / /
  __ |/ |/ // /_/ /_  ,<  /  __/  /_/ /
  ____/|__/ \__,_/ /_/|_| \___/_\__, /
                               /____/
```

keep your Mac awake from the terminal — a CLI face for [Amphetamine](https://apps.apple.com/app/amphetamine/id937984704).

## what it is

[Amphetamine](https://apps.apple.com/app/amphetamine/id937984704) is a great menu-bar app for keeping a Mac awake, but it has no command line. `caffeinate` is the opposite — a CLI with no UI. Running both means **two** independent sleep assertions that drift out of sync.

`wakey` resolves that by making Amphetamine the single engine and giving it a CLI. It sends Amphetamine AppleScript verbs, so the menu-bar UI and the terminal are always the same state — there's only ever one session to reason about.

## default behaviour

A plain `wakey on` starts a session where:

- **the system never idle-sleeps** while the session is active, and
- **it keeps running even with the lid closed** (Amphetamine's closed-display mode, laptops only), while
- **the display is still free to sleep** on idle — the screen going dark doesn't put the Mac to sleep.

In short: close the lid, walk away, the Mac stays up; the screen can still blank to save power. Override per session with `-d` (keep the screen on too) or `--lid-sleep` (let it sleep when the lid shuts).

## install

```bash
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s wakey
```

Drops `~/.local/bin/wakey`. No `init` — it's ready as soon as it's on your `PATH`.

## commands

```bash
wakey on              # awake forever; screen may sleep; survives closing the lid
wakey on 25m          # timed: minutes
wakey on 2h           # timed: hours
wakey on 90           # bare number = minutes
wakey on 2h -d        # also keep the display awake (presenting / monitoring)
wakey on --lid-sleep  # let the Mac sleep when the lid closes
wakey off             # end the session
wakey status          # show state (also the default when run with no args)
wakey while make      # awake only while `make` runs, then auto-off
```

`wakey while <cmd…>` is the `caffeinate <cmd>` pattern: it opens a session, runs the command, and ends the session however the command exits — including a failure or Ctrl-C (cleaned up via a `trap`).

## one-time setup

1. **Automation permission.** The first verb pops a macOS prompt: *"Terminal wants to control Amphetamine."* Click OK. (Change it later under System Settings ▸ Privacy & Security ▸ Automation.)
2. **Lid-closed keep-awake.** The first time closed-display mode is enabled, Amphetamine shows a safety warning that AppleScript can't dismiss for you. In **Amphetamine ▸ Preferences ▸ Sessions**, toggle *"Allow System to Sleep When Display is Closed"* once and check *"Do Not Show This Message Again"*. `wakey on` detects when this is still pending and tells you. Until then the session is still active — it just won't survive a closed lid.

> Closed-display mode keeps the Mac running with no airflow from an open lid. On battery, in a bag, that means heat. Use timed sessions (`wakey on 2h`) when you won't be back to end it.

## how it works

One bash script, no daemon, no stored state — Amphetamine owns all of it. The relevant verbs from Amphetamine's AppleScript dictionary:

| intent | verb |
| --- | --- |
| start | `start new session with options {duration:N, interval:minutes\|hours\|0, displaySleepAllowed:bool}` |
| stop | `end session` |
| running? | `session is active` → `true`/`false` |
| time left | `session time remaining` → secs; `0`=∞, `-1`=trigger, `-2`=app/date, `-3`=none |
| screen | `display sleep allowed` / `allow display sleep` / `prevent display sleep` |
| lid closed | `closed display mode enabled` / `enable closed display mode` / `disable closed display mode` |

`duration:0, interval:0` is the infinite form; otherwise `interval` is the keyword `minutes` or `hours`. Closed-display mode is set *after* the session starts (it edits the live session) and only on machines with a battery — it's a no-op on a desktop, so `wakey` skips it there.

## limitations

- **macOS only**, and needs Amphetamine installed (free on the App Store).
- **Closed-display mode is laptop-only.** On a desktop, `wakey on` still prevents system sleep; the lid line is just omitted from `status`.
- **It does not watch `caffeinate`.** If something else runs `caffeinate`, that assertion won't appear in `wakey status` — route keep-awake through `wakey` and there's nothing to sync.
- Duration is whole `minutes`/`hours` only (no `1h30m`); use `90` for 90 minutes.

## uninstall

```bash
rm ~/.local/bin/wakey
```

Nothing else to clean up — `wakey` writes no config or state of its own. Amphetamine's own preferences are untouched.
