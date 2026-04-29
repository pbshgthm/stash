import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCollection } from 'astro:content';
import { summarize } from './parse';
import { colorOf } from './colors';

// utils.ts lives at site/src/lib/ — three `..` reach the repo root.
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// Per repo convention every util has a sibling executable file with the same
// basename. We use that as the source of truth — only `.md` files that have a
// matching executable next to them are real utils.
function hasExecSibling(slug: string): boolean {
  const sibling = join(REPO_ROOT, slug);
  if (!existsSync(sibling)) return false;
  const s = statSync(sibling);
  return s.isFile() && (s.mode & 0o111) !== 0;
}

export type UtilCard = {
  slug: string;
  banner: string;
  tagline: string;
  color: string;
};

export async function getUtils(): Promise<UtilCard[]> {
  const entries = await getCollection('utils');
  return entries
    .filter((e) => hasExecSibling(e.id))
    .map((e) => ({
      slug: e.id,
      color: colorOf(e.id),
      ...summarize(e.body ?? ''),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getUtilEntries() {
  const entries = await getCollection('utils');
  return entries.filter((e) => hasExecSibling(e.id));
}

export function getUtilStats(slug: string): { lines: number; bytes: number } {
  const p = join(REPO_ROOT, slug);
  const content = readFileSync(p, 'utf8');
  return {
    lines: content.split('\n').length,
    bytes: Buffer.byteLength(content, 'utf8'),
  };
}
