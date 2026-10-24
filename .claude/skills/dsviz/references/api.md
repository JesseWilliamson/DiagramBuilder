# dsviz API reference

Every function and type exported by the 11 packages, from their `src/index.ts`. Import each symbol from
the package named in the heading (`import { fn } from '@dsviz/plot'`); there are no namespaces.
In the tables, `a / b` means "one of"; `?` marks an optional field; defaults follow `=`. Every option not
marked required is optional. Each layout takes an `id` option (the prefix of its node ids) so two copies
can share a scene.

Names that two packages both export: `graph` (ds, git), `component` (arch: one box; uml: the diagram),
`segment` (plot, geom), `circle` (core primitive, geom figure), `ToneSpec` / `resolveTone` (ds, prob).

Common types (all from `@dsviz/core` unless noted):

```ts
type Vec = { x: number; y: number };
type Tone = 'default' | 'active' | 'accent' | 'success' | 'danger' | 'visited' | 'orange' | 'muted' | 'ghost' | string;
type Part = Scene | SceneNode | Part[] | null | undefined | false;
interface Box { x: number; y: number; w: number; h: number }          // top-left + size
interface Frame { x: number; y: number; w: number; h: number }        // CENTRE + size (what box(id) returns)
type ViewBox = [x: number, y: number, w: number, h: number];
type Key = string | number;                                           // @dsviz/ds
type ToneSpec<K, V> = Record<string, Tone> | ((key: K, value: V) => Tone | undefined);   // @dsviz/ds, prob: { 2: 'active' } or a function
```

## @dsviz/core

Headless: scene, renderer, camera, player, connectors. No dependencies.

### Scene

```ts
interface Scene { nodes: SceneNode[] }
type SceneNode = CircleNode | RectNode | TextNode | ArrowNode | PathNode;

// common to every node
{ id: string;                      // required, unique, stable across renders
  tone?: Tone; role?: string; opacity?: number; dashed?: boolean;
  draggable?: boolean; interactive?: boolean;
  enter?: Partial<numeric props>;  // start values when it first appears
  exit?: Partial<numeric props>;   // end values when it is removed
  data?: unknown }                 // returned in event handlers
```

| Export | Signature |
|---|---|
| `circle` | `circle({ id, x, y, r, ... }): CircleNode` (centred) |
| `rect` | `rect({ id, x, y, w, h, rx?, ... }): RectNode` (CENTRED on x, y) |
| `text` | `text({ id, x, y, text, size?, anchor?: 'start' / 'middle' / 'end', weight?, ... }): TextNode`; `role: 'math'` typesets TeX-lite |
| `arrow` | `arrow({ id, x1, y1, x2, y2, bend?, head?: boolean, width?, ... }): ArrowNode` |
| `path` | `path({ id, points: [x, y][], closed?, smooth?, dots?, width?, ... }): PathNode` (`dots` draws a dot per point) |
| `combine` | `combine(...parts: Part[]): Scene`, flatten, skipping falsy parts |
| `translate` | `translate(part, dx, dy): Scene` |
| `namespace` | `namespace(part, prefix): Scene`, prefix every id: `'left/arr:cell:0'` |
| `style` | `style(part, { tone?, role?, opacity?, dashed? }): Scene`, override on every node |
| `bounds` / `nodeBounds` | `bounds(part): Box`, `nodeBounds(node): Box` |
| `estimateTextWidth` | `estimateTextWidth(s, size): number` = `s.length * size * 0.6` |
| `circleEdge` | `circleEdge(center, toward, r): Vec` |

Types: `Scene`, `SceneNode`, `CircleNode`, `RectNode`, `TextNode`, `ArrowNode`, `PathNode`, `Part`, `Tone`,
`NumericProps`, `Box`.

### Connectors

| Export | Signature |
|---|---|
| `connector` | `connector({ id, from: Vec / Frame, to: Vec / Frame, route?: 'straight' / 'elbow', via?: Vec[], start?, end?, dashed?, tone?, width?, label?, startLabel?, endLabel?, gap?, opacity? }): Scene & { points: Vec[]; along(t): Vec }`; `via` overrides `route`; `start` / `end` are a `ConnectorEnd`, `end` defaults to `'arrow'` |
| `rectEdge` | `rectEdge(frame, toward): Vec`, where a ray from the centre leaves the box |
| `route` | `route(from, to, kind = 'straight', gap = 0): Vec[]`, the polyline a connector follows |
| `pointAlong` | `pointAlong(points, t): Vec`, by arc length |
| `frameOf` | `frameOf(box: Box): Frame` |

