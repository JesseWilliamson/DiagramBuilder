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

## What exists now

- `src/` — framework-free core (no runtime deps): `scene.ts` (nodes: `circle`, `rect`, `text`, `arrow`, **`path`**;
  `combine`, `translate`, `namespace`), `path.ts` (path data, catmull-rom smoothing, arc-length `resample`),
  `render.ts` (`createView`: keyed reconciler + tween engine, `setViewBox`), `describe.ts`, `static.ts`
  (`toSVG`), `player.ts`, `styles.ts` (ONE dark-first theme as `--dv-*` variables; light via
  `[data-theme="light"]`/`.light`), `themes.ts` (now just fixed geometry + feel constants), `layouts/` (the old
  data-structure layouts; to be moved under `ds/`).
- `src/react/` — `<Diagram>`, `usePlayer`, `useTicker`, and controls built on Radix: `Slider`, `Segmented`, `Select`,
  `Switch`, `NumberStepper`, `Transport`, `CodeTrace`. Controls carry class `dvc` so they get the same variables.
- `playground/` — Vite app with the two binary-search diagrams from the screenshots rebuilt (`npm run dev`).
- `tests/` — vitest (`npm test`). `npm run build` = tsc (d.ts) + esbuild (ESM, react external).

Key design rule worth preserving: **layouts never know about styling**. They emit semantic parts
(`role: 'value' | 'index' | 'tag' | 'window' …`) and the stylesheet decides how each part looks.

## Done vs. still to do (from the plan below)

Done: one theme (1), `path` primitive (3), React layer + controls + code trace (2, 5), both binary-search diagrams
as the first real use (next steps 2-3), real bundler.
Not done: the diagram families in (4) (`plot/`, `prob/`, `geom/`, `sched/`, `mem/`), the `math` text role is only
CSS (no KaTeX yet), moving `layouts/` to `ds/`, wiring into the getbetter repo and swapping the controls for its
shadcn components, drag-first interaction demos.

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
