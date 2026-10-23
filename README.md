# figurae

A TypeScript library for interactive, animated SVG diagrams for teaching: data structures and algorithms,
plots, probability, geometry, CPU scheduling and memory. You describe the picture as data; figurae draws it
and animates every change. Framework-free core, thin React layer.

```
state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ <Diagram> / createView / toSVG
```

## Use it in a project

```sh
npm install @figurae/core @figurae/ds @figurae/react
```

```tsx
import { combine } from '@figurae/core';
import { array, pointer } from '@figurae/ds';
import { Diagram } from '@figurae/react';

const arr = array([3, 8, 12, 17], { tones: { 2: 'active' } });
<Diagram scene={combine(arr, pointer({ id: 'i', at: arr.top(2), label: 'i' }))} />
```

One package per family, each exporting its layouts flat: `@figurae/core` (scene, renderer, player),
`@figurae/ds` (`array`, `pointer`, `linkedList`, `binaryTree`, `tree`, `graph`, `grid`, `stack`, `queue`, `hashMap`),
`@figurae/uml`, `@figurae/arch`, `@figurae/git`, `@figurae/layout`, `@figurae/plot`, `@figurae/prob`,
`@figurae/geom`, `@figurae/os`, `@figurae/spec`, `@figurae/react`. Colours are CSS variables (`--dv-*`) you can override; dark mode via `.dark` or
`[data-theme="dark"]`.

### Diagrams as JSON

```ts
import { validateSpec, fromSpec, describeSpec } from '@figurae/spec';

const r = validateSpec(JSON.parse(text));     // { ok, errors: [{ path: 'messages[3].to', message: 'unknown participant "dbb"…' }] }
if (r.ok) <Diagram scene={fromSpec(r.spec)} label={describeSpec(r.spec)} />
```

Types: `sequence`, `class`, `state`, `architecture`, `graph`, `git`, `array`, `table`, `code`. Nodes
without coordinates are laid out for you (layered DAG layout, tidy trees).

### For coding agents

This repo holds a Claude skill (`.claude/skills/figurae/`). Copy it into another repository with
`npm run sync:skill -- <repo>` from a checkout and agents there will know how to draw with figurae.

## This repo

- `npm run dev` — the docs and examples site (`site/`)
- `npm test` — unit tests
- `npm run build` — build every package in `packages/` into its own `dist/`
- `npm run build:site` — static site into `site-dist/` (deployed to GitHub Pages by CI)
- `npm run sync:skill -- <repo>` — copy the skill into another repository

See `CLAUDE.md` for design notes.