Types: `ConnectorEnd` = `'none' / 'arrow' / 'open' / 'triangle' / 'diamond' / 'diamond-filled'`, `Frame`,
`ConnectorOptions`, `ConnectorScene`.


### Rendering and export

```ts
createView(svg: SVGSVGElement, {
  duration?: number = 420; ease?: Easing; viewBox?: 'auto' / ViewBox; camera?: 'grow' / 'fit';
  size?: 'natural' / 'fill'; scale?: number; padding?: number = 24;
  injectStyles?: boolean = true; crossfade?: boolean = true
}): View
View: { render(scene, { duration?, camera?: boolean }), setViewBox(v), on(type, handler) → off,
        toWorld(clientX, clientY): Vec, destroy(), svg, scene }
ViewEvent: { type: 'click' / 'dragstart' / 'drag' / 'dragend', id, node, x, y, original, keyboard? }   // x, y in scene units

toSVG(scene, { padding?: 24, embedStyles?: true, width?, theme?: 'light' / 'dark', background?: boolean }): string
injectStyles(doc?)   DEFAULT_CSS: string   THEME_VARS: { light: string; dark: string }
```

Types: `View`, `ViewOptions`, `RenderOptions`, `ViewEvent`, `ViewEventType`, `ToSvgOptions`.

### Camera

| Export | Signature |
|---|---|
| `fitViewBox` | `fitViewBox(parts: Part / Part[], pad = 24): ViewBox`, the union of every frame, for a fixed camera |
| `nextCamera` | `nextCamera(current: ViewBox / null, content: ViewBox, mode = 'grow'): ViewBox`, the `'grow'` rule: grow on overflow, shrink only below 50% fill |

### Player, interaction, effects

| Export | Signature |
|---|---|
| `createPlayer` | `createPlayer(frames: Iterable<S>, { interval?, loop?, maxFrames?, onFrame? }): Player<S>`; `Player`: `frames`, `index`, `frame`, `playing`, `atEnd`, `next() prev() seek(i) play() pause() toggle() load(src) setInterval(ms) subscribe(fn) destroy()` |
| `handle` | `handle({ id, x, y, r?, hit?, tone?, data?, draggable?, hint? }): CircleNode[]`, a dot plus a big invisible hit target; `hint` pulses a ring until first touch |
| `burst` | `burst({ id, x, y, count?, radius?, tones? }): CircleNode[]`, particles that fly out as they enter |

### Maths, paths, easing, themes

| Export | Notes |
|---|---|
| `V2 vadd vsub vscale vlen vdist vnorm vperp vlerp` | plain `{ x, y }` helpers; type `Vec` |
| `parseMath mathWidth mathTspans` | TeX-lite (`a^2`, `x_{i}`, `\cap`, `\text{}`) behind `role: 'math'`; type `MathSpan` |
| `pathData dotData resample resampleProps` | path data, Catmull-Rom smoothing, arc-length resampling (how paths of different point counts morph) |
| `linear easeOutCubic easeInOutCubic easeOutBack easeOutSoft easeInQuad` | `Easing = (t) => number`; `easeOutSoft` is the default feel |
| `geometry feel` | the fixed look constants (corner scale, arrowhead, easing and duration); not options |
| `describe tagFor classFor numericProps pointsOf bendControl arrowPath pointOnArrow` | renderer internals, exported so `toSVG` and `createView` agree; app code rarely needs them. Types `Description`, `SvgTag` |

## @dsviz/layout

Pure placement maths, no DOM, no drawing.

| Export | Signature |
|---|---|
| `layered` | `layered(nodes: { id, w?, h? }[], edges: { from, to }[], { direction?: 'down' / 'right', rankGap? = 56, nodeGap? = 28, sweeps? = 6, x?, y? }): LayeredLayout`; `LayeredLayout`: `pos(id): Vec` (centre), `rank(id)`, `layers: string[][]`, `reversed: Set<string>`, `path(from, to): Vec[]`, `route(from, to, 'straight' / 'elbow'): Vec[]`, `box: Box`, `crossings`. Sugiyama-lite: cycles broken by DFS, longest-path layers, barycentre ordering, pool-adjacent-violators placement |
| `pack` | `pack(want: number[], sep: number[]): number[]`, closest ordered positions with minimum gaps |
| `tidy` | `tidy(root: T, children: (n) => (T / null)[] / undefined, { width?(n), gap? = 16, slot? = 40 }): TidyPlacement<T>[]` = `{ node, x, depth, parent }`; Reingold–Tilford, parents centred, `null` children are empty slots |

