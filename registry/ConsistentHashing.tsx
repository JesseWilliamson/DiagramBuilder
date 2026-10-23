// Consistent hashing. Keys and servers are hashed onto a ring; a key belongs to
// the first server point clockwise from it. Add or remove a server and count how
// many keys change owner, then compare with plain `hash(key) % N`.
// Virtual nodes put each server on the ring several times, which evens out the load.
import { useRef, useState } from 'react';
import { circle, combine, path, rect, text, Tone } from '@dsviz/core';
import { Button, Diagram, Segmented, Switch } from '@dsviz/react';

// FNV-1a, then MurmurHash3's finaliser, scaled to [0, 1) = a position on the ring.
// Plain FNV-1a barely changes its HIGH bits between 'user:1' and 'user:2', so
// without the finaliser similar keys bunch together on the ring. The finaliser
// mixes every input bit into every output bit ("avalanche").
const hash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
};

const ALL = ['A', 'B', 'C', 'D', 'E', 'F'];
const TONES: Tone[] = ['accent', 'success', 'orange', 'visited', 'danger', 'active'];
const KEYS = Array.from({ length: 30 }, (_, i) => `user:${i}`);
const R = 130;
const onRing = (t: number, r = R) => ({ x: r * Math.sin(2 * Math.PI * t), y: -r * Math.cos(2 * Math.PI * t) });

type Point = { server: string; v: number; t: number };
/** Where each server sits on the ring: once, or `copies` times with virtual nodes. */
const pointsOf = (servers: string[], copies: number): Point[] =>
  servers
    .flatMap((server) => Array.from({ length: copies }, (_, v) => ({ server, v, t: hash(v ? `cache-${server}#${v}` : `cache-${server}`) })))
    .sort((a, b) => a.t - b.t);

type Mode = 'ring' | 'mod';
function owners(servers: string[], mode: Mode, copies: number): Record<string, string> {
  const pts = pointsOf(servers, copies);
  const out: Record<string, string> = {};
  for (const k of KEYS) {
    if (mode === 'mod') out[k] = servers[Math.floor(hash(k) * 2 ** 32) % servers.length];
    // the first server point at or after the key, wrapping round to the start
    else out[k] = (pts.find((p) => p.t >= hash(k)) ?? pts[0]).server;
  }
  return out;
}

export default function ConsistentHashing() {
  const [servers, setServers] = useState(['A', 'B', 'C']);
  const [mode, setMode] = useState<Mode>('ring');
  const [vnodes, setVnodes] = useState(false);
  const [moved, setMoved] = useState<Set<string>>(new Set());
  const last = useRef<string | null>(null);
  const copies = vnodes ? 3 : 1;

  const own = owners(servers, mode, copies);
  const change = (next: string[], what: string) => {
    const after = owners(next, mode, copies);
    setMoved(new Set(KEYS.filter((k) => after[k] !== own[k])));
    last.current = what;
    setServers(next);
  };
  const reset = () => (setMoved(new Set()), (last.current = null));
  const toneOf = (s: string) => TONES[ALL.indexOf(s)];
  const pts = pointsOf(servers, copies);

  // Ring mode: colour each arc by the server that owns it (from the previous point up to this one).
  const arcs = mode === 'ring' && pts.map((p, i) => {
    const t0 = pts[(i - 1 + pts.length) % pts.length].t;
    const span = (p.t - t0 + 1) % 1 || 1;
    const line = Array.from({ length: 40 }, (_, j) => onRing(t0 + (span * j) / 39)).map((q) => [q.x, q.y] as const);
    return path({ id: `arc:${p.server}#${p.v}`, points: line, role: 'curve', tone: toneOf(p.server), width: 5 });
  });

  const scene = combine(
    circle({ id: 'ring', x: 0, y: 0, r: R, role: 'outline', tone: 'muted' }),
    arcs,
    KEYS.map((k) => {
      const p = onRing(hash(k));
      return [
        moved.has(k) && circle({ id: `moved:${k}`, ...p, r: 10, role: 'outline', tone: 'danger' }),
        circle({ id: `key:${k}`, ...p, r: 5, role: 'packet', tone: toneOf(own[k]) }),
      ];
    }),
    pts.map((p) => {
      const c = onRing(p.t, R + 30), a = onRing(p.t, R - 8), b = onRing(p.t, R + 16);
      const id = `srv:${p.server}#${p.v}`;
      return [
        path({ id: `${id}:tick`, points: [[a.x, a.y], [b.x, b.y]], role: 'axis', width: 2 }),
        rect({ id, ...c, w: 26, h: 22, rx: 5, tone: toneOf(p.server) }),
        text({ id: `${id}:t`, ...c, text: p.server, size: 12.5, role: 'value' }),
      ];
    }),
  );

  const n = servers.length;
  const load = servers.map((s) => [s, KEYS.filter((k) => own[k] === s).length] as const);
  return (
    <>
      <Diagram scene={scene} viewBox={[-200, -200, 400, 400]} duration={500} />
      <div className="row">
        <Button variant="primary" disabled={n >= ALL.length} onClick={() => change([...servers, ALL.find((s) => !servers.includes(s))!], 'added a server')}>Add server</Button>
        <Button disabled={n <= 2} onClick={() => change(servers.slice(0, -1), 'removed a server')}>Remove server</Button>
        <Segmented value={mode} onChange={(m) => (setMode(m), reset())} options={[{ value: 'ring', label: 'Hash ring' }, { value: 'mod', label: 'hash % N' }]} />
        <Switch label="Virtual nodes" checked={vnodes} onChange={(v) => (setVnodes(v), reset())} />
      </div>
      <p className="status">
        {last.current
          ? <>You {last.current}: <b>{moved.size} of {KEYS.length}</b> keys changed server (circled). {mode === 'ring' ? `About 1/${n} of them is the least possible.` : 'With % N, most keys move.'}</>
          : 'Each dot is a key, coloured by the server that stores it. Add or remove a server.'}
      </p>
      <div className="stats">
        {load.map(([s, c]) => <span key={s} className={`tone-${toneOf(s)}`}>{s} <b>{c}</b> keys</span>)}
      </div>
    </>
  );
}
