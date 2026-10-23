# dsviz — handoff notes for Claude Code

dsviz is a small SVG library for interactive, animated teaching diagrams. It started as a chat with
Claude on claude.ai and is moving into the **getbetter** app (a LeetCode-style practice site with
editorials and courses). These notes say where things stand and what's planned next.

## Read first

1. `docs/user-messages.md`: Jesse's messages from the original session, verbatim. Message 4 is the
   original brief and message 5 explains the screenshots. If anything below disagrees with his words,
   his words win.
   **Latest direction (Claude Code session):** "Don't literally give me Brilliant, I just want a library
   for the diagrams (like Diagramatics) so I can use them in another project." So: dsviz is a diagram
   library, installable into another app; the site is a docs + examples gallery, not a learning app.
   The diagram look stays clean-textbook (ink lines, flat palette, light grids); light by default, dark
   variant. An earlier round cloned Brilliant's whole UI (courses, lesson player, 3D buttons); that was
   removed.
2. `docs/getbetter-screens/*.png`: the site this goes into, and the diagrams to replace first.

You have npm here, which the original session didn't. Install what the plan needs (shadcn/Radix,
Motion, a real bundler) instead of hand-rolling substitutes.

## Working with the owner

- Jesse wants to **learn**, not just receive code. Explain design decisions, point out the
  interesting idea in each change, and leave room for him to implement parts himself when he asks.
- Prefers direct, plain explanations.

## What exists now