Types: `LayeredNode`, `LayeredEdge`, `LayeredOptions`, `LayeredLayout`, `TidyOptions`, `TidyPlacement`.

## @dsviz/ds

Data structures. `tones` on `array`, `stack`, `queue` is keyed by **index** (`{ 2: 'active' }` or
`(i, value) => …`), not by the `keys` entry; `keys` only decides identity for animation.

| Export | Signature and options | Returns (anchors) |
|---|---|---|
| `array` | `array(values: T[], { id? = 'arr', x?, y? (top-left), cell? = 48, gap? = 6, keys?: Key[], tones?: ToneSpec<number, T>, showIndices?, format?(v, i), vertical?, enterOffset?, exitOffset?, interactive? })` | `center/top/bottom/left/right(i): Vec`, `window(lo, hi, { id?, tone?, pad? }): Part`, `length`, `cell` |
| `stack`, `queue` | `stack(values, ArrayOptions)`, `queue(values, ArrayOptions)`, arrays with push/pop motion | `ArrayDiagram` |
| `pointer` | `pointer({ id, at: Vec, label?, side?: 'top' / 'bottom' / 'left' / 'right', length? = 26, gap? = 4, level?, tone? }): Scene` | |
| `linkedList` | `linkedList(nodes: { key, value, next: Key / null, tone? }[], { id?, x?, y?, w?, h?, gap?, order?: Key[], arrowTones? })` | `center/top/bottom(key)`, `slot(i)` |
| `listFromValues` | `listFromValues(values, prefix = 'n'): ListNodeSpec[]` | |
| `hashMap` | `hashMap(entries: Map / [key, value][] / Key[] (a set), { id?, x?, y?, keyWidth?, valueWidth?, row?, tones?: ToneSpec<Key, V>, formatKey?, formatValue?, title?, empty?, set? })` | `size`, `keyAt(k)`, `valueAt(k)`, `left(k)`, `right(k)` |
| `binaryTree` | `binaryTree(root: { key, label?, left?, right? }, { id?, x?, y?, r? = 20, dx? = 46, dy? = 66, tones?, edgeTones?, interactive?, showNulls?, layout?: 'inorder' / 'tidy' })` | `pos(key)`, `top/bottom/left/right(key)` |
| `treeFromLevelOrder` | `treeFromLevelOrder([3, 9, 20, null, null, 15, 7]): BinaryTreeNode / null` | |
| `tree` | `tree(root: { key, label?, children? }, { id?, x?, y?, r? = 20, shape?: 'circle' / 'rect', gap? = 14, dy? = 66, layout?: 'tidy' / 'leaves', tones?, edgeTones?, interactive? })` | `pos(key)`, `top(key)`, `bottom(key)` |
| `graph` | `graph(nodes: { id: Key, label?, x?, y?, tone?, kind? }[], edges: { from, to, label?, tone?, directed?, bend? }[], { id? = 'graph', r? = 22, shape?: 'circle' / 'rect', directed?, draggable?, interactive?, layout?: 'circle' / 'layered' (default circle), direction?: 'down' / 'right', rankGap?, nodeGap?, route?: 'straight' / 'elbow', cx?, cy?, radius? })` | `pos(id)`, `top(id)`, `bottom(id)` |
| `circularPositions`, `graphNodeSize` | `circularPositions(n, cx = 0, cy = 0, radius = 120): Vec[]`; `graphNodeSize(node, { r?, shape? }): { w, h }` | |
| `grid` | `grid(rows: T[][], { id?, x?, y?, cell? = 40, cellWidth?, cellHeight?, gap?, tones?(r, c, v), rowLabels?, colLabels?, format?(v, r, c), interactive? })` | `center/top/bottom/left/right(r, c)` |
| `resolveTone`, `show` | helpers the layouts use: `resolveTone(spec, key, value)`, `show(v): string` | |

