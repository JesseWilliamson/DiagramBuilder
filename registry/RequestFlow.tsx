// One request through a web stack, hop by hop, with a running latency total.
// The packet is one circle with a stable id: each frame puts it at the end of
// the next link, and the tween engine slides it there.
import { useMemo, useState } from 'react';
import { combine, fitViewBox } from '@figurae/core';
import { architecture, Component, Link, packet } from '@figurae/arch';
import { Diagram, Segmented, Transport, usePlayer } from '@figurae/react';

const parts: Component[] = [
  { id: 'client', kind: 'client', label: 'Browser', x: 0, y: 140 },
  { id: 'lb', kind: 'lb', label: 'Load balancer', x: 190, y: 140 },
  { id: 'app', kind: 'service', label: 'App server', sub: 'x3', x: 380, y: 140 },
  { id: 'cache', kind: 'cache', label: 'Cache', sub: 'Redis', x: 580, y: 40 },
  { id: 'db', kind: 'db', label: 'Database', sub: 'Postgres', x: 580, y: 245 },
];
const links: Link[] = [
  { from: 'client', to: 'lb', both: true },
  { from: 'lb', to: 'app', both: true },
  { from: 'app', to: 'cache', both: true },
  { from: 'app', to: 'db', both: true },
];

type Hop = { from: string; to: string; payload: string; ms: number; note: string };
const hops = (hit: boolean): Hop[] => [
  { from: 'client', to: 'lb', payload: 'GET /user/42', ms: 20, note: 'Over the internet to the load balancer: the slowest hop.' },
  { from: 'lb', to: 'app', payload: 'GET /user/42', ms: 1, note: 'The balancer picks one of the app servers.' },
  { from: 'app', to: 'cache', payload: 'GET user:42', ms: 1, note: 'Check the cache first: it lives in memory.' },
  ...(hit
    ? [{ from: 'cache', to: 'app', payload: '{ name: "Ada" }', ms: 1, note: 'Cache hit: the answer comes straight back. The database never sees this request.' }]
    : [
        { from: 'cache', to: 'app', payload: 'nil', ms: 1, note: 'Cache miss: nothing stored under that key.' },
        { from: 'app', to: 'db', payload: 'SELECT … id=42', ms: 2, note: 'So ask the database…' },
        { from: 'db', to: 'app', payload: 'row', ms: 15, note: '…which has to find the row, possibly on disk.' },
        { from: 'app', to: 'cache', payload: 'SET user:42', ms: 1, note: 'Store it in the cache so the next request is a hit.' },
      ]),
  { from: 'app', to: 'lb', payload: '200 OK', ms: 1, note: 'The response heads back out…' },
  { from: 'lb', to: 'client', payload: '200 OK', ms: 20, note: '…and over the internet again.' },
];
const total = (hit: boolean) => hops(hit).reduce((s, h) => s + h.ms, 0);

const base = architecture(parts, links);
const viewBox = fitViewBox(base, 30);

export default function RequestFlow() {
  const [mode, setMode] = useState<'hit' | 'miss'>('miss');
  const path = useMemo(() => hops(mode === 'hit'), [mode]);
  const player = usePlayer(() => [-1, ...path.map((_, i) => i)], [mode], { interval: 1100 });
  const i = player.frame ?? -1;
  const hop = path[i];
  const elapsed = path.slice(0, i + 1).reduce((s, h) => s + h.ms, 0);

  // light up the link and the two components the packet is between
  const on = (k: string) => !!hop && (hop.from === k || hop.to === k);
  const arch = architecture(
    parts.map((p) => ({ ...p, tone: on(p.id) ? 'active' : undefined })),
    links.map((l) => ({ ...l, tone: hop && ((l.from === hop.from && l.to === hop.to) || (l.from === hop.to && l.to === hop.from)) ? 'active' : undefined })),
  );
  const at = hop ? arch.along(hop.from, hop.to, 0.92) : arch.along('client', 'lb', 0.04);
  const scene = combine(arch, packet({ id: 'req', ...at, tone: 'accent', label: hop?.payload ?? 'GET /user/42' }));

  return (
    <>
      <Diagram scene={scene} viewBox={viewBox} duration={700} />
      <p className="status">{hop ? hop.note : 'A request is about to leave the browser.'}</p>
      <Transport player={player} />
      <div className="row spread">
        <Segmented value={mode} onChange={setMode} options={[{ value: 'hit', label: 'Cache hit' }, { value: 'miss', label: 'Cache miss' }]} />
        <div className="stats">
          <span>elapsed <b>{elapsed} ms</b></span>
          <span>hit total <b>{total(true)} ms</b></span>
          <span>miss total <b>{total(false)} ms</b></span>
        </div>
      </div>
    </>
  );
}
