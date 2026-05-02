# mint

```
           _____       _____
_______ ______(_)________  /_
__  __ `__ \_  /__  __ \  __/
_  / / / / /  / _  / / / /_
/_/ /_/ /_//_/  /_/ /_/\__/
```

**Generate a random favicon (PNG).** One bash script, seedable, no AI.

You're starting a project. You need a favicon. You don't want to design one and you don't want to pull in a logo generator. `mint` rolls a tiny SVG composition from a curated palette + shape pool, hands it to `rsvg-convert`, and drops a square PNG on disk.

## Install

```
curl -fsSL https://raw.githubusercontent.com/pbshgthm/stash/main/install | bash -s mint
```

Drops `mint` into `~/.local/bin/`. The first run installs `librsvg` via Homebrew if it isn't already (mint shells out to `rsvg-convert` for SVG → PNG). Make sure `~/.local/bin` is on your `PATH`.

## Usage

```
mint [destination] [options]
```

Bare `mint` prints help; pass at least one flag or a destination to actually generate. With no destination, writes `./favicon.png`. Each run is different by default — pass `--seed` for reproducibility.

## Destination

Same shape as `pluck`'s positional destination:

| Argument | Result |
|---|---|
| omitted | `./favicon.png` |
| ends with `/` or points at an existing directory | `<dir>/favicon.png` |
| anything else | `<arg>` (`.png` appended if missing) |

```
mint --seed hi                # → ./favicon.png           (omitted destination)
mint ~/Desktop/               # → ~/Desktop/favicon.png   (trailing slash = parent)
mint ~/Desktop                # → ~/Desktop/favicon.png   IF ~/Desktop exists
                              # → ~/Desktop.png otherwise
mint ~/icons/logo             # → ~/icons/logo.png
mint ~/icons/logo.png         # → ~/icons/logo.png        (already has extension)
```

If the target file already exists, mint refuses to clobber it. Pass `-f` / `--force` to overwrite.

## Options

| Flag | What it does |
|---|---|
| `--seed <str>` | Reproducible seed. Same seed + same flags = same output. Default is random. |
| `--size <px>` | PNG render size, square (default `512`). |
| `--padding <pct>` | Inset the artwork, as a percentage of the canvas (default `0`). Useful when something downstream adds its own padding. |
| `--transparent` | Transparent background. mint switches to a 1–2 ink palette tuned for both dark and light surfaces. |
| `-f, --force` | Overwrite the destination if it already exists. |
| `--preview` | Also write `preview.png` (6×6 grid of fresh rolls) and `preview-small.png` (10 true-16px renders, scaled up) next to the main output. Handy for checking how the icon survives at favicon size. |
| `-h, --help` | Help. |

## How it works

Each run is a seeded pipeline:

1. **Seed → RNG.** `--seed` (or `date +%s%N$$` if unset) becomes an integer via `cksum` and is loaded into bash's `$RANDOM`. Subsequent rolls — colours, shapes, layout — all derive from that one stream, so the same seed gives the same icon byte-for-byte.

2. **Colour mode.** With a fresh background the roll picks one of `mono` (single ink, 4.5+ contrast), `duo` (two inks against one of five tuned backgrounds), or `palette` (one of 30 hand-built 3-colour combos). With `--transparent`, mint forces a smaller pool of inks that have ≥2.5 contrast against *both* white and black so the icon survives on either surface.

3. **Shape and composition.** mint picks one of 28 weighted styles. Single big shapes are weighted 4× — they read better at 16px than busy compositions. The pool covers single primitives (circle, ring, rounded square, diamond, hex, octagon, 4/5/8-pt stars, droplet, heart, lightning, chevron, capsule, plus), repetition layouts (pairs, triads, 2×2 and 3×3 grids, diagonals), and compositional styles (diagonal split, two arcs, quadrants, ring-with-dot, masked cuts, sunburst, pie slice, bars, arch, half disc).

4. **SVG → PNG.** mint emits a 100×100 viewBox SVG to a tmp file, then `rsvg-convert -w $SIZE -h $SIZE` rasterises it to your destination.

Everything that needs floating-point math goes through `awk` — bash 3.2 only has integer arithmetic. WCAG contrast ratios use the standard relative-luminance formula so the colour picker can reject low-contrast combinations.

### What's deliberately not in the pool

Religious-coded primitives are omitted: no crescents, no big crosses, no 6-point stars (would read as Star of David). The 8-point star is in. If you want one of these specifically, you're past what a random generator should be doing for you.

## Examples

```
# Reproducible — pin the seed in your project README
mint --seed acmecorp-2026

# 1024px for retina, 10% inset
mint --size 1024 --padding 10

# Transparent background — for placing on top of a coloured surface
mint --transparent ~/Desktop/

# Browse 36 fresh rolls + see how they look at true 16px
mint --preview /tmp/scratch
ls /tmp/scratch
# favicon.png  preview.png  preview-small.png
```

A workflow that often beats one-shot rolls: `mint --preview` into a scratch dir, scroll through the grid, copy the seed of the one you like (printed alongside the `ok` line), then `mint --seed <that>` into your real destination.

## Limitations

- PNG output only. SVG-on-disk used to be supported and was removed — if you need vector, look at the SVG mint generates internally and lift the relevant style function.
- macOS-first. Works on any Unix with `awk` + `rsvg-convert`, but the auto-install path assumes Homebrew.
- One square PNG per run. mint doesn't generate `.ico` bundles, multi-resolution sets, or apple-touch sizes — pipe the PNG through `sips`/`magick` if you need that.
- No alpha tuning. The transparent mode is a simple flag, not a full alpha pass — fine for flat icons, not for soft-edged artwork.
