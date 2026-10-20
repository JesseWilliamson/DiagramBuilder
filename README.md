# dsviz

A TypeScript library for interactive, animated SVG diagrams for teaching: data structures and algorithms,
plots, probability, geometry, CPU scheduling and memory. You describe the picture as data; dsviz draws it
and animates every change. Framework-free core, thin React layer.

```
state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ <Diagram> / createView / toSVG
```

## Use it in a project

```sh
npm install dsviz
```

```tsx
import { array, combine, pointer } from 'dsviz';
import { Diagram } from 'dsviz/react';

const arr = array([3, 8, 12, 17], { tones: { 2: 'active' } });
<Diagram scene={combine(arr, pointer({ id: 'i', at: arr.top(2), label: 'i' }))} />
```

Families: data structures at the top level (`array`, `pointer`, `linkedList`, `binaryTree`, `tree`, `graph`,
`grid`, `stack`, `queue`, `hashMap`) and the namespaces `uml`, `sys`, `git`, `code`, `layout`, `plot`, `prob`,
`geom`, `sched`, `mem`. Colours are CSS variables (`--dv-*`) you can override; dark mode via `.dark` or
`[data-theme="dark"]`.

### Diagrams as JSON

```ts
import { validateSpec, fromSpec, describeSpec } from 'dsviz';

const r = validateSpec(JSON.parse(text));     // { ok, errors: [{ path: 'messages[3].to', message: 'unknown participant "dbb"…' }] }
if (r.ok) <Diagram scene={fromSpec(r.spec)} label={describeSpec(r.spec)} />
```

Types: `sequence`, `class`, `state`, `architecture`, `graph`, `git`, `array`, `table`, `code`. Nodes
without coordinates are laid out for you (layered DAG layout, tidy trees).

### For coding agents

The package ships a Claude skill (`.claude/skills/dsviz/`). Copy it into your repository with
`npx dsviz-sync-skill .` and agents there will know how to draw with dsviz.

## This repo

- `npm run dev` — the docs and examples site (`site/`)
- `npm test` — unit tests
- `npm run build` — library build into `dist/`
- `npm run build:site` — static site into `site-dist/` (deployed to GitHub Pages by CI)
- `npm run sync:skill -- <repo>` — copy the skill into another repository

See `CLAUDE.md` for design notes.
