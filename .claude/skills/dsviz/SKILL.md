---
name: dsviz
description: Draw diagrams with the dsviz library (npm packages `@dsviz/*`), as SVG in a React app, in plain DOM, or as a standalone SVG string. Use this whenever a task asks for a diagram, figure or visual explanation in a project that depends on dsviz: UML (sequence, class, state machine, use case, activity, component, deployment), entity-relationship diagrams, architecture/system diagrams, dependency or call graphs (DAGs), git commit graphs, data-structure figures (arrays, trees, hash maps, linked lists, grids, stacks, queues), plots (functions, tangents, Riemann sums), probability (bars, trees, Venn), geometry, OS scheduling (Gantt) and memory, step-through algorithm animations. Also use it to export a diagram with toSVG.
---

# dsviz

dsviz turns data into an SVG **scene**: a flat list of plain nodes (`rect`, `circle`, `text`, `arrow`,
`path`), each with a stable `id`. A renderer draws the scene and, when you render a new one, tweens every
node that kept its id. Layout functions build scenes from your data. `@dsviz/core` has no runtime
dependencies; `@dsviz/react` is a thin wrapper.

```
your data ──layout()──▶ Scene { nodes } ──▶ <Diagram scene> │ createView(svg).render(scene) │ toSVG(scene)
```

Three layers, like Radix and shadcn: **core** is headless (primitives, renderer, camera, player;
parts carry `role`s and the stylesheet decides looks); **family packages** are pure `state → Scene`
functions; a **registry** of copyable example components (`npx @dsviz/cli add <name>`) shows them put to use.

## Step 1: pick how to draw

1. **A layout function** for anything real: `sequence`, `classDiagram`, `architecture`, `graph`, `array`,
   `fn`… Each lives in the package for its family. Read `references/api.md` for signatures and
   `references/recipes.md` for worked examples.
2. **A hand-built scene** for a one-off figure: `combine(rect({...}), text({...}), connector({...}))`.
   Combine with layouts freely: everything is a `Part` (a scene, a node, a nested list, or falsy).

## Step 2: write the code

One package per family, each exporting its functions flat (no namespaces: `fn`, not `plot.fn`):

|---|---|
| `@dsviz/core` | `rect circle text arrow path`, `combine translate namespace`, `connector`, `createView`, `toSVG`, `fitViewBox`, `createPlayer`, `handle`, `burst` |
| `@dsviz/layout` | `layered` (DAG), `tidy` (trees): positions only, no drawing |
| `@dsviz/ds` | `array pointer linkedList binaryTree tree graph grid stack queue hashMap` |
| `@dsviz/plot` | `plane axes fn point segment vector tangent area riemann integrate label` |
| `@dsviz/prob` | `bars sampleSpace diePips probTree venn2` |
| `@dsviz/geom` | `polygon segment tickMarks angleMark circle pointLabel` + construction helpers |
| `@dsviz/os` | `simulate gantt stackHeap memory hex` |
| `@dsviz/arch` | `architecture component zone packet` |
| `@dsviz/uml` | `sequence classDiagram stateMachine useCase activity component deployment er` |
| `@dsviz/git` | `graph` (commit graph), `gitLanes` |
| `@dsviz/react` | `Diagram usePlayer useTicker useBurst`, controls, `Transport`, `CodeTrace`, `MathText` |

Imports:

```ts
import { combine, fitViewBox, connector, text, toSVG } from '@dsviz/core';
import { array, pointer, graph, tree } from '@dsviz/ds';
import { sequence, classDiagram } from '@dsviz/uml';
import { graph as gitGraph } from '@dsviz/git';          // git and ds both export `graph`: alias one
import { Diagram, usePlayer, Transport, Slider, Segmented } from '@dsviz/react';
```

Same names exist in two packages: `graph` (ds, git), `component` (uml diagram, arch single box),
`segment` (plot, geom), `circle` (core primitive, geom figure). Alias on import when you need both.

React:

```tsx
<Diagram scene={scene} label={altText} />                       // natural size: 1 unit = 1 CSS px
<Diagram scene={scene} viewBox={fitViewBox(allFrames)} />       // fixed camera for step-throughs (still natural size, from the viewBox)
```

Without React: `const view = createView(svgEl); view.render(scene);` Static: `toSVG(scene, { theme: 'dark' })`.

## Rules (follow all of them)

- **Layouts never style.** Never set colours, stroke widths or fonts on nodes. Say what a thing *is*
  with `tone` (`active`, `accent`, `success`, `danger`, `visited`, `orange`, `muted`, `ghost`), `role`,
  or a family's `kind` (graph `kind: 'changed'` → role `node-changed`). The stylesheet decides looks.
- **Ids must be stable and unique.** The same thing keeps the same id in every frame, or it won't
  animate (it fades out and back in). Two nodes with one id: only the first is drawn and the console
  warns. Families derive ids from your keys (`array` cells from `keys`, git commits from `hash`, tree
  nodes from `key`, UML boxes from their `id`); give keys that follow the *item*, not its position. Two
  copies of a family in one scene need different `id` options (or `namespace(part, 'left')`).