`graph` `kind` becomes role `node-<kind>`; styled kinds: `changed`, `upstream`, `downstream`, `test`.
Nodes without x/y go on a circle, or in layers with `layout: 'layered'`.

Types: `Key`, `ToneSpec`, `ArrayOptions`, `ArrayDiagram`, `PointerOptions`, `ListNodeSpec`, `LinkedListOptions`,
`LinkedListDiagram`, `BinaryTreeNode`, `TreeOptions`, `TreeDiagram`, `TreeNode`, `NaryTreeOptions`,
`NaryTreeDiagram`, `GraphNodeSpec`, `GraphEdgeSpec`, `GraphOptions`, `GraphDiagram`, `GridOptions`,
`GridDiagram`, `HashMapOptions`, `HashMapDiagram`.

## @dsviz/plot

World coordinates (y up) through a `Plane`.

| Export | Signature |
|---|---|
| `plane` | `plane({ x: [min, max], y: [min, max], width?, height? }): Plane`; `Plane`: `x`, `y`, `width`, `height`, `sx(x)`, `sy(y)`, `toPx(x, y / Vec)`, `toWorld(px, py / Vec)`, `clamp(p)`, `unitX`, `unitY`, `viewBox(pad?)` |
| `axes` | `axes(p, { id?, xTicks?: number[] / number, yTicks?, grid?, labels?, xLabel?, yLabel?, hideZero? }): Scene` |
| `fn` | `fn(p, f, { id?, tone?, width?, samples?, domain?: [lo, hi], dashed? }): Scene`, curves split at asymptotes and clipped |
| `point` | `point(p, x, y, { id (required), label?, tone?, draggable?, r?, labelOffset?, data?, hint? }): Scene` |
| `segment` | `segment(p, a: Vec, b: Vec, { id (required), tone?, width?, dashed?, role? }): Scene` |
| `vector` | `vector(p, from, to, { id (required), label?, ...LineOptions }): Scene` |
| `label` | `label(p, x, y, s, { id (required), tone?, size?, anchor?, dx?, dy? }): Scene` |
| `tangent` | `tangent(p, f, x0, { id, span?, ...LineOptions }): Scene & { slope }` |
| `area` | `area(p, f, a, b, { id?, tone?, samples?, g?: Fn }): Scene`, shaded between `f` and the axis (or `g`) |
| `riemann` | `riemann(p, f, a, b, n, rule = 'left', { id?, tone? }): Scene & { sum }`; `rule`: `'left' / 'right' / 'mid' / 'trap'` |
| `integrate`, `derivative`, `niceTicks`, `clipToPlane` | `integrate(f, a, b, n = 400): number`; `derivative(f, x, h?)`; `niceTicks(lo, hi, target = 6): number[]`; `clipToPlane(p, a, b): [Vec, Vec] / null` |

Types: `Plane`, `PlaneOptions`, `AxesOptions`, `FnOptions`, `PointOptions`, `LineOptions`, `AreaOptions`, `RiemannRule`.

## @dsviz/prob

| Export | Signature | Returns |
|---|---|---|
| `bars` | `bars(values: number[], { id?, x?, y?, width?, height?, labels?, max?, tones?: ToneSpec<number, number>, showValues?, format?, fill?, reference?, interactive? })` | `top(i)`, `base(i)`, `yOf(v)` |
| `sampleSpace` | `sampleSpace(rows, cols, { id?, x?, y?, cell?, gap?, text?(r, c), tones?(r, c), interactive?, rowLabels?, colLabels? })` | `center(r, c)` |
| `diePips` | `diePips(face, x, y, { id, size?, tone? }): Scene` | |
| `probTree` | `probTree(root: { key, label, p?, children?, tone? }, { id?, x?, y?, levelGap?, leafGap?, showProducts?, format?(p), tones? })` | `pos(path)`, `leaves: { path, p }[]` |
| `venn2` | `venn2(a: Disc, b: Disc, { id?, labels?: [string, string], highlight?: VennRegion[], tone?, universe?: [x, y, w, h], interactive?, draggable?, hint? }): Scene`; `Disc` = `{ x, y, r }` | |
| `vennRegions`, `vennAreas`, `vennRegionAt` | `vennRegions(a, b)`: polygons for `aOnly`, `bOnly`, `both`; `vennAreas(a, b)`: `{ a, b, both, aOnly, bOnly }`; `vennRegionAt(p, a, b): VennRegion` | |

