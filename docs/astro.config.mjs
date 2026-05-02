import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://pbshgthm.github.io',
  base: '/stash/',
  vite: {
    plugins: [tailwindcss()],
    server: { fs: { allow: ['..'] } },
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-default',
      wrap: false,
    },
  },
});
