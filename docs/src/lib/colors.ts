// Per-util accent. Pure neutral background everywhere; the accent only appears
// on the util's banner art and section markers. Each hue mirrors the tool's
// terminal banner accent (see AGENTS.md → Banner accent) so a tool reads as the
// same color in the CLI and on the web.
const palette: Record<string, string> = {
  loco: '#7dd3fc',   // sky    · 256:117, daemons, infra, networking
  pluck: '#fcd34d',  // amber  · 256:221, files, fetching, warmth
  mint: '#6ee7b7',   // mint   · 256:79, fresh, generated
  decal: '#fda4af',  // rose   · 256:217, stickers, app icons
  therm: '#fdba74',  // orange · 256:215, heat, power
  wakey: '#c4b5fd',  // violet · 256:183, awake, late-night
};

const fallback = '#7dd3fc';

export function colorOf(slug: string): string {
  return palette[slug] ?? fallback;
}