Types: `BarsOptions`, `BarsDiagram`, `SampleSpaceOptions`, `SampleSpaceDiagram`, `ProbNode`, `ProbTreeOptions`,
`ProbTreeDiagram`, `Disc`, `VennRegion` (`'aOnly' / 'bOnly' / 'both' / 'neither'`), `VennOptions`, `ToneSpec`,
`resolveTone`.

## @dsviz/geom

Figure parts in pixel coordinates.

| Export | Signature |
|---|---|
| `polygon` | `polygon(points: Vec[], { id?, tone?, labels?: string[], draggable?, fill?, width?, hint? }): Scene` |
| `segment` | `segment(a, b, { id (required), tone?, dashed?, width?, ticks?, label? }): Scene` |
| `tickMarks` | `tickMarks(a, b, count, { id, tone?, size? }): Scene` |
| `angleMark` | `angleMark(a, b, c, { id, r?, tone?, label?: string / boolean, rightSquare?, arcs? }): Scene`, the angle at `b`; a square at 90 degrees |
| `circle` | `circle(center, r, { id, tone?, dashed?, fill?, showCenter? }): Scene` |
| `pointLabel` | `pointLabel(p, s, { id, tone?, offset?, draggable?, hint?, data? }): Scene` |
| helpers | `angleAt(a, b, c)`, `toDegrees(rad)`, `dot`, `cross`, `lineIntersection(a, b, c, d)`, `circleIntersections(c1, r1, c2, r2)`, `footOfPerpendicular(p, a, b)`, `circumcircle(a, b, c)`, `incircle(a, b, c)`, `centroid(pts)`, `orthocenter(a, b, c)`, `signedArea(pts)`, `arcPoints(center, r, a0, a1, n)` |

Types: `PolygonOptions`, `SegmentOptions`, `AngleMarkOptions`.

## @dsviz/os

| Export | Signature | Returns |
|---|---|---|
| `simulate` | `simulate(procs: { id, arrival, burst, priority? }[], policy: 'fcfs' / 'sjf' / 'srtf' / 'rr' / 'priority', quantum = 2): Schedule` | `segments`, `ticks: { t, running, queue, done }[]`, `stats` (per process: start, completion, turnaround, waiting, response), `end`, `avgWaiting`, `avgTurnaround` |
| `gantt` | `gantt(segments: { id, start, end, lane?, label?, tone? }[], { id?, x?, y?, unit?, lanes?, laneHeight?, end?, now?, tones?, tickEvery?, arrivals?: Record<id, time> })`; with its own lane / label / tone per segment it is a general timeline | `xAt(t)`, `laneY(lane)`, `bottom` |
| `stackHeap` | `stackHeap(frames: { name, vars: { name, value: MemValue }[] }[], heap: { id, kind, items }[], { id?, x?, y?, frameWidth?, heapX?, rowHeight?, tones?, positions? })`; `MemValue` = number / string / boolean / null / `{ ref: heapId }` | `slot(frame, name)`, `object(id)` |
| `memory` | `memory({ id?, x?, y?, base?, bytes (required), byteWidth?, height?, groups?: { key, offset, size, value?, tone?, label? }[], digits?, addressEvery? })` | `xAt(offset)`, `top(key)`, `bottom(key)`, `byteTop(offset)` |
| `hex` | `hex(n, digits = 4): string` | |

Types: `Process`, `Policy`, `Segment`, `Tick`, `Stats`, `Schedule`, `GanttSegment`, `GanttOptions`, `GanttDiagram`,
`StackFrame`, `HeapObject`, `MemValue`, `StackHeapOptions`, `StackHeapDiagram`, `MemoryGroup`, `MemoryOptions`,
`MemoryDiagram`.

## @dsviz/arch

| Export | Signature |
|---|---|
| `architecture` | `architecture(components: Component[], links: Link[] = [], { id? = 'sys', zones?: Zone[] (outer first), interactive?, draggable?, route?: 'straight' / 'elbow', direction?: 'down' / 'right', rankGap?, nodeGap? }): Architecture` with `frame(id): Frame`, `along(from, to, t): Vec` |
| `component` | `component(c: Component, { id?, interactive?, draggable? }): Scene`, one box on its own |
| `zone` | `zone({ id, label, box: Box, padding?, tone? }): Scene`, a dashed boundary round any box |
| `packet` | `packet({ id, x, y, tone?, label?, r?, opacity? }): Scene`, a request dot; keep its id and it glides |
| `componentFrame` | `componentFrame(c): Frame`, the size a component will have |

