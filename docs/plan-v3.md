# Plan v3: strip, split, and grow the UML family

Owner's brief (Oct 2026): remove the d3 experiment and anything that isn't core; make the library
elegant and minimal; split it into clearly separated modules (separate packages); structure it like
Radix + shadcn (headless primitives, composed layouts on top, copyable diagram components);
add snapping to draggable UML boxes and support the other UML diagram kinds; pick a name more
generic than the old name. Model: Brilliant's internal diagram tool and Diagramatics, focused on CS
first, maths and sciences later.

## Name

The old name says "data structures". **dsviz**, scoped `@dsviz/*`. Alternatives that are also free on npm:
`diagrammar` (diagram + grammar: compose a picture from a small grammar of parts), `slatejs`,
`chalkviz`, `sketchline`, `inkscribe`. The name is a one-line sed across the repo, so it is easy to
change later.

## 1. Remove (done by hand in this session)

- `site/d3/`, `site/D3Examples.tsx`, `tests/d3cells.test.ts`, the `d3` and `@types/d3` dev deps,
  the "Examples (d3)" nav link, the d3 notes in CLAUDE.md.
- Demos: `CodeBlock` (code inside the picture; `CodeTrace` beside the picture stays), `GuessNumber`,
  `Spec`, `Morph`.
- The `code/` family (`code.block`): the only thing that used it was the CodeBlock demo.
- The JSON spec (`DiagramSpec`, validateSpec, fromSpec, describeSpec) is deleted; GitGoose moves to Mermaid.

## 2. Monorepo: one package per family (npm workspaces, lockstep versions)

```
packages/
  core/     scene primitives (rect circle text arrow path combine translate namespace bounds),
            vec, path maths, easing, themes/styles, render (createView), camera, describe,
            static (toSVG), player, handle, fx, connector, mathtext, snap   ← the "Radix" layer
  layout/   layered (Sugiyama-lite), tidy (Reingold–Tilford): pure maths, no DOM
  ds/       array pointer hashMap linkedList binaryTree tree graph grid stack queue
  plot/     plane axes fn point segment vector tangent area riemann integrate label
  prob/     bars sampleSpace diePips probTree venn2
  geom/     polygon segment tickMarks angleMark circle pointLabel + helpers
  os/       sched (simulate, gantt) + mem (stackHeap, memory, hex)      (was sched/ + mem/)
  arch/     architecture, zones, links, packet, along                   (was sys/)
  uml/      class sequence state + useCase activity component deployment object package
            communication er, snapping guides
  git/      graph, gitLanes
  react/    Diagram, usePlayer, useTicker, useBurst, controls, Transport, CodeTrace, MathText
```

Rules: a family depends on `core` (and `layout` where it needs a layout) and on nothing else.
`react` depends on `core` only. `tsconfig` paths and the Vite alias
map `@dsviz/<pkg>` → `packages/<pkg>/src/index.ts`, so the site and tests import exactly what an
app would. `build.mjs` builds every package into its own `dist/` (one ES module per file, as now).
`publish.yml` publishes all workspaces. Tests stay in `tests/`, one file per package.

## 3. Radix + shadcn structure

- **Primitives (Radix):** `@dsviz/core` is headless. Parts carry `role`s; the stylesheet decides
  looks. No family is needed to draw anything.
- **Composed layouts:** each family is a set of pure functions `state → Scene`.
- **Copyable components (shadcn):** `registry/` holds complete diagram components (BinarySearch,
  Riemann, Sequence, …) as source files an app copies and owns: `npx dsviz add binary-search`.
  The examples page renders the registry, so every example is a component you can take.
  `registry/index.json` lists name, title, family, files, and the packages it imports.

## 4. UML

- **Snapping (core `snap.ts`):** `snapFrame(moving, others, { grid, threshold })` returns the
  snapped centre and the guides that fired (edge/centre alignment with other frames, grid lines).
  Layouts with `draggable: true` accept `guides` to draw (`role: 'snap-guide'`, dashed, faint).
  React: `useSnap()` pairs `onDrag` with the current frames. Demos: ClassDiagram, Component,
  Deployment, Object, Package, StateMachine, UseCase all snap.
- **New diagrams in `@dsviz/uml`:** use case (actors, ovals, system boundary, include/extend),
  activity (rounded actions, decisions/merges, fork/join bars, start/end, swimlanes), component
  (components with lollipop/socket interfaces, ports), deployment (3D nodes, artifacts), object
  (instances `name : Class` underlined, slots, links), package (tab boxes, nesting,
  import/merge/access), communication (numbered messages on links), ER (entities, crow's-foot
  cardinality). All: ids, tones, interactive/draggable, layered layout when x/y are absent, tests
  for the maths, one example each, skill docs.

## 5. Site, docs, skill

- Nav: Examples, Guide, API, GitHub. Examples grouped by package. Each example is a registry
  component with its source beside it (as now).
- `.claude/skills/dsviz/` replaces the old skill folder; `references/api.md` is regenerated
  from the package exports; `spec.md` is gone.
- CLAUDE.md rewritten for the new layout.

## Order

1. Removals (this session, by hand).                          → commit
2. Monorepo restructure + rename, nothing else (one agent).   → commit; typecheck, tests, build:site green
3. In parallel: snapping; UML batch A (useCase, activity, component); UML batch B (deployment,
   object, package); UML batch C (communication, er); registry + CLI; skill/docs.    → commit
4. Review, CLAUDE.md, final commit.
