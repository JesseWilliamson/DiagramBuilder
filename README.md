# dsviz

Interactive, animated SVG diagrams for data structures and algorithms.
Zero dependencies, ~1,600 lines of heavily commented TypeScript, small enough to read in one sitting.

```
your state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ renderer
               array(), tree()…                                         createView()  (built-in tweening)
                                                                        toSVG()       (static string)
                                                                        React + Motion (examples/react-motion.tsx)
```

## Quick start

```js
import { createView, array, pointer, combine } from 'dsviz';

const view = createView(document.querySelector('svg'));
const a = [3, 8, 12, 17, 21];

function draw(i) {
  const arr = array(a, { tones: { [i]: 'active' } });
  view.render(combine(arr, pointer({ id: 'i', at: arr.top(i), label: 'i' })));
}
draw(0);
draw(3); // the pointer slides from 0 to 3
```

## The four ideas

**1. A scene is data.** `Scene = { nodes: SceneNode[] }`, where each node is a plain object:
`circle`, `rect` (centred), `text`, or `arrow` (with optional `bend` and `head`). Array order is
paint order. Because it's just data you can build it, test it, serialise it, or hand it to any renderer.

**2. Identity is the `id`.** The renderer diffs by id: same id → tween; new id → fade in (or start
from `enter`); missing id → fade out (or move to `exit`). Choosing ids is the main design decision
in every layout:
- array cells use the element's *key* (pass `keys` so swaps slide), index labels use the *index*;
- linked-list arrows use the node they *leave*, so re-pointing `next` swings the arrow;
- tree edges use the *child* key, since every node has exactly one parent edge.

**3. Layouts are functions that return nodes + anchors.** `array()` returns `top(i)`, `bottom(i)`,
`window(lo, hi)` and so on, so pointers and annotations attach without coordinate math.

**4. Algorithms are generators of snapshots.** `createPlayer(gen())` collects every frame up front,
which is what makes previous-step and scrubbing possible. Yield copies (`[...arr]`), not the array you
keep mutating.

## Files

| File | What's in it |
| --- | --- |
| `src/scene.ts` | Node types, constructors, `combine`, `translate`, `bounds` |
| `src/describe.ts` | node → SVG tag + attributes. Shared by both renderers. `arrowPath()` |
| `src/render.ts` | `createView`: keyed diff, rAF tween loop, animated viewBox, click/drag events |
| `src/static.ts` | `toSVG` string renderer |
| `src/styles.ts` | Default CSS. Tones are classes; colours are CSS variables on `.dv-root` |
| `src/player.ts` | `createPlayer` for stepping through generator frames |
| `src/layouts/*` | `array`, `pointer`, `linkedList`, `binaryTree` (+ `treeFromLevelOrder`), `graph`, `grid`, `stack`, `queue` |
| `examples/react-motion.tsx` | Rendering a Scene with React + Motion (framer-motion) instead of `createView` |
| `site/` | The demo page (`template.html`; `index.html` is generated) |

## Build

```sh
node build.mjs     # tsc → dist/esm (+ .d.ts), dist/dsviz.js (single-file ESM), dist/dsviz.iife.js (global DV), site/index.html
```

`build.mjs` contains a deliberately tiny concatenating bundler (the library has no runtime
dependencies). In a real repo, replace it with `tsup` or Vite library mode.

## Themes

```js
import { createView, themes, setDefaultTheme } from 'dsviz';
createView(svg, { theme: themes.brilliant });   // or 'textbook', 'plain'
setDefaultTheme(themes.textbook);               // for every view created afterwards
view.setTheme('brilliant');                     // switch in place
```

A theme has three parts, because "how it looks" lives in three places:

- **Look (CSS):** colours, fonts, stroke widths, the tile lip. Lives in `.dv-theme-<name>` in `styles.ts`.
- **Geometry (JS):** corner-radius scale, line-weight scale, arrowhead shape (chevron or solid triangle).
  Applied in `describe()`, because CSS can't reliably change these on SVG.
- **Feel (easing):** `brilliant` uses `easeOutBack` (overshoots and settles). `textbook` uses a quick `easeInOutCubic`.

Layouts never see the theme. They emit semantic parts (`role: 'value'`, `'tag'`, `'window'`…) and the
theme decides how each part looks, or whether it shows at all. For example, pointer tags only appear in `brilliant`.
Load each theme's fonts in your app (`themes.brilliant.fonts` is a Google Fonts URL).

## Theming

```css
.my-app .dv-root { --dv-active: #ff7a59; --dv-surface: #fffdf8; }
```

Tones: `default, active, accent, success, danger, visited, muted, ghost`. Add your own by defining
`.dv-tone-yours { --dv-c: … }` and adding it to the selector lists in `styles.ts`.

## Using it with React + Motion

See `examples/react-motion.tsx`. The short version: map `scene.nodes` to `motion.*` elements with
`key={node.id}` inside `<AnimatePresence>`. Animate SVG `x`/`y` attributes as `attrX`/`attrY`, and
for arrows spring the endpoint numbers and rebuild the path with `arrowPath()`, because straight and
curved path strings can't be interpolated into each other. (That file wasn't run here; treat it as a
starting point.)
