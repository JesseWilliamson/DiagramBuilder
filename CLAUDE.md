# dsviz — handoff notes for Claude Code

dsviz is a small SVG library for interactive, animated teaching diagrams. It started as a chat with
Claude on claude.ai and is moving into the **getbetter** app (a LeetCode-style practice site with
editorials and courses). These notes say where things stand and what's planned next.

## Read first

1. `docs/user-messages.md`: Jesse's messages from the original session, verbatim. Message 4 is the
   current brief and message 5 explains the screenshots. If anything below disagrees with his words,
   his words win.
2. `docs/getbetter-screens/*.png`: the site this goes into, and the diagrams to replace first.

You have npm here, which the original session didn't. Install what the plan needs (shadcn/Radix,
Motion, a real bundler) instead of hand-rolling substitutes.

## Working with the owner

- Jesse wants to **learn**, not just receive code. Explain design decisions, point out the
  interesting idea in each change, and leave room for him to implement parts himself when he asks.
- Prefers direct, plain explanations.

## What exists (this folder = last working version)

- `src/` — TypeScript core, no runtime dependencies:
  - `scene.ts`: the Scene model. A flat, ordered list of plain nodes (`circle`, `rect`, `text`, `arrow`)
    with stable `id`s. Array order = paint order.
  - `render.ts`: `createView(svg)` — keyed reconciler + rAF tween engine. Diff by id: same id tweens
    from its *current on-screen* values (so interrupts are smooth), new ids fade in (or start from
    `enter`), missing ids fade out (or go to `exit`). Also animates the viewBox, emits click/drag.
  - `describe.ts`: node → SVG tag + attrs, shared by the DOM renderer and `toSVG()`.
  - `styles.ts`: all colour via CSS variables + tone classes (`dv-tone-active` …), so colour changes
    are CSS transitions. Currently has three themes (plain / brilliant / textbook).
  - `player.ts`: `createPlayer(generator)` — algorithms are generators that `yield` snapshots; the
    player stores every frame so prev/scrub work. (Yield copies, not the array you mutate.)
  - `layouts/`: `array` (+ `pointer`, `window`), `linkedList`, `binaryTree` (+ `treeFromLevelOrder`),
    `graph`, `grid`, `stack`, `queue`. Layouts return nodes + anchor helpers (`arr.top(i)` …).
- `examples/react-motion.tsx`: rendering a Scene with React + Motion (untested sketch).
- `site/`: the demo page (vanilla JS, editable code panels). `node build.mjs` builds everything; the
  hand-rolled concat bundler in `build.mjs` should be replaced by esbuild/tsup/Vite library mode.

Key design rule worth preserving: **layouts never know about styling**. They emit semantic parts
(`role: 'value' | 'index' | 'tag' | 'window' …`) and the stylesheet decides how each part looks.

## Decisions made in the last round (not yet implemented)

1. **One theme only.** Brilliant-leaning but much closer to the textbook theme: crisp thin ink
   outlines, light fills, a very subtle (or no) lip shadow, gentle motion, no loud pill tags.
   It must sit inside getbetter's UI (see screenshots below), which is **dark-first**: near-black
   panels, thin 1px borders, small type, monospace numerals, a blue accent, green for "good".
   Delete `plain`/`textbook`/`brilliant` and the theme-switching code; keep the token system so the
   app can override variables.
2. **React library.** Keep the framework-free core; add a thin `dsviz/react` layer:
   - `<Diagram scene height viewBox onClick onDrag />` wrapping `createView` (render on scene change,
     duration 0 while dragging; add `view.setViewBox()` for fixed-camera plots).
   - hooks: `usePlayer(makeFrames, deps)`, `useTicker`.
   - controls (optional, swappable for shadcn): `Slider` (ticks, keyboard, value readout),
     `Segmented` (use instead of dropdowns for 2–4 options), `Select`, `Switch`, `Transport`
     (first/prev/play/next + scrubber with a tick per step + "Step i / n"), `NumberStepper` (− n +).
     In getbetter, build these on the app's shadcn/Radix components rather than new ones.
   - Interaction principle: direct manipulation first (drag the point/vertex/cell itself), controls
     second. Avoid dropdowns inside diagrams.
3. **New primitive: `path`** (`points`, `closed`, `smooth`, `width`) for curves, polygons, areas, arcs,
   Venn regions. Tween point-wise; when the point count changes, resample the old shape first.
   (A first draft of the new `scene.ts` with `PathNode`, `namespace()` and path bounds was written
   but not finished; reimplement from this description.)
4. **New diagram families** (each a folder of layout functions returning Scene + anchors):
   - `plot/`: `plane({x:[a,b], y:[c,d], width, height})` with `toPx`/`toWorld` (y up), `axes`, grid,
     `fn(plane, f)` sampled into paths and split at discontinuities, `point` (draggable), `segment`,
     `tangent`, `vector`, `area(f, a, b)`, `riemann(f, a, b, n, rule)` (rects keyed by index).
   - `prob/`: distribution bars, sample-space grid (two dice), probability tree, two-set Venn with
     highlightable regions (lens / A-only / B-only computed from circle intersections).
   - `geom/`: polygon, segment, circle, `angleMark(A, B, C)` (arc or right-angle square), equal-length
     tick marks, point labels; math helpers (intersections, foot of perpendicular, circumcentre).
   - `sched/`: Gantt chart for CPU scheduling (lanes, time axis, task bars keyed by id, "now" cursor,
     ready queue) — FCFS / SJF / Round Robin demos.
   - `mem/`: stack frames + heap objects with pointer arrows (Python-Tutor style), and memory cells with
     hex address labels for pointer arithmetic.
   - `ds/`: the existing data-structure layouts.
   - Text: add a `math` role (italic serif) for variable names; render prose maths with KaTeX
     (`output: 'mathml'` needs no fonts/CSS).
5. **Code tracing** (from the getbetter editorial screenshot): a panel listing the algorithm's lines,
   with the current line highlighted per player frame. Worth making a reusable component —
   generator frames can carry `line: number`.

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
