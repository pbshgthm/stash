import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// Per repo convention: every tool lives at `tools/<name>/<name>` with a sibling
// `README.md`. The slug is the folder name, derived via `generateId`.
const utils = defineCollection({
  loader: glob({
    pattern: 'tools/*/README.md',
    base: '../',
    generateId: ({ entry }) => entry.split('/')[1],
  }),
});

export const collections = { utils };