- **Estimate text, never measure it.** Nothing in dsviz reads the DOM for sizes: boxes are sized from
  `estimateTextWidth(s, size)` (0.6 em per character). Do the same in your own layout code; don't call
  `getBBox` or `measureText`.
- **No `window`/`document` at import time.** Scenes are pure data and can be built on a server; only
  `createView` / `<Diagram>` touch the DOM.
- **Camera: fixed for anything that steps or is dragged.** For a step-through, compute
  `fitViewBox(frames.map(draw))` once and pass it as `viewBox`, so the camera never moves between steps.
  For a dragged diagram, fit the starting layout with margin. Use the default auto camera only for one
  static picture or a structure that grows.
- **Paint order is array order.** Lines before the boxes they join; a `window` band before the array.
  Families already order their own parts (fragment boxes under messages, edges under nodes).
- **Place or don't.** `x`/`y` are optional on every graph-like diagram (architecture, class, state, object,
  component, deployment, use case, activity, ER, `graph` with
  `layout: 'layered'`): leave them out and `@dsviz/layout` places the boxes. Give them for boxes the user
  has dragged.

## Theme contract

Every colour is a CSS variable on `.dv-root` (diagrams) and `.dvc` (controls): `--dv-surface`,
`--dv-fg`, `--dv-muted`, `--dv-faint`, `--dv-edge`, `--dv-font`, `--dv-mono`, `--dv-<tone>`,
`--dv-<tone>-fill`, `--dv-<tone>-outline`. Map an app's tokens onto them on any ancestor:

```css
.my-app .dv-root, .my-app .dvc {
  --dv-surface: var(--panel); --dv-fg: var(--text); --dv-muted: var(--text-muted);
  --dv-font: var(--font-sans); --dv-mono: var(--font-mono);
}
```

Dark mode: `.dark` or `[data-theme="dark"]` on any ancestor (else the OS setting). The stylesheet is
injected into `<head>` the first time a view is created; pass `<Diagram injectStyles={false}>` (or
`createView(svg, { injectStyles: false })`) when the app ships `DEFAULT_CSS` itself or a CSP forbids
injected styles. `toSVG(scene, { theme: 'light' | 'dark' })` pins a palette inside a standalone file.

## Diagram cheat-sheet

| Diagram | Call | Notes |
|---|---|---|
| Sequence | `sequence(participants, messages, { upTo, fragments, notes, activations, highlight, numbered })` | kinds `call`/`return`/`async`; `upTo` reveals step by step; `highlight: false` for static |
| Class | `classDiagram(classes, relations, { route, collapsed })` | relations `inherits`, `implements`, `composition`, `aggregation`, `association`, `dependency` |
| State | `stateMachine(states, transitions, { current, fired })` | kinds `initial`, `final`, `choice` |
| Use case | `useCase(actors, cases, relations, { system })` | relations `association`, `include`, `extend`, `generalization`; `system` draws the boundary |
| Activity | `activity(nodes, flows, { swimlanes, direction, current, taken })` | kinds `action decision merge fork join start end flowFinal`; flow `guard`; `current`/`taken` highlight a walk |
| Component | `component(components, connections, { direction })` | `provides` / `requires` interfaces, `ports`, `parent` nesting; connections `assembly`, `dependency`, `delegate` |
| Deployment | `deployment(nodes, artifacts, links)` | nodes with `stereotype` and `parent`; artifacts sit in a `node`; links `protocol`, `kind: 'deploy'` |
| ER | `er(entities, relationships, { collapsed })` | crow's foot; cardinalities `one many zero-one zero-many one-many` at each end, `identifying: false` dashed |
| Architecture | `architecture(components, links, { zones, direction, route })` | kinds `client user lb gateway service cache db queue cdn storage file` |
| Graph / DAG | `graph(nodes, edges, { layout: 'layered', shape: 'rect', directed, route: 'elbow' })` | node `kind` → role `node-<kind>` (`changed`, `upstream`, `downstream`, `test`) |
| Git | `gitGraph(commits, refs, { highlight })` | commits newest first, `parents` first-parent first |
| Array | `array(values, { keys, tones, cell })` + `pointer({ id, at: arr.top(i), label })` | `arr.window(lo, hi)` for a band |
| Trees | `tree(root, { layout: 'tidy', shape: 'rect' })`, `binaryTree(root, { layout: 'tidy' })` | n-ary `{ key, label, children }` |
| Maps, lists, grids | `hashMap(entries)`, `linkedList(nodes)`, `grid(rows, { colLabels, cellWidth })`, `stack`, `queue` | |
| Layout only | `layered(nodes, edges)`, `tidy(root, children)` | positions without drawing |
| Other | `@dsviz/plot` (functions, tangents, areas), `@dsviz/prob`, `@dsviz/geom`, `@dsviz/os` | see `references/api.md` |

