// Pull the figlet banner, a one-line tagline, and a fuller blurb out of a util's
// markdown body. Convention (see AGENTS.md): the file opens with `# name`, then a
// fenced code block holding the banner, then the intro prose.

export type UtilSummary = {
  banner: string;
  tagline: string;
  blurb: string;
};

const BANNER_RE = /```[^\n]*\n([\s\S]*?)\n```/;

// Flatten inline markdown to plain prose: links → their text, drop emphasis/code.
function clean(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s*\u2014\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cut to a length at a word boundary so URLs/paths never split mid-token.
function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

export function summarize(body: string): UtilSummary {
  const banner = body.match(BANNER_RE)?.[1]?.trimEnd() ?? '';

  const after = body.replace(BANNER_RE, '');
  const paras = after
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(
      (p) => p && !p.startsWith('#') && !p.startsWith('```') && !p.startsWith('|'),
    );

  const p0 = paras[0] ?? '';
  const cleanedP0 = clean(p0);

  // Tagline: the bold lede when present, else the first paragraph's first sentence.
  const bold = p0.match(/\*\*([^*]+?)\*\*/);
  const tagline = bold
    ? clean(bold[1])
    : (cleanedP0.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? cleanedP0);

  // Blurb: a fuller "what it does" for the expanded row. When the first paragraph
  // is just the tagline, reach for the next one (the why/how); else use it whole.
  const taglineCoversP0 = cleanedP0.length - tagline.length < 8;
  const blurb = truncate(
    taglineCoversP0 && paras[1] ? clean(paras[1]) : cleanedP0,
    210,
  );

  return { banner, tagline, blurb };
}
