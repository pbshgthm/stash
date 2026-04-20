# pluck

```
        ______            ______
___________  /___  __________  /__
___  __ \_  /_  / / /  ___/_  //_/
__  /_/ /  / / /_/ // /__ _  ,<
_  .___//_/  \__,_/ \___/ /_/|_|
/_/
```

**Download a file, folder, or whole repo from a Git host URL — without the `.git` directory.**

Paste a GitHub URL. Get the contents. `git clone` drags `.git` along, the GitHub CLI needs auth even for public repos, and copy-pasting `raw.githubusercontent.com` links by hand is a chore. `pluck` parses the URL you already have and does the right thing.

## Install

Single bash script, no runtime deps beyond `curl`, `tar`, and (for `--sparse`) `git`.

```
ln -s /path/to/pluck ~/.local/bin/pluck
chmod +x /path/to/pluck
```

Make sure `~/.local/bin` is on your `PATH`.

## Usage

```
pluck <url> [destination] [options]
```

## URL forms

All of these work (GitHub):

| URL | What you get |
|---|---|
| `https://github.com/OWNER/REPO` | whole repo at default branch |
| `https://github.com/OWNER/REPO/tree/REF` | whole repo at `REF` |
| `https://github.com/OWNER/REPO/tree/REF/PATH` | folder `PATH` at `REF` |
| `https://github.com/OWNER/REPO/blob/REF/PATH` | single file |
| `https://github.com/OWNER/REPO/raw/REF/PATH` | single file |
| `https://raw.githubusercontent.com/OWNER/REPO/REF/PATH` | single file |
| `OWNER/REPO` | shorthand for the whole repo at default branch |

`REF` is any branch name, tag, or commit SHA.

If you omit the ref (shorthand or bare `/OWNER/REPO` URL), pluck queries the GitHub API for the repo's default branch. Falls back to `HEAD` if the API call fails.

## Destination

The second positional argument decides where the output lands. `--out` / `-o` is the equivalent flag; you can't use both.

- **Omitted.** Drops into the current directory using the default name:
  - Repo download → `./<repo>`
  - Folder or file download → `./<basename of path>`

- **Ends with `/` or points at an existing directory.** Treated as a parent; the default name is appended. Mirrors `git clone` semantics.

- **Anything else.** Treated as the full output path (directory or file).

```
pluck vercel/ai                      # → ./ai
pluck vercel/ai ai-sdk               # → ./ai-sdk
pluck vercel/ai ~/Downloads/         # → ~/Downloads/ai   (trailing slash = parent)
pluck vercel/ai ~/Downloads          # → ~/Downloads/ai   IF ~/Downloads exists
                                     # → file named Downloads otherwise
```

## Options

| Flag | What it does |
|---|---|
| `-o, --out <path>` | Same as the positional destination. Flag form. |
| `-r, --ref <ref>` | Override the branch/tag/commit. Useful for refs with slashes (see below). |
| `-t, --tree` | Show the full extracted tree after download. Default is a compact preview for trees larger than 20 entries. |
| `-f, --force` | Overwrite the destination if it already exists. |
| `--sparse` | Use a partial clone + sparse-checkout instead of the default tarball. Best for huge repos where you only want a small subpath. |
| `--keep-git` | Keep the `.git` directory. Only valid with `--sparse`. |
| `-h, --help` | Help. |

### When the destination already exists

pluck mirrors `git clone`: if the target path already exists (a file, or a non-empty directory), it refuses to continue. Pass `-f` / `--force` to remove it first and proceed. Empty directories are accepted as-is — the download fills them in.

### When to use `--ref`

URLs like `github.com/foo/bar/tree/feat/baz/qux` are ambiguous. Is the ref `feat` and the path `baz/qux`, or is the ref `feat/baz` and the path `qux`? The URL alone doesn't say. pluck defaults to splitting on the first slash — if that's wrong, name the ref explicitly:

```
pluck https://github.com/foo/bar/tree/feat/baz/qux --ref feat/baz
```

## How it works

Two download paths:

1. **Default: streaming tarball.** Fetches `https://codeload.github.com/OWNER/REPO/tar.gz/REF` and pipes it directly into `tar -xz` — no intermediate file. Simple, usually fastest, and works with any ref GitHub recognizes. Downloads the whole repo though, which is why `--sparse` exists.

2. **`--sparse`: partial clone + sparse-checkout.** For large repos where you only need a subfolder. Uses `git clone --filter=blob:none --no-checkout` so blob content is fetched lazily, then narrows the working tree to your subpath via `git sparse-checkout set --no-cone`. Requires `git`. Commit SHAs (7–40 hex chars) are detected and use `git checkout <sha>`; anything else is treated as a branch with `--branch`.

After either path, pluck copies the contents to the destination and (for tree/repo downloads) strips `.git` unless `--keep-git` is set.

Single-file downloads (`blob`, `raw`, `raw.githubusercontent.com`) always go through a single `curl` hit to `raw.githubusercontent.com` — no tarball, no clone.

## Examples

```
# Whole repo into ./next.js
pluck https://github.com/vercel/next.js

# A single file
pluck https://github.com/vercel/next.js/blob/canary/README.md

# One folder out of a large repo
pluck https://github.com/torvalds/linux/tree/master/kernel/sched --sparse

# Shorthand into a specific directory
pluck vercel/ai ~/code/

# Named output
pluck vercel/ai my-vendored-ai-sdk
```

## Limitations

- GitHub only. GitLab, Bitbucket, Gitea, etc. aren't supported — different URL shapes and different tarball endpoints.
- No auth. Public repos only. (Private repos would need a token; out of scope for a small bash tool.)
- Without `--sparse`, the full repo is downloaded even if you only want one folder. For small repos this is usually faster than cloning; for multi-GB repos it isn't.
- The default-branch lookup is a plain HTTPS request to the GitHub API and is subject to unauthenticated rate limits (60/hour/IP). If you're hitting the limit, spell the ref out in the URL.
