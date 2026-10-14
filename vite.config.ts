import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  root: 'playground',
  base: './', // relative asset URLs so it works under /<repo>/ on GitHub Pages
  build: { outDir: '../playground-dist', emptyOutDir: true },
  test: { root: '.', include: ['tests/**/*.test.ts'] },
});
