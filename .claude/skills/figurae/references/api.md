# figurae API reference

Signatures of everything exported. One package per family, each exporting flat: `@figurae/core`, `@figurae/ds`, `@figurae/uml` (`sequence`),
`@figurae/arch` (`architecture`), `@figurae/git` (`graph`, aliased `gitGraph` below), `@figurae/layout` (`layered`),
`@figurae/plot` (`fn`), `@figurae/prob` (`bars`), `@figurae/geom` (`polygon`), `@figurae/os` (`gantt`, `stackHeap`),
`code.block`. React pieces come from `@figurae/react`. Every option not marked required is optional.

Common types:

```ts
type Vec = { x: number; y: number };
type Key = string | number;
type Tone = 'default' | 'active' | 'accent' | 'success' | 'danger' | 'visited' | 'orange' | 'muted' | 'ghost' | string;
type ToneSpec<K, V> = Record<string, Tone> | ((key: K, value: V) => Tone | undefined);   // { 2: 'active' } or a function
type Part = Scene | SceneNode | Part[] | null | undefined | false;
interface Box { x: number; y: number; w: number; h: number }          // top-left + size
interface Frame { x: number; y: number; w: number; h: number }        // CENTRE + size
```

## Core

### Scene and primitives

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

circle({ id, x, y, r, ... })                                   // centred
rect({ id, x, y, w, h, rx?, ... })                             // CENTRED on x, y
text({ id, x, y, text, size?, anchor?: 'start'|'middle'|'end', weight?, ... })  // role 'math' typesets TeX-lite
arrow({ id, x1, y1, x2, y2, bend?, head?: boolean, width?, ... })
path({ id, points: [x, y][], closed?, smooth?, dots?, width?, ... })

combine(...parts: Part[]): Scene                 // flatten, skipping falsy parts
translate(part, dx, dy): Scene
namespace(part, prefix): Scene                   // prefix every id: 'left/arr:cell:0'
style(part, { tone?, role?, opacity?, dashed? }): Scene
bounds(part): Box        nodeBounds(node): Box
estimateTextWidth(s: string, size: number): number   // s.length * size * 0.6
circleEdge(center, toward, r): Vec
```

### Connectors

```ts
connector({
  id: string; from: Vec | Frame; to: Vec | Frame;
  route?: 'straight' | 'elbow'; via?: Vec[];        // via overrides route
  start?: End; end?: End;                           // End = 'none'|'arrow'|'open'|'triangle'|'diamond'|'diamond-filled'; end defaults to 'arrow'
  dashed?, tone?, width?, label?, startLabel?, endLabel?, gap?, opacity?
}): Scene & { points: Vec[]; along(t: number): Vec }
rectEdge(frame, toward): Vec        route(from, to, kind?, gap?): Vec[]        pointAlong(points, t): Vec
```

### Rendering

```ts
createView(svg: SVGSVGElement, {
  duration?: number = 420; ease?; viewBox?: 'auto' | [x, y, w, h]; camera?: 'grow' | 'fit';
  size?: 'natural' | 'fill'; scale?: number; padding?: number = 24;
  injectStyles?: boolean = true; crossfade?: boolean = true
}): View
View: { render(scene, { duration?, camera?: boolean }), setViewBox(v), on(type, handler) → off,
        toWorld(clientX, clientY): Vec, destroy(), svg, scene }
ViewEvent: { type: 'click'|'dragstart'|'drag'|'dragend', id, node, x, y, original, keyboard? }

toSVG(scene, { padding?: 24, embedStyles?: true, width?, theme?: 'light'|'dark', background?: boolean }): string
fitViewBox(parts, pad = 24): [x, y, w, h]        // the union of every frame, for a fixed camera
nextCamera(current, content, mode)               // the 'grow' camera rule
injectStyles(doc?)   DEFAULT_CSS: string   THEME_VARS: { light: string; dark: string }
createPlayer(frames: Iterable<S>, { interval?, loop?, onFrame? }): Player<S>
handle({ id, x, y, r?, hit?, tone?, data?, draggable?, hint? }): CircleNode[]   // draggable dot + big hit target
burst({ id, x, y, ... }): CircleNode[]                                          // particles
V2(x, y), vadd, vsub, vscale, vlen, vdist, vnorm, vperp, vlerp, dot, cross
```

## @figurae/react

```tsx
<Diagram scene={Scene}
  size?: 'natural' | 'fill' = 'natural'  scale?  height? (fill mode)
  viewBox?: 'auto' | [x, y, w, h]  camera?: 'grow' | 'fit'  padding?  duration?  ease?
  onClick? onDragStart? onDrag? onDragEnd?  (e: ViewEvent) => void
  className?  label?: string (aria-label)  injectStyles?: boolean = true  crossfade?: boolean />

