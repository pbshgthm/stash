import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// Per repo convention: every util has a sibling `<name>.md`. We pick those up
// and skip docs that aren't tool-docs (CLAUDE.md, README.md, etc.).
const utils = defineCollection({
  loader: glob({
    pattern: ['*.md', '!CLAUDE.md', '!README.md'],
    base: '../',
  }),
});

export const collections = { utils };
