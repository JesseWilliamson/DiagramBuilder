# figurae recipes

Each recipe is complete: copy, then change the data. Imports show which package owns each symbol.

## 1. A sequence diagram from a call trace

A trace is a list of calls with depths (from logs, a profiler, or a debugger). Turn each call into a
`call` message and each finished call into a `return`, so the activation bars come out right.

```ts
import { Message, sequence } from '@figurae/uml';

type Call = { caller: string; callee: string; fn: string; result?: string; children?: Call[] };

function toMessages(call: Call, out: Message[] = []): Message[] {
  out.push({ from: call.caller, to: call.callee, label: call.fn });
  for (const c of call.children ?? []) toMessages(c, out);
  // a self-call is drawn as a loop and needs no return
  if (call.caller !== call.callee) out.push({ from: call.callee, to: call.caller, label: call.result ?? '', kind: 'return' });
  return out;
}

const trace: Call = { caller: 'web', callee: 'api', fn: 'POST /orders', result: '201', children: [
  { caller: 'api', callee: 'db', fn: 'insert order', result: 'id 42' },
  { caller: 'api', callee: 'api', fn: 'validate()' },
] };
const messages = toMessages(trace);
const ids = [...new Set(messages.flatMap((m) => [m.from, m.to]))];      // participants in order of appearance
const scene = sequence(ids.map((id) => ({ id, label: id })), messages, { highlight: false });
```

To step through it, pass `upTo: i` and keep the camera fixed: `fitViewBox(sequence(…all…))`.

## 2. Architecture with zones

```ts
import { Component, Link, Zone, architecture } from '@figurae/arch';

const parts: Component[] = [
  { id: 'user', kind: 'user', label: 'Customer' },
  { id: 'cdn', kind: 'cdn', label: 'CDN' },
  { id: 'lb', kind: 'lb', label: 'Load balancer' },
  { id: 'api', kind: 'service', label: 'API', sub: 'x3' },
  { id: 'q', kind: 'queue', label: 'Jobs' },
  { id: 'db', kind: 'db', label: 'Orders', sub: 'Postgres' },
];
const links: Link[] = [
  { from: 'user', to: 'cdn' }, { from: 'cdn', to: 'lb' }, { from: 'lb', to: 'api' },
  { from: 'api', to: 'db' }, { from: 'api', to: 'q', dashed: true, label: 'async' },
];
const zones: Zone[] = [
  { id: 'cloud', label: 'AWS account', around: ['lb', 'api', 'q', 'db'] },   // outer zone first
  { id: 'private', label: 'private subnet', around: ['api', 'q', 'db'], tone: 'accent' },
];
const scene = architecture(parts, links, { zones, route: 'elbow' });  // no x/y: laid out left to right
```

Animate a request: keep a packet's id and move it with `a.along('lb', 'api', t)` between renders.

## 3. A layered DAG (dependencies, blast radius)

```ts
import { graph } from '@figurae/ds';

const nodes = [
  { id: 'parseConfig', kind: 'changed' }, { id: 'loadSettings', kind: 'downstream' },
  { id: 'startServer', kind: 'downstream' }, { id: 'readFile', kind: 'upstream' }, { id: 'config.test', kind: 'test' },
];
const edges = [
  { from: 'readFile', to: 'parseConfig' }, { from: 'parseConfig', to: 'loadSettings' },
  { from: 'loadSettings', to: 'startServer' }, { from: 'parseConfig', to: 'config.test' },
];
const scene = graph(nodes, edges, { layout: 'layered', shape: 'rect', directed: true, route: 'elbow', interactive: true });
// <Diagram scene={scene} onClick={(e) => openFile((e.node.data as { id: string }).id)} />
```

Colour comes from `kind` via the stylesheet (`.dv-role-node-changed` …); add your own kinds with CSS:
`.dv-role-node-flaky { --dv-k: var(--dv-orange-fill); --dv-ko: var(--dv-orange-outline); }`.
Need only positions (to draw something else)? `layered(nodes, edges).pos(id)`.

## 4. A git graph: what a rebase does

