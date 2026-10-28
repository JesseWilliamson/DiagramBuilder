import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: 'site',
  base: './', // relative asset URLs so it works under /<repo>/ on GitHub Pages
  // demos import 'dsviz' and 'dsviz/<family>' exactly like an app would; point those at the source
  resolve: {
    alias: [
      { find: /^dsviz$/, replacement: src('./src/core/index.ts') },
      { find: /^dsviz\/(.*)$/, replacement: src('./src/$1/index.ts') },
    ],
  },
  build: { outDir: '../site-dist', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
  test: { root: '.', include: ['tests/**/*.test.ts'] },
});