`Component` = `{ id, kind, label, sub?, x?, y?, w?, h?, tone?, opacity? }` with `kind`: `client user lb gateway
service cache db queue cdn storage file` (role `sys-<kind>`). `Link` = `{ from, to, label?, dashed?, tone?, both?,
plain?, via?: Vec[] }`. `Zone` = `{ id, label, around: string[], padding?, tone? }`.
Types: `ComponentKind`, `Component`, `Link`, `Zone`, `ArchitectureOptions`, `Architecture`.

## @dsviz/uml

Eleven diagrams. Every one returns a `Scene` plus `box(id)` or `frame(id)` (a `Frame`: centre + size), so
you can connect and hit-test. Boxes without x/y are placed by `layered`.

Shared options on the box-and-line diagrams: `id?`, `interactive?` (clicks report `e.node.data`),
`draggable?`, `dim?: ReadonlySet<string>` (ids to fade), `rankGap?`, `nodeGap?`, `route?: 'elbow' / 'straight'`.

### Sequence, state, class

| Export | Signature and options | Returns |
|---|---|---|
| `sequence` | `sequence(participants: { id, label, kind?: 'object' / 'actor' }[], messages: { from, to, label, kind?: 'call' / 'return' / 'async', tone?, parent? }[], { id? = 'seq', upTo?, gap? = 150, row? = 44, numbered?, tone?, fragments?, notes?, activations? = true, highlight? = true })` | `x(participantId)`, `rowY(i)` |
| `activations` | `activations(messages, fragments?): { participant, depth, start, end }[]`, the bars, from the call stack | |
| `stateMachine` | `stateMachine(states: { id, label?, x?, y?, kind?: 'state' / 'initial' / 'final' / 'choice', tone? }[], transitions: { from, to, label?, bend? }[], { id? = 'fsm', current?, fired?, interactive?, draggable?, direction?: 'down' / 'right', rankGap?, nodeGap? })` | `frame(id)` |
| `classDiagram` | `classDiagram(classes: { id, name, x?, y?, stereotype?, abstract?, attributes?: string[], methods?: string[], tone?, width? }[], relations: { from, to, kind, label?, fromLabel?, toLabel?, tone? }[], { id? = 'uml', collapsed?, interactive?, draggable?, route?, dim?, rankGap?, nodeGap? })`; `kind`: `inherits implements composition aggregation association dependency` | `box(id)` |

Sequence `fragments`: `{ kind: 'loop' / 'alt' / 'opt' / string, label?, from, to (message indices), over?: [a, b], sections?: { label, from, to }[] }[]`.
Sequence `notes`: `{ over: id / [a, b], text, at, tone? }[]`, a note takes its own row before message `at`.

### Use case, activity, component, deployment, ER

