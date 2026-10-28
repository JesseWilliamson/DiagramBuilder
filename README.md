# dsviz

Interactive, animated SVG diagrams for teaching computer science. You describe the picture as data;
dsviz lays it out, draws it, and animates every change.

It is built in three layers, like Radix and shadcn:

- **Headless primitives** (`dsviz`): `rect`, `circle`, `text`, `arrow`, `path`, a keyed renderer that
  tweens by id, a camera, a step player, connectors. No dependencies, no opinions about looks.
- **Family layouts** (one package each): pure functions from your state to a scene, with anchors to attach
  things to.
- **Copyable components** (`registry/`): complete example diagrams as source files you take and own.

```
state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ <Diagram> / createView / toSVG
```

What it draws: data structures (arrays, trees, hash maps, linked lists, graphs, grids), algorithms as
step-throughs, UML (sequence, class, state, use case, activity, component, deployment, object, package,
ER), architecture diagrams, git graphs, plots, probability, geometry, and OS scheduling and
memory.

## Install

```sh
npm install dsviz     # react >= 18 is a peer dependency
```

```tsx
import { combine } from 'dsviz';
import { array, pointer } from 'dsviz/ds';
import { Diagram } from 'dsviz/react';

export function Example() {
  const arr = array([3, 8, 12, 17], { tones: { 2: 'active' } });
  return <Diagram scene={combine(arr, pointer({ id: 'i', at: arr.top(2), label: 'i' }))} />;
}
```

Render a new scene and every node that kept its id slides to its new place. Colours are CSS variables
(`--dv-*`) you can override; dark mode follows the page's `color-scheme` (`.dark { color-scheme: dark }` in your app's CSS).

To copy a ready-made diagram into your app instead: `npx dsviz add binary-search`.

## Packages

One npm package; each family is a subpath export with flat functions (`import { fn } from 'dsviz/plot'`), so
what you do not import is not bundled.

| Package | Contents |
|---|---|
| `dsviz` | scene primitives, renderer, camera, player, connectors, `toSVG` |
| `dsviz/layout` | `layered` (DAG layout), `tidy` (tree layout) |
| `dsviz/ds` | `array pointer linkedList binaryTree tree graph grid stack queue hashMap` |
| `dsviz/plot` | `plane axes fn point segment vector tangent area riemann integrate label` |
| `dsviz/prob` | `bars sampleSpace diePips probTree venn2` |
| `dsviz/geom` | `polygon segment tickMarks angleMark circle pointLabel` and construction helpers |
| `dsviz/os` | `simulate gantt stackHeap memory hex` |
| `dsviz/arch` | `architecture component zone packet` |
| `dsviz/uml` | `sequence classDiagram stateMachine useCase activity component deployment er` |
| `dsviz/git` | `graph gitLanes` |
| `dsviz/react` | `Diagram usePlayer useTicker useBurst`, controls, `Transport`, `CodeTrace`, `MathText` |

A family depends on core (and layout, if it places boxes) and on nothing else.

### For coding agents

This repo holds a Claude skill (`.claude/skills/dsviz/`) that covers every family. Copy it into another
repository with `npm run sync:skill -- <repo>` from a checkout and agents there will know how to draw with
dsviz.

## This repo

- `npm run dev`: the docs and examples site (`site/`)
- `npm test`: unit tests
- `npm run typecheck`: `tsc --noEmit` over packages, site, tests and registry
- `npm run build`: build every package in `packages/` into its own `dist/`
- `npm run build:site`: static site into `site-dist/` (deployed to GitHub Pages by CI)
- `npm run registry`: regenerate `registry/index.json` after adding or changing an example
- `npm run sync:skill -- <repo>`: copy the skill into another repository

See `CLAUDE.md` for design notes.
