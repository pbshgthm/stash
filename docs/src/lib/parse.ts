// Pull the figlet banner and tagline out of a util's markdown body.
// Convention (per CLAUDE.md): the file opens with `# name`, then a fenced
// code block holding the banner, then a paragraph beginning with `**...**`.

export type UtilSummary = {
  banner: string;
  tagline: string;
};

const BANNER_RE = /```[^\n]*\n([\s\S]*?)\n```/;
const TAGLINE_RE = /\*\*([^*]+?)\*\*/;

export function summarize(body: string): UtilSummary {
  const banner = body.match(BANNER_RE)?.[1]?.trimEnd() ?? '';
  const after = body.replace(BANNER_RE, '');
  const tagline = after.match(TAGLINE_RE)?.[1]?.trim() ?? '';
  return { banner, tagline };
}