```ts
import { Commit, Ref, graph as gitGraph } from '@figurae/git';

const before: Commit[] = [
  { hash: 'c3', parents: ['c2'], label: 'Fix login redirect' },
  { hash: 'f2', parents: ['f1'], label: 'Add dark theme' },
  { hash: 'f1', parents: ['c2'], label: 'Extract tokens' },
  { hash: 'c2', parents: ['c1'], label: 'Cache profile' },
  { hash: 'c1', parents: [], label: 'Initial commit' },
];
const after: Commit[] = [
  { hash: "f2'", parents: ["f1'"], label: 'Add dark theme' },
  { hash: "f1'", parents: ['c3'], label: 'Extract tokens' },
  ...before.filter((c) => !c.hash.startsWith('f')),
];
const refs = (tip: string): Ref[] => [{ name: 'feature', hash: tip, kind: 'branch' }, { name: 'main', hash: 'c3', kind: 'branch' }];
const draw = (rebased: boolean) =>
  rebased ? gitGraph(after, refs("f2'"), { highlight: ["f1'", "f2'"] }) : gitGraph(before, refs('f2'));
```

Commits are keyed by hash, so rendering `draw(false)` and then `draw(true)` animates: rebased commits are new dots.

## 5. A before / after array

Two copies of one family in one scene need different ids; keys that follow the values make a change
readable, and the same `draw` for both keeps the layout identical.

```ts
import { combine, text, translate } from '@figurae/core';
import { array } from '@figurae/ds';

const draw = (id: string, values: number[], keys: string[], y: number, title: string, lit: number[]) =>
  combine(
    text({ id: `${id}:title`, x: 0, y: y - 18, text: title, anchor: 'start', role: 'caption' }),
    array(values, { id, y, keys, tones: (i) => (lit.includes(i) ? 'active' : undefined) }),
  );
const scene = combine(
  draw('before', [5, 2, 9, 1], ['a', 'b', 'c', 'd'], 0, 'Before', []),
  draw('after', [1, 2, 5, 9], ['d', 'b', 'a', 'c'], 110, 'After sorting', [0, 3]),
);
```

For a single array that changes in place (one diagram, two states), render the same `id` with new
values and the same `keys`: cells slide to their new places.

## 6. Draggable boxes that snap

Drag a class box and it pulls to a 10-unit grid and to the edges and centres of the other boxes, with a
faint guide where it caught. Positions live in state and are fed back as `x`/`y`.

```tsx
import { useState } from 'react';
import { combine, fitViewBox, snapGuides } from '@figurae/core';
import { Diagram, useSnap } from '@figurae/react';
import { Relation, UmlClass, classDiagram } from '@figurae/uml';

const classes: UmlClass[] = [
  { id: 'Shape', name: 'Shape', stereotype: 'interface', x: 200, y: 50, methods: ['+ area(): number'] },
  { id: 'Circle', name: 'Circle', x: 70, y: 220, attributes: ['- r: number'] },
  { id: 'Square', name: 'Square', x: 330, y: 220, attributes: ['- side: number'] },
];
const relations: Relation[] = [
  { from: 'Circle', to: 'Shape', kind: 'implements' },
  { from: 'Square', to: 'Shape', kind: 'implements' },
];
const viewBox = fitViewBox(classDiagram(classes, relations), 40);       // fixed camera: the dragged box must not move the frame

export function Draggable() {
  const [where, setWhere] = useState(Object.fromEntries(classes.map((c) => [c.id, { x: c.x!, y: c.y! }])));
  const diagram = classDiagram(classes.map((c) => ({ ...c, ...where[c.id] })), relations, { draggable: true });
  // the frames of the boxes as drawn NOW; snap() leaves the moving one out of its own candidates
  const { guides, snap, clear } = useSnap(Object.fromEntries(classes.map((c) => [c.id, diagram.box(c.id)])), { grid: 10 });
  return (
    <Diagram
      scene={combine(diagram, snapGuides(guides))}
      viewBox={viewBox}
      onDrag={(e) => {
        const id = (e.node.data as { class?: string })?.class;
        if (id) setWhere((w) => ({ ...w, [id]: snap(id, e) }));      // e carries x, y: a Vec
      }}
      onDragEnd={clear}
    />
  );
}
```

