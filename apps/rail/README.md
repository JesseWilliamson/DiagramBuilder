# Network Control

A frontend-only course in Australian rail safeworking, taught from the network controller's seat. It is styled
after getbetter's course pages (Geist, achromatic surfaces, one blue accent) and its figures are drawn with dsviz.

```sh
npm run dev:rail     # http://localhost:5174
npm run build:rail   # static site in apps/rail/dist (hash routes, relative asset paths)
```

## Layout

- `src/lessons/` — one component per lesson; `lessons/index.ts` is the outline the sidebar, home page and pager read.
- `src/figures/` — the interactive figures, one per file.
- `src/rail/` — pure models (`plan`, `aspects`, `conflict`, `act`…) and `draw.ts`, a small dsviz-style family for
  track, signals, trains and bands. Models never draw and drawing never decides; `tests/rail.test.ts` checks the
  models against the numbers the lesson text quotes.
- `src/styles.css` — the page theme, plus the rail roles (`rail`, `lamp`, `post`, `train`, `band`…) that give the
  figures their look. Layout code sets roles and tones, never colours.

## Moving it to its own repo

It imports `dsviz` and `dsviz/<family>` like any app; `vite.config.ts` aliases those to this repo's source because
dsviz 3.1 isn't on npm yet. Once it is: copy this folder, add `dsviz`, `react`, `react-dom`, `@vitejs/plugin-react`
and `vite` to its own `package.json`, and delete the alias.

## Accuracy

The content uses NSW-derived terms (ARTC and Sydney Trains rulebooks). It teaches ideas, not rules: check anything
specific against the current rules of the network concerned.
