// Hand-written card copy for each tool. Kept here (not scraped from each README's
// first line) so the whole set shares one voice: a lowercase, verb-first tagline
// with no trailing period, and a one-or-two-sentence blurb in the same register.
// Proper nouns keep their case (macOS, GitHub, Caddy, Apple Silicon, Amphetamine).
// A new tool should add an entry here; without one it falls back to the README.
export type Desc = { tagline: string; blurb: string };

const descriptions: Record<string, Desc> = {
  loco: {
    tagline: "give your projects a local domain",
    blurb:
      "maps http://name.localhost to your dev server's port through a Caddy reverse proxy, so you stop juggling port numbers. it runs as a launchd daemon, so your domains keep working after a reboot.",
  },
  pluck: {
    tagline: "download files or repos from GitHub",
    blurb:
      "paste a GitHub URL and get just the file, folder, or whole repo, without the .git directory or a full clone. no auth needed for public repos.",
  },
  mint: {
    tagline: "generate a random favicon",
    blurb:
      "rolls a small SVG from a curated palette and shape pool, then writes a square PNG. seedable, no AI, just one bash script.",
  },
  decal: {
    tagline: "keep custom app icons through updates",
    blurb:
      "stores your custom macOS app icons in one folder and re-applies them whenever an app update wipes them. no daemon and no registry, the folder is the config.",
  },
  therm: {
    tagline: "read power and heat on Apple Silicon",
    blurb:
      "answers why your Mac is hot in a sentence: which app is responsible, and whether it is the CPU or the GPU, measured by sustained power rather than raw CPU percentages.",
  },
  wakey: {
    tagline: "keep your Mac awake from the terminal",
    blurb:
      "a command-line front end for Amphetamine, so you can start and stop keep-awake sessions without leaving the terminal.",
  },
};

export function describe(slug: string, fallback?: Desc): Desc {
  return descriptions[slug] ?? fallback ?? { tagline: "", blurb: "" };
}
