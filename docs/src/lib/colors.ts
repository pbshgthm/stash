// Per-util accent. Pure neutral background everywhere; the accent only
// appears on the util's banner art and section markers within its doc page.
const palette: Record<string, string> = {
  loco: '#7dd3fc',   // sky — daemons, infra, networking
  pluck: '#fcd34d',  // amber — files, fetching, warmth
};

const fallback = '#7dd3fc';

export function colorOf(slug: string): string {
  return palette[slug] ?? fallback;
}