usePlayer(makeFrames: () => Iterable<S>, deps, { interval?=700, loop?, start?: 'first' (default) | 'end' }): {
  // makeFrames runs on mount and again when deps change (resets to step 0); a generator function works as is
  frame: S | undefined; frames: S[]; index; count; playing; next(); prev(); first(); seek(i); toggle(); play(); pause() }
useTicker(ms, active?): number          useBurst(lifetime?): [nodes, fire(x, y, opts?)]

<Transport player={player} />           <CodeTrace lines={string[]} active={number | number[]} />
<Slider value onChange min max step? label? format? ticks? />    <Segmented value onChange options={[{ value, label }]} />
<Select value onChange options label? />   <Switch checked onChange label? />   <NumberStepper value onChange min? max? step? label? />
<Button onClick variant?: 'ghost' | 'primary' disabled? title?>…</Button>    <TextInput value onCommit label? width? placeholder? />
<MathText tex="a^2 + b^2" />
```

## Exported types, by package

Every family exports its data and option types: `Participant`, `Message`, `Fragment`,
`FragmentSection`, `Note`, `SequenceOptions`, `UmlClass`, `Relation`,
`RelationKind`, `UmlState`, `Transition`; `Component`, `ComponentKind`, `Link`,
`Zone`, `ArchitectureOptions`; `Commit`, `Ref`, `GitGraphOptions`;
`code.CodeBlockOptions`; `LayeredNode`, `LayeredEdge`, `LayeredOptions`; top level:
`Scene`, `SceneNode`, `Tone`, `Part`, `Box`, `Vec`, `GraphNodeSpec`, `GraphEdgeSpec`, `GraphOptions`,
`TreeNode`, `BinaryTreeNode`, `ArrayOptions`, `ViewEvent`, `DiagramSpec` (from `@figurae/spec`, and `SequenceSpec`, `GitSpec`…),
`SpecError`. From `@figurae/react`: `PlayerState`, `DiagramProps`.

## @figurae/ds (data structures)

Note: `tones` on `array` is keyed by **index** (`{ 2: 'active' }` or `(i, value) => …`), not by the
`keys` entry; `keys` only decides identity for animation.

```ts
array(values: T[], { id?='arr', x?, y? (top-left), cell?=48, gap?=6, keys?: Key[], tones?: ToneSpec<number, T>,
  showIndices?, format?(v, i), vertical?, enterOffset?, exitOffset?, interactive? }): ArrayDiagram
  // anchors: center/top/bottom/left/right(i), window(lo, hi, { id?, tone?, pad? }): Part, length, cell
pointer({ id, at: Vec, label?, side?: 'top'|'bottom'|'left'|'right', length?=26, gap?=4, level?, tone? }): Scene
stack(values, ArrayOptions) / queue(values, ArrayOptions): ArrayDiagram
hashMap(entries: Map | [key, value][] | Key[] (a set), { id?, x?, y?, keyWidth?, valueWidth?, row?, tones?: ToneSpec<Key, V>,
  formatKey?, formatValue?, title?, empty?, set? }): { size, keyAt(k), valueAt(k), left(k), right(k) }
linkedList(nodes: { key, value, next: Key | null, tone? }[], { id?, x?, y?, w?, h?, gap?, order?, arrowTones? })
  // anchors center/top/bottom(key), slot(i);  listFromValues(values, prefix?)
