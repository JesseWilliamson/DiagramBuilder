# Changelog

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
- **Claude skill** in `.claude/skills/dsviz/` (shipped in the package), and `npm run sync:skill -- <repo>`
  / `npx dsviz-sync-skill <repo>` to copy it into another repository.

### Changed

- `x`/`y` are optional on `sys.Component`, `uml.UmlClass` and `uml.UmlState` (unplaced ones are laid
  out). Code that reads `.x` back from these input types now sees `number | undefined`.
- A bent state transition's label sits beside the curve, on the outside of the bend, instead of on it.
- Muted connectors (UML relations, architecture links) now draw in the faint colour.
- `toSVG` wraps its embedded stylesheet in CDATA, and the stylesheet no longer contains `<` (it broke
  inside an `<svg>`).
- Controls inject their stylesheet once per mount (an insertion effect) instead of on every render.