- `src/` — framework-free core, no runtime dependencies:
  - `scene.ts` primitives `rect`, `circle`, `text`, `arrow`, `path` (`dots: true` draws a dot per point, for vertices that must follow a morph); `combine` (takes nested lists of parts),
    `translate`, `namespace`, `bounds`. `path.ts`: path data, Catmull-Rom smoothing, arc-length `resample`.
  - `render.ts` `createView` (keyed reconciler + tween engine, `setViewBox`; each element carries its scene id as `data-id`), `describe.ts`, `static.ts` (`toSVG`),
    `player.ts`, `handle.ts` (draggable dot + big invisible hit target, optional pulse `hint`), `fx.ts` (`burst`).
  - `camera.ts`: `fitViewBox(parts)` and `nextCamera` (the `'grow'` auto camera: grow on overflow, shrink only below
    50% fill). Policy: plots/draggables fixed; step-throughs `fitViewBox(player.frames.map(draw))`; camera frozen while
    dragging. `mathtext.ts`: TeX-lite (`a^2`, `x_{i}`, `\cap`, `\text{}`) used for `role: 'math'` text and `<MathText>`.
  - Draggable nodes get `tabindex=0`; arrow keys emit the normal drag events from a virtual pointer (`e.keyboard`).
  - `styles.ts`: ONE theme (merged from the old flat + tactile looks, per Jesse): white canvas, 1.5px ink lines and
    arrows, #e5e5e5 grids, thick blue curves, maths in STIX. Solid shapes (cells, nodes, UML cards, sys components) are
    COLOURED: flat palette fill, 2px outline in a darker shade of it (`--dv-outline`, `--dv-<tone>-outline`; the
    OUTLINES block). No lips/3D (removed at Jesse's request). Interaction feedback is quiet (hover brightens;
    `dv-grabbed` adds a soft shadow; no press/lift motion). Controls are flat and quiet, except the slider: 8px track with dot notches.
    `--dv-*` variables on `.dv-root` / `.dvc`; dark via `[data-theme="dark"]` or `.dark` (or the OS setting).
    Roles (`grid`, `axis`, `curve`, `area`, `region`, `bar`, `guide`, `glow`, `handle`, `hit`, `math`…) decide looks.
  - Families: `ds/` (array, pointer, hashMap (maps and sets, rows keyed by key), linkedList, binaryTree, graph, grid,
    stack, queue — also exported top-level),
    `plot/` (plane, axes, fn, point, segment, vector, tangent, area, riemann, integrate, label),
    `prob/` (bars, sampleSpace, diePips, probTree, venn2 + vennRegions/vennAreas/vennRegionAt),
    `geom/` (polygon, segment, tickMarks, angleMark, circle, pointLabel + intersection/centre helpers),
    `sched/` (simulate: fcfs/sjf/srtf/rr/priority; gantt, whose segments may set their own lane/label/tone, so it is
    a general timeline), `mem/` (stackHeap, memory, hex). `grid` takes `cellWidth`/`cellHeight` for tables of words.
    `uml/` (classDiagram + RELATION_STYLE, sequence + activations() + `fragments` (loop/alt/opt boxes), stateMachine),
    `sys/` (architecture with component kinds client/user/lb/gateway/service/cache/db/queue/cdn/storage/file → role
    `sys-<kind>`, `zones` (dashed boundaries around groups, nested inside-out), links with `via` waypoints, packet, along()).
    Both use core `connector.ts` (line + end markers 'arrow'|'open'|'triangle'|'diamond'|'diamond-filled', straight /
    elbow / via routes, rectEdge).
    `git/` (`git.graph`: commit graphs, lanes by first-parent inheritance like GitGoose's layout; `gitLanes`),
    `code/` (`code.block`: numbered, highlighted code inside a scene),
    `layout/` (`layered`: Sugiyama-lite DAG layout used by `graph({ layout: 'layered' })`, sys, class and state
    diagrams for nodes without x/y; `tidy`: Reingold–Tilford, used by `tree()` and `binaryTree({ layout: 'tidy' })`).
    `graph` nodes take `shape: 'rect'` and `kind` → role `node-<kind>` (changed/upstream/downstream/test styled).
    `uml.sequence` has notes, alt `sections`, per-message tone, `activations: false`.
    Non-ds families are namespaces: `import { plot, prob, geom, sched, mem, uml, sys, git, code, layout } from 'dsviz'`.
  - `spec.ts`: `DiagramSpec` (JSON, discriminated on `type`), `validateSpec` (path-precise errors, strict about unknown
    fields), `fromSpec`, `describeSpec` (alt text). This is what GitGoose's models emit and GitGoose verifies.
  - Renderer crossfades text whose words change (a ghost of the old text fades out). `toSVG({ theme })`.
- `src/react/` — `<Diagram>` (natural size by default: 1 scene unit = 1 CSS px, shrinks on narrow screens; `scale`,
  `size="fill"`, fixed `viewBox`, `duration`, `ease`), `usePlayer` (`start: 'end'`), `useTicker`, `useBurst`, and small
  neutral controls on Radix: `Slider`, `Segmented`, `Select`, `Switch`, `NumberStepper`, `Button`, `TextInput`,
  `Transport` (`<Transport player={player} />`), `CodeTrace`, `MathText`.
- `site/` — docs site (Vite + React, hash routes): home (`#/`, intro + live featured examples + usage), examples
  (`#/examples`: 36 examples grouped by family, each the live diagram beside its editable source), guide
  (`#/guide`), API (`#/api`). Every `site/demos/*.tsx` is a real module importing from `dsviz` / `dsviz/react`;
  `site/live/useLive.tsx` + sucrase `compile.ts` + CodeMirror make the source editable in the page.
- `site/d3/` — the same 42 examples redrawn in plain d3, on the `#/examples-d3` page (`site/D3Examples.tsx`), to test whether
  dsviz could be d3 instead of a custom engine, usable in Observable. Each `site/d3/cells/<Name>.js` is the BODY of an Observable
  `{ ... }` cell (free variables `d3`, `kit`, `invalidation`; ends with `return fig.el`), editable on the page, with a "Copy for
  Observable" button. `site/d3/kit.js` is the shared plumbing (stylesheet, controls, step player, arrow markers, drag helper) and is
  itself a cell body (`kit = { ... }`). `tests/d3cells.test.ts` runs every cell headlessly (run vitest with `--fsModuleCache=false`
  after adding a cell, or its `import.meta.glob` is stale). d3 gave scales, axes, shapes, hierarchy/tree, drag, joins and
  transitions; it has no layered DAG layout, connectors/UML, or path morph between different point counts, so those are hand-written
  in the cells (see the header comments).
- Install in another project: `npm install dsviz`. Published to npm by `.github/workflows/publish.yml` when a GitHub
  release is published (tag `v<version>`, matching package.json), authenticated by npm Trusted Publishing (OIDC: no
  npm token stored anywhere; the first version is published by hand, since npm only trusts publishers of existing packages). The repository is
  private, so a git dependency cannot be fetched by anyone else's CI: that is why it is published.
  `build.mjs` emits one ES module per source file (not a bundle) and rewrites relative imports to `.js`, so apps can
  tree-shake it: a bundle's namespace objects (`plot`, `sys`…) kept every function alive (a lesson drawing one array
  went from 79 KB to 34 KB).
