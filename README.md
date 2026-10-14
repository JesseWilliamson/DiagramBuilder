# dsviz

Interactive, animated SVG teaching diagrams: algorithms, functions, probability, geometry, scheduling and memory.
A framework-free core plus a thin React layer.

```
state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ <Diagram> / createView / toSVG
```

```tsx
import { array, combine, pointer, plot, prob, geom, sched, mem } from 'dsviz';
import { Diagram, Transport, usePlayer, Slider, Segmented } from 'dsviz/react';
```

The demo page (`site/`) has 21 live-editable examples; each one is also a copy-pasteable React component.

- `npm run dev` — the demo page
- `npm test` — unit tests
- `npm run build` — library build into `dist/`
- `npm run build:site` — static demo site into `site-dist/` (deployed to GitHub Pages by CI)

See `CLAUDE.md` for the design notes.
