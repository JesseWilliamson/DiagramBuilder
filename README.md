# dsviz

A TypeScript library for interactive, animated SVG diagrams for teaching: data structures and algorithms,
plots, probability, geometry, CPU scheduling and memory. You describe the picture as data; dsviz draws it
and animates every change. Framework-free core, thin React layer.

```
state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ <Diagram> / createView / toSVG
```

## Use it in a project

```sh
npm install github:JesseWilliamson/DiagramBuilder   # the prepare script builds dist/
```

```tsx
import { array, combine, pointer } from 'dsviz';
import { Diagram } from 'dsviz/react';

const arr = array([3, 8, 12, 17], { tones: { 2: 'active' } });
<Diagram scene={combine(arr, pointer({ id: 'i', at: arr.top(2), label: 'i' }))} />
```

Families: data structures at the top level (`array`, `pointer`, `linkedList`, `binaryTree`, `graph`, `grid`,
`stack`, `queue`) and the namespaces `plot`, `prob`, `geom`, `sched`, `mem`. Colours are CSS variables
(`--dv-*`) you can override; dark mode via `[data-theme="dark"]`.

## This repo

- `npm run dev` — the docs and examples site (`site/`)
- `npm test` — unit tests
- `npm run build` — library build into `dist/`
- `npm run build:site` — static site into `site-dist/` (deployed to GitHub Pages by CI)

See `CLAUDE.md` for design notes.