Without React, call `snapFrame(diagram.box(id) moved to the pointer, otherFrames, { grid: 10 })` from
`@figurae/core` and draw `snapGuides(result.guides)`. For nested things (deployment nodes, packages) pass
only the top-level boxes: the children travel with their parent. Other diagrams use the same code with a
different `e.node.data` key (`node`, `object`, `package`, `component`).

## 7. A step-through activity diagram

The walk is data: each step names the current node(s) and the flows taken so far. The layout never
changes, so one fixed camera fits every step.

```tsx
import { useMemo } from 'react';
import { fitViewBox } from '@figurae/core';
import { Diagram, Transport, usePlayer } from '@figurae/react';
import { ActivityFlow, ActivityNode, activity } from '@figurae/uml';

const nodes: ActivityNode[] = [
  { id: 'start', kind: 'start' }, { id: 'read', label: 'Read request' }, { id: 'ok', kind: 'decision' },
  { id: 'save', label: 'Save order' }, { id: 'err', label: 'Return 400' }, { id: 'done', kind: 'end' },
];
const flows: ActivityFlow[] = [
  { from: 'start', to: 'read' },                    // 0
  { from: 'read', to: 'ok' },                       // 1
  { from: 'ok', to: 'save', guard: 'valid' },       // 2
  { from: 'ok', to: 'err', guard: 'invalid' },      // 3
  { from: 'save', to: 'done' },                     // 4
  { from: 'err', to: 'done' },                      // 5
];

// [node that is current, flows taken to get there] in order
const steps: Array<[string, number[]]> = [['start', []], ['read', [0]], ['ok', [0, 1]], ['save', [0, 1, 2]], ['done', [0, 1, 2, 4]]];
const draw = (i?: number) => activity(nodes, flows, i === undefined ? {} : { current: steps[i][0], taken: new Set(steps[i][1]) });

export function Walk() {
  const player = usePlayer(() => steps.map((_, i) => i), []);
  const viewBox = useMemo(() => fitViewBox(draw(), 16), []);
  return (
    <>
      <Diagram scene={draw(player.frame)} viewBox={viewBox} label="Order handling, step by step" />
      <Transport player={player} />
    </>
  );
}
```

Parallel branches: `current` takes a `Set` of ids. Swimlanes: pass `swimlanes: [{ id, name }]` and a `lane`
id on each node. A generator that yields `{ current, taken, say }` (as `Step`) works the same way and
lets one `if` pick the branch.

## 8. Same ids, two views: class diagram to object diagram

Give each object the id of its class and the boxes morph in place: the title gains an underline and
`name : Class`, attributes become `attr = value` slots. Interfaces have no instance, so they fade away.

```tsx
import { useState } from 'react';
import { fitViewBox } from '@figurae/core';
import { Diagram, Segmented } from '@figurae/react';
import { ObjectLink, Relation, UmlClass, UmlObject, classDiagram, objectDiagram } from '@figurae/uml';

const classes: UmlClass[] = [
  { id: 'Shape', name: 'Shape', stereotype: 'interface', x: 120, y: 40 },
  { id: 'Circle', name: 'Circle', x: 40, y: 200, attributes: ['- r: number'] },
  { id: 'Drawing', name: 'Drawing', x: 300, y: 40, attributes: ['- title: string'] },
];
const relations: Relation[] = [{ from: 'Circle', to: 'Shape', kind: 'implements' }, { from: 'Drawing', to: 'Shape', kind: 'aggregation' }];
const objects: UmlObject[] = [                                   // same ids and same x/y as the classes they instantiate
  { id: 'Circle', name: 'c1', class: 'Circle', slots: { r: 5 }, x: 40, y: 200 },
  { id: 'Drawing', name: 'poster', class: 'Drawing', slots: { title: '"Shapes"' }, x: 300, y: 40 },
];
const links: ObjectLink[] = [{ from: 'Drawing', to: 'Circle', toRole: 'shapes' }];
const viewBox = fitViewBox(classDiagram(classes, relations), 40);

export function Views() {
  const [view, setView] = useState<'class' | 'object'>('class');
  const scene = view === 'class'
    ? classDiagram(classes, relations, { id: 'uml' })              // SAME diagram id in both, or the ids differ
    : objectDiagram(objects, links, { id: 'uml', route: 'straight' });
  return (
    <>
      <Diagram scene={scene} viewBox={viewBox} />
      <Segmented value={view} onChange={setView} options={[{ value: 'class', label: 'Classes' }, { value: 'object', label: 'Objects' }]} />
    </>
  );
}
```

