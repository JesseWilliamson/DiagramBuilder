# figurae

Interactive, animated SVG diagrams for teaching computer science. You describe the picture as data;
figurae lays it out, draws it, and animates every change.

It is built in three layers, like Radix and shadcn:

- **Headless primitives** (`@figurae/core`): `rect`, `circle`, `text`, `arrow`, `path`, a keyed renderer that
  tweens by id, a camera, a step player, connectors, snapping. No dependencies, no opinions about looks.
- **Family layouts** (one package each): pure functions from your state to a scene, with anchors to attach
  things to.
- **Copyable components** (`registry/`): complete example diagrams as source files you take and own.

```
state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ <Diagram> / createView / toSVG
```

What it draws: data structures (arrays, trees, hash maps, linked lists, graphs, grids), algorithms as
step-throughs, UML (sequence, class, state, use case, activity, component, deployment, object, package,
communication, ER), architecture diagrams, git graphs, plots, probability, geometry, and OS scheduling and
memory.

## Install

```sh
npm install @figurae/core @figurae/react @figurae/ds     # react >= 18 is a peer dependency
```

```tsx
import { combine } from '@figurae/core';
import { array, pointer } from '@figurae/ds';
import { Diagram } from '@figurae/react';

export function Example() {
  const arr = array([3, 8, 12, 17], { tones: { 2: 'active' } });
  return <Diagram scene={combine(arr, pointer({ id: 'i', at: arr.top(2), label: 'i' }))} />;
}
```

Render a new scene and every node that kept its id slides to its new place. Colours are CSS variables
(`--dv-*`) you can override; dark mode follows `.dark` or `[data-theme="dark"]`.

To copy a ready-made diagram into your app instead: `npx @figurae/cli add binary-search`.

## Packages

All versioned together; each exports its functions flat (`import { fn } from '@figurae/plot'`).

| Package | Contents |
|---|---|
| `@figurae/core` | scene primitives, renderer, camera, player, connectors, snapping, `toSVG` |
| `@figurae/layout` | `layered` (DAG layout), `tidy` (tree layout) |
| `@figurae/ds` | `array pointer linkedList binaryTree tree graph grid stack queue hashMap` |
| `@figurae/plot` | `plane axes fn point segment vector tangent area riemann integrate label` |
| `@figurae/prob` | `bars sampleSpace diePips probTree venn2` |
| `@figurae/geom` | `polygon segment tickMarks angleMark circle pointLabel` and construction helpers |
| `@figurae/os` | `simulate gantt stackHeap memory hex` |
| `@figurae/arch` | `architecture component zone packet` |
| `@figurae/uml` | `sequence communication classDiagram objectDiagram stateMachine useCase activity component deployment packageDiagram er` |
| `@figurae/git` | `graph gitLanes` |
| `@figurae/react` | `Diagram usePlayer useTicker useBurst useSnap`, controls, `Transport`, `CodeTrace`, `MathText` |

A family depends on core (and layout, if it places boxes) and on nothing else.

### For coding agents

This repo holds a Claude skill (`.claude/skills/figurae/`) that covers every package. Copy it into another
repository with `npm run sync:skill -- <repo>` from a checkout and agents there will know how to draw with
figurae.

## This repo

- `npm run dev`: the docs and examples site (`site/`)
- `npm test`: unit tests
- `npm run typecheck`: `tsc --noEmit` over packages, site, tests and registry
- `npm run build`: build every package in `packages/` into its own `dist/`
- `npm run build:site`: static site into `site-dist/` (deployed to GitHub Pages by CI)
- `npm run registry`: regenerate `registry/index.json` after adding or changing an example
- `npm run sync:skill -- <repo>`: copy the skill into another repository

See `CLAUDE.md` for design notes.
