import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: 'site',
  base: './', // relative asset URLs so it works under /<repo>/ on GitHub Pages
  // demos import 'dsviz' exactly like an app would; point that at the source
  resolve: { alias: [{ find: /^dsviz\/react$/, replacement: src('./src/react/index.ts') }, { find: /^dsviz$/, replacement: src('./src/index.ts') }] },
  build: { outDir: '../site-dist', emptyOutDir: true, chunkSizeWarningLimit: 2000 },
  test: { root: '.', include: ['tests/**/*.test.ts'] },
});
