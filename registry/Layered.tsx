// A build pipeline with no coordinates at all: layout: 'layered' puts every
// task one layer below the last thing it waits for, orders each layer so lines
// cross as little as possible, and bends long edges around the boxes between.
//
// Click a task to "change" it. Node kinds say what each node IS (changed,
// upstream, downstream, test) and the stylesheet picks the colours, so an app
// can restyle a blast-radius picture without touching this code.
import { useState } from 'react';
import { graph } from 'dsviz/ds';
import { Diagram, Segmented } from 'dsviz/react';

const tasks = ['fetch deps', 'lint', 'typecheck', 'compile', 'unit tests', 'bundle', 'docs', 'e2e tests', 'deploy'];
const deps: [string, string][] = [
  ['fetch deps', 'lint'], ['fetch deps', 'typecheck'], ['fetch deps', 'compile'], ['typecheck', 'compile'],
  ['compile', 'unit tests'], ['compile', 'bundle'], ['bundle', 'e2e tests'], ['lint', 'deploy'],
  ['unit tests', 'deploy'], ['e2e tests', 'deploy'], ['fetch deps', 'docs'], ['docs', 'deploy'],
];

/** Everything reachable from t, following edges forward (dir 1) or backward (dir 0). */
const reach = (t: string, dir: 0 | 1, out = new Set<string>()): Set<string> => {
  for (const e of deps) if (e[1 - dir] === t && !out.has(e[dir])) (out.add(e[dir]), reach(e[dir], dir, out));
  return out;
};

export default function Layered() {
  const [direction, setDirection] = useState<'down' | 'right'>('down');
  const [route, setRoute] = useState<'straight' | 'elbow'>('elbow');
  const [changed, setChanged] = useState('typecheck');
  const up = reach(changed, 0), down = reach(changed, 1);
  const kind = (t: string) =>
    t === changed ? 'changed' : t.endsWith('tests') && down.has(t) ? 'test' : down.has(t) ? 'downstream' : up.has(t) ? 'upstream' : undefined;
  const scene = graph(
    tasks.map((id) => ({ id, kind: kind(id) })),
    deps.map(([from, to]) => ({ from, to, tone: kind(from) && kind(to) ? undefined : 'muted' })),
    { layout: 'layered', direction, route, directed: true, interactive: true, shape: 'rect', r: 20, rankGap: 44, nodeGap: 20 },
  );
  return (
    <>
      <Diagram scene={scene} camera="fit" onClick={(e) => typeof (e.node.data as { id?: unknown })?.id === 'string' && setChanged((e.node.data as { id: string }).id)} />
      <p className="status">Changing <b>{changed}</b> re-runs {down.size ? [...down].join(', ') : 'nothing else'}.</p>
      <div className="row">
        <Segmented value={direction} onChange={setDirection} options={[{ value: 'down', label: 'Down' }, { value: 'right', label: 'Right' }]} />
        <Segmented value={route} onChange={setRoute} options={[{ value: 'straight', label: 'Straight' }, { value: 'elbow', label: 'Elbow' }]} />
      </div>
    </>
  );
}
