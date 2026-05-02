import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCollection } from 'astro:content';
import { summarize } from './parse';
import { colorOf } from './colors';

// utils.ts lives at site/src/lib/ — three `..` reach the repo root.
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// Per repo convention every tool lives at `tools/<slug>/<slug>` with the
// executable having the same basename as the folder.
function toolPath(slug: string): string {
  return join(REPO_ROOT, 'tools', slug, slug);
}

function hasExecSibling(slug: string): boolean {
  const p = toolPath(slug);
  if (!existsSync(p)) return false;
  const s = statSync(p);
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
  const content = readFileSync(toolPath(slug), 'utf8');
  return {
    lines: content.split('\n').length,
    bytes: Buffer.byteLength(content, 'utf8'),
  };
}
