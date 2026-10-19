---
name: dsviz
description: Draw diagrams with the dsviz library (npm package `dsviz`), as SVG in a React app, in plain DOM, or as a standalone SVG string. Use this whenever a task asks for a diagram, figure or visual explanation in a project that depends on dsviz: sequence diagrams, class or state diagrams, architecture/system diagrams, dependency or call graphs (DAGs), git commit graphs, data-structure figures (arrays, trees, hash maps, linked lists, grids), code with highlighted lines, plots, or step-through algorithm animations. Also use it to write or check a JSON `DiagramSpec` (validateSpec / fromSpec / describeSpec), or to export a diagram with toSVG.
---

# dsviz

dsviz turns data into an SVG **scene**: a flat list of plain nodes (`rect`, `circle`, `text`, `arrow`,
`path`), each with a stable `id`. A renderer draws the scene and, when you render a new one, tweens every
node that kept its id. Layout functions ("families") build scenes from your data. The core has no runtime
dependencies; `dsviz/react` is a thin wrapper.

```
your data ──family()──▶ Scene { nodes } ──▶ <Diagram scene> │ createView(svg).render(scene) │ toSVG(scene)
JSON spec ──validateSpec──▶ fromSpec ──▶ Scene              describeSpec(spec) → alt text
```

## Step 1: pick one of three ways to draw

1. **A JSON spec** when the diagram is data you (or a model) produce and a program must check before
   drawing it: `validateSpec(x)` → `fromSpec(spec)`. Types: `sequence`, `class`, `state`,
   `architecture`, `graph`, `git`, `array`, `table`, `code`. Coordinates are optional. Read
   `references/spec.md` for every field and example.
2. **A family function** for anything interactive, animated, or beyond what a spec says: `uml.sequence`,
   `sys.architecture`, `graph`, `git.graph`, `array`, `tree`, `code.block`… Read `references/api.md` for
   signatures and `references/recipes.md` for worked examples.
3. **A hand-built scene** for a one-off figure: `combine(rect({...}), text({...}), connector({...}))`.
   Combine with families freely: everything is a `Part` (a scene, a node, a nested list, or falsy).

Prefer 1 when the output is a static picture of known shape; prefer 2 when anything moves, responds to
clicks or drags, or steps through an algorithm.

## Step 2: write the code

Imports:

```ts
import { array, pointer, graph, tree, combine, fitViewBox, connector, text, toSVG,
         validateSpec, fromSpec, describeSpec } from 'dsviz';
import { uml, sys, git, code, layout, plot, prob, geom, sched, mem, ds } from 'dsviz'; // namespaces (ds.* = the top-level data structures again)
import { Diagram, usePlayer, Transport, Slider, Segmented } from 'dsviz/react';
```

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
  nodes from `key`); give keys that follow the *item*, not its position. Two copies of a family in one
  scene need different `id` options (or `namespace(part, 'left')`).
- **Estimate text, never measure it.** Nothing in dsviz reads the DOM for sizes: boxes are sized from
  `estimateTextWidth(s, size)` (0.6 em per character). Do the same in your own layout code; don't call
  `getBBox` or `measureText`.
- **No `window`/`document` at import time.** Scenes are pure data and can be built on a server; only
  `createView` / `<Diagram>` touch the DOM.
- **Camera: fixed for anything that steps or is dragged.** For a step-through, compute
  `fitViewBox(frames.map(draw))` once and pass it as `viewBox`, so the camera never moves between steps.
  Use the default auto camera only for one static picture or a structure that grows.
- **Paint order is array order.** Lines before the boxes they join; a `window` band before the array.
  Families already order their own parts (fragment boxes under messages, edges under nodes).
- **Validate untrusted specs.** `fromSpec` throws on an invalid spec; when the spec comes from a model
  or a user, call `validateSpec` first and show or return `errors` (`{ path, message }`).

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

## Family cheat-sheet

| Family | Call | Notes |
|---|---|---|
| Sequence | `uml.sequence(participants, messages, { upTo, fragments, notes, activations, highlight, numbered })` | kinds `call`/`return`/`async`; `upTo` reveals step by step; `highlight: false` for static |
| Class | `uml.classDiagram(classes, relations, { route })` | relations `inherits`, `implements`, `composition`, `aggregation`, `association`, `dependency`; x/y optional |
| State | `uml.stateMachine(states, transitions, { current, fired })` | kinds `initial`, `final`, `choice`; x/y optional |
| Architecture | `sys.architecture(components, links, { zones, direction, route })` | kinds `client user lb gateway service cache db queue cdn storage file`; x/y optional |
| Graph / DAG | `graph(nodes, edges, { layout: 'layered', shape: 'rect', directed, route: 'elbow' })` | node `kind` → role `node-<kind>` (`changed`, `upstream`, `downstream`, `test`) |
| Git | `git.graph(commits, refs, { highlight })` | commits newest first, `parents` first-parent first |
| Code | `code.block(source, { highlight: [[from, to]], numbers, start })` | 1-based inclusive lines; anchors `line(n)`, `right(n)` |
| Array | `array(values, { keys, tones, cell })` + `pointer({ id, at: arr.top(i), label })` | `arr.window(lo, hi)` for a band |
| Trees | `tree(root, { layout: 'tidy', shape: 'rect' })`, `binaryTree(root, { layout: 'tidy' })` | n-ary `{ key, label, children }` |
| Maps, lists, grids | `hashMap(entries)`, `linkedList(nodes)`, `grid(rows, { colLabels, cellWidth })`, `stack`, `queue` | |
| Layout only | `layout.layered(nodes, edges)`, `layout.tidy(root, children)` | positions without drawing |
| Spec | `validateSpec(x)`, `fromSpec(spec, { id })`, `describeSpec(spec)` | see `references/spec.md` |
| Other | `plot.*` (functions, tangents, areas), `prob.*`, `geom.*`, `sched.*`, `mem.*` | see `references/api.md` |

Layouts return the scene plus **anchors** (`arr.top(i)`, `seq.rowY(i)`, `g.pos(id)`, `a.frame(id)`,
`a.along(from, to, t)`, `block.right(n)`). Use anchors to attach pointers, arrows and labels instead of
computing coordinates.

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
  at least `estimateTextWidth(longestLabel, 12) + 40` (`fromSpec` does this for you).
- `numbered` numbers every message, returns included; notes are not numbered.
- Fragments may nest (the inner one is inset). On an `alt`, `label` (if set) is the first guard,
  otherwise `sections[0].label`. A note at `at = k` sits in its own row before message `k`: inside a
  fragment's box when `from < k ≤ to`, above it when `k = from`.
- Types: `uml.Participant`, `uml.Message`, `uml.Fragment`, `uml.FragmentSection`, `uml.Note`,
  `uml.SequenceOptions` (every family exports its option and data types; see `references/api.md`).

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

Alt text: for a spec, `describeSpec(spec)`. For a family diagram, write the `label` yourself, or, if
the picture is expressible as a spec, build the spec and use both `fromSpec` and `describeSpec`.

## Before you finish

- Run the type checker: families are fully typed, and most mistakes (a missing `id`, a wrong kind
  string) are type errors.
- For a spec, run `validateSpec` and fix every error; read each `path` literally.
- Give the `<Diagram>` a `label` (for a spec, `describeSpec(spec)`).
- Check ids: every node id unique, stable across frames.
- Don't pass colours, fonts or pixel stroke widths; use tones, roles and kinds.