| Export | Signature and options | Returns |
|---|---|---|
| `useCase` | `useCase(actors: { id, name, x?, y?, side?: 'left' / 'right', tone? }[], cases: { id, name, x?, y?, tone? }[], relations: { from, to, kind: 'association' / 'include' / 'extend' / 'generalization', tone? }[], { id?, system?: { name, tone? }, interactive?, draggable?, dim?, rankGap?, nodeGap? })` | `frame(id)`, `box(id)`, `frames`, `boundary?` |
| `activity` | `activity(nodes: { id, kind?: ActivityKind, label?, lane?, x?, y?, tone? }[], flows: { from, to, guard?, tone? }[], { id?, swimlanes?: { id, name, tone? }[], direction?: 'down' / 'right', current?: string / Set<string>, taken?: number / Set<number>, interactive?, draggable?, rankGap?, nodeGap? })`; `ActivityKind`: `action decision merge fork join start end flowFinal` | `frame(id)`, `box(id)`, `frames`, `lanes` |
| `component` | `component(components: { id, name, x?, y?, stereotype?, provides?, requires?: (string / { name, side? })[], ports?: { id, name?, side?, at?, x?, y? }[], parent?, tone?, width? }[], connections: { from, to, kind: 'assembly' / 'dependency' / 'delegate', interface?, label?, tone? }[], { id?, direction?: 'right' / 'down', interactive?, draggable?, dim?, route?, rankGap?, nodeGap? })`; `from` / `to` may be a component or port id; assembly goes requirer to provider (the plug is drawn halfway between the boxes); a delegate with `interface` points at that lollipop; `COMPONENT` holds the sizes, `componentSize(c)` a box's | `frame(id)`, `box(id)`, `frames` |
| `deployment` | `deployment(nodes: { id, name, stereotype?, parent?, x?, y?, tone? }[], artifacts: { id, name, node, tone? }[], links: { from, to, kind?: 'communication' / 'deploy', protocol?, label?, tone? }[], { id?, interactive?, draggable?, route?, direction?: 'right' / 'down', rankGap?, nodeGap? })`; `x`/`y` is the centre of the front face; `DEPLOY`, `NODE_DEPTH` hold the sizes, `headHeight(node)` the title band | `box(id)` |
| `er` | `er(entities: { id, name, x?, y?, attributes?: { name, type?, key?: 'primary' / 'foreign', nullable? }[], weak?, tone?, width? }[], relationships: { id?, from, to, fromCard?, toCard?, label?, identifying?, tone? }[], { id?, collapsed?, interactive?, draggable?, dim?, rankGap?, nodeGap? })`; crow's foot, `Cardinality`: `one many zero-one zero-many one-many` | `box(id)`, `relationshipIds` |

### Parts and tables

| Export | Notes |
|---|---|
| `stickFigure`, `figureFrame`, `FIGURE` | the actor figure on its own: `stickFigure({ id, x, y, name?, tone?, opacity?, interactive?, draggable?, data? })`, its `Frame`, its size |
| `RELATION_STYLE`, `USE_CASE_STYLE`, `PACKAGE_RELATION` | relation kind to line style and end markers, as data |
| `classSize`, `erSize`, `erPort`, `ER_HEAD`, `MARKER_LENGTH`, `caseSize`, `activitySize`, `flowRoute`, `stateFrame`, `headSize`, `participantHead`, `cardinalityMarker`, `relationshipIds`, `ellipsePoints`, `NODE_DEPTH`, `TAB_H` | sizing and drawing helpers the layouts share; useful when you hand-build a box in the same style |

Types: `Participant`, `Message`, `Note`, `Activation`, `Fragment`, `FragmentSection`, `SequenceOptions`,
`SequenceDiagram`, `HeadOptions`,
`UmlState`, `Transition`, `StateMachineOptions`, `StateMachine`, `UmlClass`, `Relation`, `RelationKind`,
`ClassDiagramOptions`, `ClassDiagram`,
`UseCaseActor`, `UseCaseOval`, `UseCaseRelation`, `UseCaseRelationKind`, `UseCaseOptions`,
`UseCaseDiagram`, `ActivityKind`, `ActivityNode`, `ActivityFlow`, `Swimlane`, `ActivityOptions`, `ActivityDiagram`,
`Side`, `UmlInterface`, `UmlPort`, `UmlComponent`, `Connection`, `ConnectionKind`, `ComponentOptions`,
`ComponentDiagram`, `DeployNode`, `Artifact`, `DeployLink`, `DeploymentOptions`, `Deployment`,
`ErAttribute`, `ErEntity`,
`Cardinality`, `ErRelationship`, `ErOptions`, `ErDiagram`, `StickFigureOptions`.

Sequence behaviour in detail (returns, self-calls, alt branches, note rows): SKILL.md "Sequence diagrams".

## @dsviz/git

