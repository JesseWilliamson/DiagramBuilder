// A build pipeline with no coordinates at all: layout: 'layered' puts every
// task one layer below the last thing it waits for, orders each layer so lines
// cross as little as possible, and bends long edges around the boxes between.
// Click a task to light up everything it depends on.
import { useMemo, useState } from 'react';
import { graph } from 'dsviz';
import { Diagram, Segmented } from 'dsviz/react';

const tasks = ['fetch', 'lint', 'types', 'compile', 'test', 'bundle', 'docs', 'deploy'];
const deps: [string, string][] = [
  ['fetch', 'lint'], ['fetch', 'types'], ['fetch', 'compile'], ['types', 'compile'],
  ['compile', 'test'], ['compile', 'bundle'], ['lint', 'deploy'], ['test', 'deploy'],
  ['bundle', 'deploy'], ['fetch', 'docs'], ['docs', 'deploy'],
];

/** Everything `t` waits for, directly or not. */
const upstream = (t: string, out = new Set<string>()): Set<string> => {
  for (const [a, b] of deps) if (b === t && !out.has(a)) (out.add(a), upstream(a, out));
  return out;
};

export default function Layered() {
  const [direction, setDirection] = useState<'down' | 'right'>('down');
  const [route, setRoute] = useState<'straight' | 'elbow'>('elbow');
  const [picked, setPicked] = useState('deploy');
  const lit = useMemo(() => upstream(picked), [picked]);
  const scene = graph(
    tasks.map((id) => ({ id, tone: id === picked ? 'active' : lit.has(id) ? 'accent' : undefined })),
    deps.map(([from, to]) => ({ from, to, tone: lit.has(from) && (lit.has(to) || to === picked) ? 'accent' : undefined })),
    { layout: 'layered', direction, route, directed: true, interactive: true, r: 34, rankGap: 40 },
  );
  return (
    <>
      <Diagram scene={scene} camera="fit" onClick={(e) => (e.node.data as { id?: string })?.id && setPicked((e.node.data as { id: string }).id)} />
      <p className="status">{picked} waits for: {[...lit].join(', ') || 'nothing'}</p>
      <div className="row">
        <Segmented value={direction} onChange={setDirection} options={[{ value: 'down', label: 'Down' }, { value: 'right', label: 'Right' }]} />
        <Segmented value={route} onChange={setRoute} options={[{ value: 'straight', label: 'Straight' }, { value: 'elbow', label: 'Elbow' }]} />
      </div>
    </>
  );
}
