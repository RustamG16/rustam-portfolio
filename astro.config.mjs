// FROZEN after phase 6 (changed only by a DESIGN.md amendment approved at a gate).
import { defineConfig } from 'astro/config';

const FILE = process.env.FILE_BUILD === '1'; // npm run build:file

export default defineConfig({
  site: 'https://rustamg16.github.io',
  // dev and Pages share the same base, so there is no prefix-rewrite step. The file build uses '/'
  // and scripts/relativize.mjs turns every root-relative URL into a relative one.
  base: FILE ? '/' : '/rustam-portfolio',
  outDir: FILE ? './dist-file' : './dist',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never', assets: '_astro' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'de'],
    routing: { prefixDefaultLocale: false },
  },
  devToolbar: { enabled: false },
  vite: { build: { assetsInlineLimit: 0 } },
});
