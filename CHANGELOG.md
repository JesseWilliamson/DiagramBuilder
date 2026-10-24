# Changelog

## Unreleased

### Added

- **`@dsviz/git` draws the layouts other clients use**, so they can be compared on one history:
  `lanes: 'straight' | 'compact'` (slots reserved and reused, or inserted and removed so neighbours
  shift), `pin: [tip, ...]` (the leftmost columns held for those branches, GitGoose's trunk column
  generalised), `fold: [merge, ...]` (a merged branch hidden behind a hollow merge dot), `maxLanes`
  (lanes past the cap cut and marked with git's `~`) and `bend: 'curve' | 'corner' | 'angle'`.
  `orderCommits(commits, 'author-date' | 'commit-date' | 'topo')` orders rows the three ways tools do.
  Commits take `date`, `authorDate` and `kind: 'wip' | 'stash'` (dashed, as GitGoose draws them).
  New example: *Ways to draw a commit graph*.

### Changed

- `gitLanes` edges now carry `via` (the column in every row between child and parent) and `color`;
  placements carry `color`. A line keeps the colour of the column it opened in, so it does not change
  colour when compact lanes shift it. Commit dots carry `data: { hash }` and ref pills `data: { ref }`.

## 3.0.0

The project is renamed **dsviz** (formerly dsviz) and split into an npm-workspaces monorepo of
`@dsviz/*` packages, versioned together. Existing 2.x code needs its imports rewritten; the pictures
it draws are unchanged.

### Breaking

- **Package split.** One package per family: `@dsviz/core` (scene, renderer, camera, player,
  connectors), `layout` (`layered`, `tidy`), `ds`, `plot`, `prob`, `geom`, `os`, `arch`, `uml`,
  `git`, `react`. A family depends on core (and layout) only. `npm install @dsviz/core @dsviz/react
  @dsviz/ds` and add what you draw.
- **No namespaces.** `plot.fn` is `import { fn } from '@dsviz/plot'`; `sched` and `mem` are together
  `@dsviz/os`; `sys` is `@dsviz/arch`; `git.graph` is `graph` from `@dsviz/git` (alias it next to
  the ds `graph`). Names that two packages share: `graph`, `component`, `segment`, `circle`.
- **The JSON spec is gone**: `DiagramSpec`, `validateSpec`, `fromSpec`, `describeSpec`,
  `formatSpecErrors`. Call the layout functions directly and pass `label` to `<Diagram>` for alt text.
- **`code.block` is gone** (code inside the picture). `CodeTrace` beside the picture stays.
- The npm package no longer ships the Claude skill; `npm run sync:skill -- <repo>` copies it from a
  checkout. The skill is rewritten for 3.0 and has no spec reference.
- The d3 experiment (`site/d3`, `#/examples-d3`) is removed, and with it the `d3` dev dependencies.

### Added

  The class, object, package, component, deployment, state and use case examples all use it.
- **Eight more UML diagrams** in `@dsviz/uml`, all with stable ids, tones, `interactive` / `draggable`,
  the layered layout when x/y are absent, and an example each:
  - `useCase`: actors, ovals, system boundary; association, include, extend, generalization.
  - `activity`: actions, decisions and merges, fork and join bars, start / end / flow final, guards,
    swimlanes; `current` and `taken` highlight a walk.
  - `component`: provided (lollipop) and required (socket) interfaces, ports, nesting;
    assembly, dependency, delegate connections.
  - `deployment`: nodes with top and right faces, nesting, artifacts, communication and deploy links.
  - `er`: entity-relationship diagrams in crow's-foot or Chen notation; keys, nullable attributes, weak
    entities.
  - `stickFigure` (the actor) is exported for hand-built scenes.
- **Registry and CLI.** `registry/` holds every example as a standalone component with
  `registry/index.json` (name, title, description, group, file, packages it imports); the examples page shows
  each with its source. `npx @dsviz/cli add <name>` copies one into an app, shadcn style. `npm run registry`
  regenerates the index.
- **Claude skill** rewritten for the package split, the new UML diagrams, with recipes for
  a step-through activity diagram
  plus sequence from one message list.

### Changed

- The guide, API page and README describe the packages and imports above; `references/api.md` in the
  skill lists every export per package.

## 2.2.0

Everything is additive: existing calls draw what they drew before, with the exceptions listed under
"Changed".

### Added

- **Diagrams as JSON.** `DiagramSpec` (`sequence`, `class`, `state`, `architecture`, `graph`, `git`,
  `array`, `table`, `code`), `validateSpec(x)` → `{ ok, errors: { path, message }[], spec }` with
  path-precise messages and "did you mean" hints, `fromSpec(spec, { id })`, `describeSpec(spec)` (alt
  text), `formatSpecErrors`.
- **`layout.layered`**: a Sugiyama-style DAG layout (cycle breaking, longest-path layers, barycentre
  ordering, exact placement by pool-adjacent-violators). `graph(…, { layout: 'layered' })`;
  `sys.architecture`, `uml.classDiagram` and `uml.stateMachine` place nodes without x/y with it.
- **`layout.tidy`** (Reingold–Tilford) and **`tree()`** for n-ary trees; `binaryTree({ layout: 'tidy' })`.
- **`graph`**: `shape: 'rect'` (sized to the label), node `kind` → `role: 'node-<kind>'`, with styles for
  `changed`, `upstream`, `downstream` and `test`. `graphNodeSize()`.
- **`git.graph(commits, refs, opts)`**: commit graphs with first-parent lanes, curved edges, ref pills
  and `highlight`; `git.gitLanes()` for the lanes alone.
- **`uml.sequence`**: `notes` (own row, over one or several lifelines), `alt` `sections` with
  else-dividers, per-message `tone`, `activations: false`, `highlight: false`. `activations()` takes the
  fragments, so each alt branch starts from the call stack the alt began with.
- **`code.block(source, { highlight, numbers, start })`**: numbered, highlighted code inside a scene.
- **Renderer**: text crossfade when a label's words change (`crossfade: false` to turn off);
  `<Diagram injectStyles crossfade>`; `toSVG(scene, { theme: 'light' | 'dark', background })`;
  `THEME_VARS`.
- **Claude skill** in `.claude/skills/dsviz/`, and `npm run sync:skill -- <repo>` to copy it into another repository.

### Changed

- `x`/`y` are optional on `sys.Component`, `uml.UmlClass` and `uml.UmlState` (unplaced ones are laid
  out). Code that reads `.x` back from these input types now sees `number | undefined`.
- A bent state transition's label sits beside the curve, on the outside of the bend, instead of on it.
- Muted connectors (UML relations, architecture links) now draw in the faint colour.
- `toSVG` wraps its embedded stylesheet in CDATA, and the stylesheet no longer contains `<` (it broke
  inside an `<svg>`).
- Controls inject their stylesheet once per mount (an insertion effect) instead of on every render.