| Export | Signature |
|---|---|
| `graph` | `graph(commits: { hash, parents: string[] (first parent first), label?, tone?, date?, authorDate?, kind?: 'commit' / 'wip' / 'stash' }[] (NEWEST FIRST), refs: { name, hash, kind: 'branch' / 'remote' / 'tag' / 'head' }[] = [], { id? = 'git', highlight?: Iterable<hash>, lanes? = 'straight' / 'compact', pin?: hash[], fold?: Iterable<hash>, maxLanes?, bend? = 'curve' / 'corner' / 'angle', interactive?, rowH? = 34, laneW? = 22, r? = 6, x?, y?, tones?: Tone[] }): GitGraph` with `pos(hash): Vec`, `lane(hash)`, `row(hash)`, `lanes`, `labelX`, `hidden: Set<hash>` (folded away), `rows: hash[]`. Commits are keyed by hash; click events carry `data: { hash }`. Import as `graph as gitGraph` next to ds |
| `gitLanes` | `gitLanes(commits, { lanes?, pin?, fold? }): { hash, row, lane, color, edges: { parent, lane, row, via: number[], color }[], folded? }[]`, the lane walk on its own. `via` is the column the edge holds in each row between child and parent; `color` is the line's colour index (its column with straight lanes) |
| `orderCommits` | `orderCommits(commits, 'author-date' / 'commit-date' / 'topo'): Commit[]`, newest first. The date orders can put a parent above its child; `topo` (a temporal topological sort, what `git log --date-order` does) never does |
| `foldedCommits` | `foldedCommits(commits, fold): Set<hash>`, the commits reachable from a folded merge's other parents but not from its first |

Layout options: `lanes: 'straight'` (default) keeps a finished column as an empty slot for the next branch,
so no line moves sideways (GitKraken); `'compact'` opens a merged branch's column beside the merge and
removes finished columns, so neighbours shift and bend (Git Extensions, gitk). `pin: [tip, ...]` holds
the leftmost columns for those branches' first-parent lines wherever their tips are (GitGoose's trunk
column). `fold` hides a merged branch behind its merge, drawn as a hollow ring with a plus (role
`git-fold`). `maxLanes` cuts the columns past it and marks each row they cross with a `~` (role
`git-cut`), as `git log --graph-lane-limit` does. `kind: 'wip'` draws the uncommitted changes as a
dashed node with a dashed line to HEAD; `kind: 'stash'` a dashed card.

Types: `Commit`, `Ref`, `LaneStyle`, `LaneOptions`, `GitGraphOptions`, `LaneEdge`, `LanePlacement`, `GitGraph`, `CommitOrder`.

## @dsviz/react

```tsx
<Diagram scene={Scene}
  size?: 'natural' / 'fill' = 'natural'  scale?  height? (fill mode)
  viewBox?: 'auto' / ViewBox  camera?: 'grow' / 'fit'  padding?  duration?  ease?
  onClick? onDragStart? onDrag? onDragEnd?  (e: ViewEvent) => void
  className?  label?: string (aria-label)  injectStyles?: boolean = true  crossfade?: boolean />
```

| Export | Signature |
|---|---|
| `usePlayer` | `usePlayer(makeFrames: () => Iterable<S>, deps, { interval? = 700, loop?, maxFrames?, start?: 'first' / 'end' }): PlayerState<S>` = `{ frame, frames, index, count, playing, next(), prev(), first(), seek(i), toggle(), play(), pause() }`; `makeFrames` runs on mount and again when `deps` change (resets to step 0); a generator function works as is; `frame` is `undefined` only if it yields nothing |
| `useTicker` | `useTicker(ms, active = true): number`, a counter that increments every `ms` |
| `useBurst` | `useBurst(lifetime = 650): [nodes, fire(x, y, { count?, radius? })]` |
| `useScene` | `useScene(build, deps)`, just `useMemo` |
| `Transport` | `<Transport player={player} />`: first / play / next + scrubber with ticks and "Step i / n" |
| `CodeTrace` | `<CodeTrace lines={string[]} active={number / number[] / null} />`, source lines with the current one highlighted (HTML, beside the diagram) |
| `Slider` | `<Slider value onChange min max step? label? format?(v) ticks?: number[] className? />` |
| `Segmented` | `<Segmented value onChange options={(T / { value, label })[]} label? />` |
| `Select` | `<Select value onChange options={(T / { value, label })[]} label? />` |
| `Switch` | `<Switch checked onChange label? />` |
| `NumberStepper` | `<NumberStepper value onChange min? max? step? label? />` |
| `Button` | `<Button onClick variant?: 'ghost' / 'primary' disabled? title?>…</Button>` |
| `TextInput` | `<TextInput value onCommit label? width? placeholder? />`, commits on blur / Enter |
| `MathText` | `<MathText tex="a^2 + b^2" />`, the same typesetting as `role: 'math'`, in HTML |

Types: `DiagramProps`, `PlayerState`, `UsePlayerOptions`, `SliderProps`, `SegmentedProps`, `SelectProps`,
`NumberStepperProps`, `TransportProps`, `ButtonProps`, `TextInputProps`.