binaryTree(root: { key, label?, left?, right? }, { id?, x?, y?, r?=20, dx?=46, dy?=66, tones?, edgeTones?,
  interactive?, showNulls?, layout?: 'inorder' | 'tidy' }): { pos(key), top, bottom, left, right }
  // treeFromLevelOrder([3, 9, 20, null, null, 15, 7])
tree(root: { key, label?, children?: TreeNode[] }, { id?, x?, y?, r?=20, shape?: 'circle' | 'rect', gap?=14, dy?=66,
  layout?: 'tidy' | 'leaves', tones?, edgeTones?, interactive? }): { pos(key), top(key), bottom(key) }
graph(nodes: { id: Key, label?, x?, y?, tone?, kind?: string }[], edges: { from, to, label?, tone?, directed?, bend? }[], {
  id?='graph', r?=22, shape?: 'circle' | 'rect', directed?, draggable?, interactive?,
  layout?: 'circle' | 'layered' (default circle), direction?: 'down' | 'right', rankGap?, nodeGap?,
  route?: 'straight' | 'elbow', cx?, cy?, radius? }): { pos(id), top(id), bottom(id) }
  // kind → role 'node-<kind>'; styled kinds: changed, upstream, downstream, test.  graphNodeSize(n, o)
grid(rows: T[][], { id?, x?, y?, cell?=40, cellWidth?, cellHeight?, gap?, tones?(r, c, v), rowLabels?, colLabels?,
  format?, interactive? }): { center/top/bottom/left/right(r, c) }
```

## @figurae/uml

```ts
sequence(participants: { id, label (required here; optional in a spec), kind?: 'object' | 'actor' }[],
  messages: { from, to, label, kind?: 'call' | 'return' | 'async', tone? }[], {
  id?='seq', upTo?: number, gap?=150, row?=44, numbered?, tone?,
  fragments?: { kind: string, label?, from, to, over?: [a, b], sections?: { label, from, to }[] }[],
  notes?: { over: id | [a, b], text, at, tone? }[],   // a note takes its own row before message `at`
  activations?: boolean = true, highlight?: boolean = true }): { x(id), rowY(i) }
  // upTo: inclusive message index; gap is fixed (widen it for long labels); tone: the step highlight's tone
  // full behaviour (returns, self-calls, async, alt branches, note rows): SKILL.md "Sequence diagrams" 
activations(messages, fragments?): { participant, depth, start, end }[]
classDiagram(classes: { id, name, x?, y?, stereotype?, abstract?, attributes?: string[], methods?: string[], tone?, width? }[],
  relations: { from, to, kind: 'inherits'|'implements'|'composition'|'aggregation'|'association'|'dependency',
  label?, fromLabel?, toLabel?, tone? }[], { id?='uml', collapsed?, interactive?, draggable?, route?: 'elbow'|'straight',
  dim?: Set<string>, rankGap?, nodeGap? }): { box(id): Frame }
  // classes without x/y: layered, parents above children. RELATION_STYLE, classSize(c)
stateMachine(states: { id, label?, x?, y?, kind?: 'state'|'initial'|'final'|'choice', tone? }[],
  transitions: { from, to, label?, bend? }[], { id?='fsm', current?, fired?: number, interactive?,
  direction?, rankGap?, nodeGap? }): { frame(id) }
