// Library build: esbuild bundles src/index.ts and src/react/index.ts to ESM
// (tsc emits only the .d.ts files, see tsconfig.build.json). React stays external
// so the app's copy is the one that renders.
import { build } from 'esbuild';

const shared = { bundle: true, format: 'esm', sourcemap: true, target: 'es2020', splitting: true, outdir: 'dist', external: ['react', 'react-dom', 'react/jsx-runtime', '@radix-ui/*'] };
await build({ ...shared, entryPoints: { index: 'src/index.ts', 'react/index': 'src/react/index.ts' } });
console.log('built dist/');
