import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  root: 'playground',
  test: { root: '.', include: ['tests/**/*.test.ts'] },
});