```

## @figurae/arch

```ts
architecture(components: { id, kind: 'client'|'user'|'lb'|'gateway'|'service'|'cache'|'db'|'queue'|'cdn'|'storage'|'file',
  label, sub?, x?, y?, w?, h?, tone?, opacity? }[],
  links: { from, to, label?, dashed?, tone?, both?, plain?, via?: Vec[] }[], {
  id?='sys', zones?: { id, label, around: string[], padding?, tone? }[]  (outer zones first),
  interactive?, draggable?, route?, direction?: 'right' (default) | 'down', rankGap?, nodeGap? }
): { frame(id), along(from, to, t): Vec }
component(c, opts) · zone({ id, label, box, padding?, tone? }) · packet({ id, x, y, tone?, label?, r? })
```

## @figurae/git

```ts
graph(commits: { hash, parents: string[] (first parent first), label?, tone? }[]  // NEWEST FIRST
  refs?: { name, hash, kind: 'branch' | 'remote' | 'tag' | 'head' }[], {
  id?='git', highlight?: Iterable<hash>, rowH?=34, laneW?=22, r?=6, x?, y?, tones?: Tone[] }
): { pos(hash), lane(hash), row(hash), lanes: number, labelX: number }
gitLanes(commits): { hash, row, lane, edges: { parent, lane, row }[] }[]
```

## code.*

```ts
block(source: string | string[], { id?='code', x?, y?, highlight?: [from, to][] (1-based, inclusive), tone?='active',
  numbers?=true, start?=1, size?=13, lineHeight?, width?, language?, dimOthers? }
): { line(n): Vec, right(n): Vec, box: Box }
```

## @figurae/layout

```ts
layered(nodes: { id, w?, h? }[], edges: { from, to }[], { direction?: 'down'|'right', rankGap?=56, nodeGap?=28,
  sweeps?=6, x?, y? }): { pos(id), rank(id), layers: string[][], reversed: Set<'from>to'>,
  path(from, to): Vec[], route(from, to, 'straight' | 'elbow'): Vec[], box, crossings }
tidy(root, children: (n) => (T | null)[], { width?(n), gap?=16, slot?=40 }): { node, x, depth, parent }[]
pack(want: number[], sep: number[]): number[]          // closest ordered positions with minimum gaps
```

## Spec (top level)

```ts
validateSpec(x: unknown): { ok: boolean; errors: { path: string; message: string }[]; spec?: DiagramSpec }
fromSpec(spec, { id? }): Scene              // throws on an invalid spec
describeSpec(spec: DiagramSpec): string     // alt text
formatSpecErrors(errors): string
DIAGRAM_TYPES, SPEC_TONES, SPEC_LIMITS = { items: 200, text: 400 }
```
See `spec.md` for the spec itself.

## @figurae/plot

```ts
plane({ x: [min, max], y: [min, max], width?, height? }): Plane   // sx, sy, toPx, toWorld, clamp, viewBox(pad?)
axes(p, { id?, xTicks?, yTicks?, grid?, labels?, xLabel?, yLabel? })   fn(p, f, { id?, tone?, width?, samples?, domain?, dashed? })   point(p, x, y, { id, label?, tone?, draggable?, r?, labelOffset?, hint? })
segment(p, a, b, { id, ... })   vector(p, from, to, { id, label? })   label(p, x, y, s, { id, ... })
tangent(p, f, x0, { id, span? }): Scene & { slope }   area(p, f, a, b, { id?, tone? })
riemann(p, f, a, b, n, 'left'|'right'|'mid'|'trap', { id?, tone? }): Scene & { sum }
integrate(f, a, b, n?)   derivative(f, x, h?)   niceTicks(lo, hi, target?)
```

## @figurae/prob, @figurae/geom, @figurae/os

```ts
bars(values, { labels?, max?, tones?, showValues?, reference?, ... }): { top(i), base(i), yOf(v) }
sampleSpace(rows, cols, { text?(r, c), tones?(r, c), ... })   diePips(face, x, y, { id })
probTree(root: { key, label, p?, children? }): { leaves: { path, p }[] }
venn2(a: { x, y, r }, b, opts) · vennRegions · vennAreas · vennRegionAt
polygon(points, { id?, draggable?, ... }) · segment(a, b, { id }) · tickMarks(a, b, count, { id })
angleMark(a, b, c, { id, ... }) · circle(center, r, { id }) · pointLabel(p, s, { id })
angleAt · lineIntersection · circleIntersections · footOfPerpendicular · circumcircle · incircle · centroid · orthocenter · signedArea · arcPoints
simulate(procs: { id, arrival, burst, priority? }[], 'fcfs'|'sjf'|'srtf'|'rr'|'priority', quantum?)
gantt(segments: { id, start, end, lane?, label?, tone? }[], { unit?, lanes?, now?, tones?, arrivals? }): { xAt(t), laneY(lane), bottom }
stackHeap(frames: { name, vars: { name, value }[] }[], heap: { id, kind, items }[], opts): { slot(frame, name), object(id) }
memory(opts) · hex(n, digits?)
```