- `tests/` — vitest for path maths and every family's maths (`npm test`); `render.test.ts` runs in happy-dom
  (dev dependency) for the renderer and React controls.
- `.claude/skills/dsviz/` — the Claude skill for USING dsviz (SKILL.md + references/api.md, spec.md, recipes.md).
  Shipped in the npm package; `npm run sync:skill -- <repo>` / `npx dsviz-sync-skill <repo>` copies it elsewhere
  (GitGoose syncs it; never edit a copy). Keep references/api.md in step with the exports.
- Scripts: `npm run dev` (site), `npm run build` (library → `dist/`), `npm run build:site` (→ `site-dist/`),
  `npm run typecheck`. `.github/workflows/pages.yml` deploys the site to GitHub Pages on push to main.

Key design rule worth preserving: **layouts never know about styling**. They emit semantic parts
(`role: 'value' | 'index' | 'tag' | 'window' …`) and the stylesheet decides how each part looks.

## Done vs. still to do

Done: everything in "Decisions made in the last round" below, plus the examples site. Wired into getbetter: its
second course, *Inside getbetter* (`content/course/getbetter/` there), has fifteen figures drawn with dsviz in
`web/src/components/course/figures/`, sitting in getbetter's own frame and plain-button controls
(`web/src/components/course/DiagramFrame.tsx`, which also maps `--dv-surface`/fonts onto the app's tokens). The
library additions that course needed (zones, file kind, link waypoints, sequence fragments, gantt segment
lane/label/tone, non-square grid cells, toned captions, the unbundled build) are general; the layout ones have tests,
and TrustZones and Polling on the examples page show them.
getbetter's problem editorials (`web/src/components/viz/` there, getbetter PR #44) draw a figure per code problem
with dsviz, most on one shared step-through frame, including the two binary-search diagrams; `hashMap` was added for
them. 2.2.0 (GitGoose plan 4, phase 6a) added the JSON spec, layered and tidy layouts, git graphs, sequence notes and alt
sections, code blocks, text crossfade and the skill. Still open: three-set Venn; Walker's spacing fix for tidy trees
(see the exercises in the guide).

## The getbetter context (screenshots in `docs/getbetter-screens/`)

- `binary-search-editorial-1.png`: editorial with an interactive binary search: a target stepper
  (− 9 +), a row of small square cells with index numbers and `lo`/`hi` labels under them, a status
  sentence, a code panel with the current line highlighted, and a transport bar (first / play / next
  + scrubber with tick marks + "Step 0 / 8"). This is the first diagram to replace with dsviz.
- `binary-search-editorial-2.png`: "why it is fast": an array-size slider, halving chips
  (64 32 16 8 4 2 1), and a bar comparison (binary search vs linear scan). Second to replace.
- `webgl-course-camera.png`: the course layout with a 3D WebGL diagram, sliders and selects in a side
  panel. Out of scope for now, but it shows the control style to match.

## Suggested next steps

1. Move this folder into the getbetter repo (e.g. `packages/dsviz` or `src/lib/dsviz`), switch the
   build to the repo's bundler, and delete `site/` once there are real pages using it.
2. Collapse to one dark-first theme matched to getbetter's tokens.
3. Add `path`, then `dsviz/react` (`Diagram`, `usePlayer`), then rebuild the two binary search
   diagrams from the editorial screenshots as the first real use.
4. Add the families one at a time, each with one real lesson diagram as its test case.