Layouts return the scene plus **anchors** (`arr.top(i)`, `seq.rowY(i)`, `g.pos(id)`, `a.frame(id)`,
`d.box(id)`, `a.along(from, to, t)`). Use anchors to attach pointers, arrows and labels instead of
computing coordinates. The UML layouts return `box(id)` (centre + size, a `Frame`); `useCase`,
`activity`, `component` also return `frame(id)` and `frames`.

The box-and-line diagrams take `interactive` (clicks report which box), `draggable`, and mostly `dim`
(a `Set` of ids to fade) and `rankGap` / `nodeGap` (spacing for unplaced boxes). `e.node.data` says what
was hit, and the key names the kind of thing: `{ class }`, `{ object }`, `{ state }`, `{ actor }` /
`{ case }`, `{ node }` (activity, deployment) / `{ artifact }`, `{ component }` (uml and arch),
`{ package }`, `{ entity }` (ER), `{ participant }`. Each value is
the id you gave it.


## Sequence diagrams: exact behaviour

- `upTo: i` is an inclusive **message** index: messages `0..i` are drawn, later ones are not drawn at all.
  Lifelines always run the full height, so `fitViewBox(frames.map(draw))` and `fitViewBox(draw(last))`
  give the same fixed camera. A note appears together with the message it sits before; notes at
  `at: messages.length` appear on the last step.
- `highlight` (default true) tones the message at `upTo` with `tone` (default `'active'`). Without
  `upTo` that is the last message, so pass `highlight: false` for a static picture.
- Activation bars come from the call stack: a `call` opens a bar on the callee; a `return` sent by `p`
  closes the most recent bar still open on `p`; a `return` with nothing open is drawn without closing
  anything. A self-call (`from === to`) is a loop with a one-row nested bar and needs no return.
  `async` opens no bar. Each later `alt` section starts from the stack as it was when the alt began,
  so both branches may return to the same caller.
- `gap` (default 150) is the fixed distance between lifelines; it does not grow with labels. Set it to
  at least `estimateTextWidth(longestLabel, 12) + 40`.
- `numbered` numbers every message, returns included; notes are not numbered.
- Fragments may nest (the inner one is inset). On an `alt`, `label` (if set) is the first guard,
  otherwise `sections[0].label`. A note at `at = k` sits in its own row before message `k`: inside a
  fragment's box when `from < k ≤ to`, above it when `k = from`.
- Types: `Participant`, `Message`, `Fragment`, `FragmentSection`, `Note`,
  `SequenceOptions` (every family exports its option and data types; see `references/api.md`).

## Other UML diagrams: what to know

- **Activity** `current` (a node id or a set, for parallel branches) and `taken` (flow indices, or a set)
  are the whole animation: compute them per step and the same layout highlights the walk. With
  `swimlanes`, give each node a `lane` id; fork/join bars need none (they stretch between their
  neighbours). `direction: 'right'` turns lanes into rows.
- **Use case** `include` points from the base case to the case it uses; `extend` points from the
  extension back to the base. Actors take `side: 'left' | 'right'`.
- **Component** an `assembly` goes from the requirer (`from`, the socket) to the provider (`to`, the
  ball). Ports are named in `ports` and can be a connection end.
- **Deployment** nodes are the only 3D thing in the library (flat-shaded top and right faces). `x`/`y` is
  the centre of the FRONT face. Dragging a node takes its artifacts and child nodes along.
- **Package** relations may join packages at any depth; lines meet the outer body, not the tab.
- **ER** `fromCard` is the marker at the `from` entity: customer(`one`) ── order(`zero-many`) reads
  "one customer has zero or more orders". `identifying: false` dashes the line.
- **Object** is the runtime twin of class: same box sizes and spacing, so morphing between them is
  clean when ids match.

## Animation and stepping

Write the algorithm as a generator that yields plain snapshots, then draw each snapshot:

```tsx
const player = usePlayer(() => run(input), [input]);          // frames, frame, next, prev, toggle…
const viewBox = useMemo(() => fitViewBox(player.frames.map(draw)), [player.frames]);
<Diagram scene={draw(player.frame)} viewBox={viewBox} />
<Transport player={player} />
```

Yield copies (`[...arr]`), never the array you keep mutating. `makeFrames` runs once, then again
whenever `deps` change (like `useEffect`), which resets to step 0; `frame` is `undefined` only when it
yields nothing. Put the step's sentence in HTML under the diagram (`<p>{note[player.index]}</p>`), or
as a `text` node with one stable id: text whose words change crossfades on its own. `enter`/`exit` on
a node say where it comes from and goes to.

Alt text: pass `label` to `<Diagram>` yourself (one sentence on what the picture shows); there is
no generator for it.

## Before you finish

- Run the type checker: layouts are fully typed, and most mistakes (a missing `id`, a wrong kind
  string) are type errors.
- Give the `<Diagram>` a `label`.
- Check ids: every node id unique, stable across frames.
- Don't pass colours, fonts or pixel stroke widths; use tones, roles and kinds.
- Import each symbol from the package that owns it (`references/api.md` lists them per package).
