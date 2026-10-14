# dsviz — handoff notes for Claude Code

dsviz is a small SVG library for interactive, animated teaching diagrams. It started as a chat with
Claude on claude.ai and is moving into the **getbetter** app (a LeetCode-style practice site with
editorials and courses). These notes say where things stand and what's planned next.

## Read first

1. `docs/user-messages.md`: Jesse's messages from the original session, verbatim. Message 4 is the
   original brief and message 5 explains the screenshots. If anything below disagrees with his words,
   his words win.
   **Latest direction (Claude Code session):** "Really just try to clone exactly the UI from
   Brilliant." The look is now modelled on brilliant.org's real design tokens (light by default, dark
   variant), and the site is a Brilliant-style course + lesson player. This supersedes the earlier
   "dark-first, matched to getbetter" decision; getbetter can still re-skin via the CSS variables.
2. `docs/getbetter-screens/*.png`: the site this goes into, and the diagrams to replace first.

You have npm here, which the original session didn't. Install what the plan needs (shadcn/Radix,
Motion, a real bundler) instead of hand-rolling substitutes.

## Working with the owner

- Jesse wants to **learn**, not just receive code. Explain design decisions, point out the
  interesting idea in each change, and leave room for him to implement parts himself when he asks.
- Prefers direct, plain explanations.

## What exists now

- `src/` — framework-free core, no runtime dependencies:
  - `scene.ts` primitives `rect`, `circle`, `text`, `arrow`, `path`; `combine` (takes nested lists of parts),
    `translate`, `namespace`, `bounds`. `path.ts`: path data, Catmull-Rom smoothing, arc-length `resample`.
  - `render.ts` `createView` (keyed reconciler + tween engine, `setViewBox`), `describe.ts`, `static.ts` (`toSVG`),
    `player.ts`, `handle.ts` (draggable dot + big invisible hit target).
  - `styles.ts`: ONE theme cloned from Brilliant (values read from brilliant.org's Panda tokens): white canvas,
    black 1.5px lines, flat yellow/blue/green/red/purple/orange fills, #e5e5e5 grids, thick blue curves, a solid
    3px lip under pressable tiles. `--dv-*` variables on `.dv-root` / `.dvc`; dark via `[data-theme="dark"]` or `.dark`.
    Roles (`grid`, `axis`, `curve`, `area`, `region`, `bar`, `guide`, `glow`, `handle`, `hit`, `math`…) decide looks.
  - Families: `ds/` (array, pointer, linkedList, binaryTree, graph, grid, stack, queue — also exported top-level),
    `plot/` (plane, axes, fn, point, segment, vector, tangent, area, riemann, integrate, label),
    `prob/` (bars, sampleSpace, diePips, probTree, venn2 + vennRegions/vennAreas/vennRegionAt),
    `geom/` (polygon, segment, tickMarks, angleMark, circle, pointLabel + intersection/centre helpers),
    `sched/` (simulate: fcfs/sjf/srtf/rr/priority; gantt), `mem/` (stackHeap, memory, hex).
    Non-ds families are namespaces: `import { plot, prob, geom, sched, mem } from 'dsviz'`.
- `src/react/` — `<Diagram>` (fixed viewBox ⇒ aspect-ratio sizing; `ease`), `usePlayer` (`start: 'end'`), `useTicker`,
  Radix-based controls styled like Brilliant (3D pill buttons with a 4px lip, pill segments, black-thumb sliders):
  `Slider`, `Segmented`, `Select`, `Switch`, `NumberStepper`, `Button` (primary/green/ghost), `TextInput`,
  `Transport` (`<Transport player={player} />`), `CodeTrace`; the fun layer `Challenge`, `Predict`, `useBurst`
  (+ core `burst()` and `handle({ hint })`); and the lesson kit `MultipleChoice`, `Feedback`, `ProgressSegments`.
- `site/` — a Brilliant-style app (Vite + React, hash routes): home (oat hero, serif headline, live Pythagoras
  card), `#/courses`, `#/course/:id` (zig-zag path of 3D lesson tiles), `#/lesson/:course/:lesson` (one screen
  per step: prompt → diagram card → question → Check → green/pink feedback sheet → Continue; segmented
  progress; completion screen), `#/docs`. Content lives in `site/content.tsx` (6 courses, 18 lessons, 24
  questions). Every `site/demos/*.tsx` is a real module and the editable source: the `</>` button in the lesson
  top bar opens a drawer where it's edited live (`site/live/useLive.tsx` + sucrase `compile.ts` + CodeMirror).
- `tests/` — vitest for path maths and every family's maths (`npm test`).
- Scripts: `npm run dev` (site), `npm run build` (library → `dist/`), `npm run build:site` (→ `site-dist/`),
  `npm run typecheck`. `.github/workflows/pages.yml` deploys the site to GitHub Pages on push to main.

Key design rule worth preserving: **layouts never know about styling**. They emit semantic parts
(`role: 'value' | 'index' | 'tag' | 'window' …`) and the stylesheet decides how each part looks.

## Done vs. still to do

Done: everything in "Decisions made in the last round" below, plus the full demo page.
Still open: wiring into the getbetter repo and swapping controls for its shadcn components; replacing the two
binary-search editorial diagrams there (the BinarySearch demo is the starting point); three-set Venn; a
Reingold–Tilford tree layout; text crossfade in the renderer (see the exercises on the demo page).

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
