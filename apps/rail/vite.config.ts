// The rail course: its own Vite root, sharing the repo's node_modules and dsviz source.
// It imports 'dsviz' and 'dsviz/<family>' exactly as an app would, so once dsviz 3.1 is
// on npm this folder can move to its own repo by deleting the alias and adding the dependency.
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const repo = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  resolve: {
    alias: [
      { find: /^dsviz$/, replacement: repo('src/core/index.ts') },
      { find: /^dsviz\/(.*)$/, replacement: repo('src/$1/index.ts') },
    ],
  },
  server: { port: 5174 },
  build: { outDir: 'dist', emptyOutDir: true },
});
