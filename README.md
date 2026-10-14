# dsviz

Interactive, animated SVG teaching diagrams. Framework-free core, plus a thin React layer.

```
state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ <Diagram> / createView / toSVG
```

```tsx
import { array, pointer, combine } from 'dsviz';
import { Diagram, usePlayer, Transport } from 'dsviz/react';
```

- `npm run dev` — playground (binary search diagrams)
- `npm test` — unit tests
- `npm run build` — library build into `dist/`

See `CLAUDE.md` for the design notes and roadmap.
