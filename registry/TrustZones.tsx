// Zones are dashed boundaries around groups of components: here a server and
// a sandbox inside it. The point of drawing them is to ask, for every arrow,
// what is allowed across. The expected answers never cross into the sandbox.
import { useState } from 'react';
import { combine, fitViewBox } from 'dsviz';
import { architecture, Component, Link, Zone } from 'dsviz/arch';
import { Diagram, Segmented } from 'dsviz/react';

const parts: Component[] = [
  { id: 'api', kind: 'service', label: 'API', sub: 'owns the problem', x: 0, y: 90 },
  { id: 'answers', kind: 'file', label: 'answers', sub: 'expected', x: 0, y: 300 },
  { id: 'compare', kind: 'service', label: 'compare', x: 400, y: 300 },
  { id: 'input', kind: 'file', label: 'input.json', x: 230, y: 30 },
  { id: 'code', kind: 'file', label: 'solution.py', x: 230, y: 150 },
  { id: 'run', kind: 'service', label: 'driver', x: 400, y: 90 },
  { id: 'output', kind: 'file', label: 'output.json', x: 560, y: 90 },
];
const links: Link[] = [
  { from: 'api', to: 'input' },
  { from: 'api', to: 'code' },
  { from: 'input', to: 'run' },
  { from: 'code', to: 'run' },
  { from: 'run', to: 'output' },
  { from: 'output', to: 'compare', dashed: true, label: 'read back' },
  { from: 'answers', to: 'compare' },
];
const zones: Zone[] = [
  { id: 'server', label: 'server', around: ['api', 'answers', 'compare', 'input', 'code', 'run', 'output'] },
  { id: 'sandbox', label: 'sandbox', around: ['input', 'code', 'run', 'output'], tone: 'danger' },
];
const viewBox = fitViewBox(architecture(parts, links, { zones }), 24);

export default function TrustZones() {
  const [show, setShow] = useState<'in' | 'out'>('in');
  const lit = show === 'in' ? ['input', 'code'] : ['output', 'compare'];
  const scene = combine(
    architecture(
      parts.map((p) => ({ ...p, tone: lit.includes(p.id) ? 'active' : p.id === 'answers' ? 'success' : undefined })),
      links,
      { zones },
    ),
  );
  return (
    <>
      <Diagram scene={scene} viewBox={viewBox} />
      <p className="status">
        {show === 'in'
          ? 'Into the sandbox: the arguments and the code. The expected answers stay outside, so code that reads its own directory finds nothing to copy.'
          : 'Out of the sandbox: whatever the code returned. The comparison happens back on the server.'}
      </p>
      <Segmented value={show} onChange={setShow} options={[{ value: 'in', label: 'What goes in' }, { value: 'out', label: 'What comes out' }]} />
    </>
  );
}