Both layouts name a box `<id option>:<box id>:box` (and its title `…:name`), so matching `id` options
and matching box ids are what make the morph. Same idea for any pair: sequence and communication,
`graph` shown as a list and as a tree, an array before and after sorting (keep the `keys`).

## 9. Communication and sequence from one message list

One `Message[]` and one player drive both views. The sequence diagram shows order by going down the page;
the communication diagram has no "down", so it carries order in Dewey numbers taken from `parent` (the
index of the message this one happens inside; `sequence` ignores it).

```tsx
import { useMemo } from 'react';
import { fitViewBox } from '@figurae/core';
import { Diagram, Transport, usePlayer } from '@figurae/react';
import { CommunicationParticipant, Message, communication, sequence } from '@figurae/uml';

const people: CommunicationParticipant[] = [
  { id: 'user', label: 'User', kind: 'actor' }, { id: 'web', label: ':Browser' }, { id: 'api', label: ':API' }, { id: 'db', label: ':Database' },
];
const messages: Message[] = [
  { from: 'user', to: 'web', label: 'submit(form)' },                              // 1
  { from: 'web', to: 'api', label: 'POST /login', parent: 0 },                     // 1.1
  { from: 'api', to: 'db', label: 'findUser(email)', parent: 1 },                  // 1.1.1
  { from: 'db', to: 'api', label: 'user row', kind: 'return', parent: 1 },         // 1.1.2
  { from: 'api', to: 'web', label: '200 + token', kind: 'return', parent: 0 },     // 1.2
  { from: 'web', to: 'user', label: 'show dashboard', kind: 'return' },            // 2
];
const comm = (i: number) => communication(people, messages, { upTo: i, ring: true });
const seq = (i: number) => sequence(people, messages, { upTo: i, numbered: true, gap: 120 });
const last = messages.length - 1;
// every step in one box, so neither camera moves
const commBox = fitViewBox(messages.flatMap((_, i) => comm(i).nodes), 36);
const seqBox = fitViewBox(seq(last), 24);

export function Both() {
  const player = usePlayer(() => messages.map((_, i) => i), [], { interval: 1500 });
  const i = player.frame ?? 0;
  const c = useMemo(() => comm(i), [i]);
  const s = useMemo(() => seq(i), [i]);
  return (
    <>
      <Diagram scene={c} viewBox={commBox} />
      <Diagram scene={s} viewBox={seqBox} />
      <Transport player={player} />
    </>
  );
}
```

Note `fitViewBox` takes the union over every step: pass it the nodes of all frames
(`messages.flatMap((_, i) => comm(i).nodes)`), not just one. In `communication`, the links (structure)
always show; only messages are revealed by `upTo`.

## 10. Embedding in React with a dark theme mapped from app tokens

```tsx
import { Diagram } from '@figurae/react';
import { Scene, toSVG } from '@figurae/core';

// once, in the app's CSS: figurae reads only these variables
// .app .dv-root, .app .dvc { --dv-surface: var(--bg-panel); --dv-fg: var(--text); --dv-muted: var(--text-muted);
//   --dv-font: var(--font-sans); --dv-mono: var(--font-mono); }
// dark mode follows `.dark` on any ancestor (or [data-theme="dark"]).

export function DiagramView({ scene, alt, dark }: { scene: Scene; alt: string; dark: boolean }) {
  const copySvg = () => navigator.clipboard.writeText(toSVG(scene, { theme: dark ? 'dark' : 'light' }));
  return (
    <figure className={dark ? 'dark' : undefined}>
      <Diagram scene={scene} label={alt} />
      <button onClick={copySvg}>Copy as SVG</button>
    </figure>
  );
}
```

PNG: draw `toSVG(scene, { theme })` into an `<img>` from a Blob URL, then onto a canvas, then
`canvas.toBlob()`. `toSVG` embeds the stylesheet and, with a theme, its own background.
