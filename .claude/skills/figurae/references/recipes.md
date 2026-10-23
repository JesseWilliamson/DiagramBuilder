# figurae recipes

Each recipe is complete: copy, then change the data.

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
const scene = rebased ? gitGraph(after, refs("f2'"), { highlight: ["f1'", "f2'"] }) : gitGraph(before, refs('f2'));
```

Commits are keyed by hash, so switching between the two animates: rebased commits are new dots.

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

## 6. Embedding in React with a dark theme mapped from app tokens

```tsx
import { Diagram } from '@figurae/react';
import { toSVG } from '@figurae/core';
import { describeSpec, fromSpec, validateSpec } from '@figurae/spec';

// once, in the app's CSS: figurae reads only these variables
// .app .dv-root, .app .dvc { --dv-surface: var(--bg-panel); --dv-fg: var(--text); --dv-muted: var(--text-muted);
//   --dv-font: var(--font-sans); --dv-mono: var(--font-mono); }
// dark mode follows `.dark` on any ancestor (or [data-theme="dark"]).

export function DiagramView({ spec, dark }: { spec: unknown; dark: boolean }) {
  const r = validateSpec(spec);
  if (!r.ok) return <ul>{r.errors.map((e) => <li key={e.path}>{e.path}: {e.message}</li>)}</ul>;
  const scene = fromSpec(r.spec!);
  const copySvg = () => navigator.clipboard.writeText(toSVG(scene, { theme: dark ? 'dark' : 'light' }));
  return (
    <figure className={dark ? 'dark' : undefined}>
      <Diagram scene={scene} label={describeSpec(r.spec!)} />
      <button onClick={copySvg}>Copy as SVG</button>
    </figure>
  );
}
```

PNG: draw `toSVG(scene, { theme })` into an `<img>` from a Blob URL, then onto a canvas, then
`canvas.toBlob()`. `toSVG` embeds the stylesheet and, with a theme, its own background.
