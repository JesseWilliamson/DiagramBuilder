// A load balancer, simulated one tick at a time. S3 is twice as slow as the others:
// round robin keeps handing it work anyway, least connections notices the pile-up.
// Click a server to take it down (its in-flight requests fail) or bring it back.
import { useEffect, useRef, useState } from 'react';
import { combine, fitViewBox, Tone } from '@dsviz/core';
import { architecture, Component, Link, packet } from '@dsviz/arch';
import { Button, Diagram, Segmented, Slider, Switch, useTicker } from '@dsviz/react';

type Policy = 'rr' | 'least' | 'random';
type Req = { id: number; phase: 'new' | 'lb' | 'srv' | 'work' | 'failed'; server?: string; left: number };
const SERVERS = ['s1', 's2', 's3'];
const SLOW: Record<string, number> = { s1: 1, s2: 1, s3: 2 };

const layout = (down: ReadonlySet<string>, load: Record<string, number>, served: Record<string, number>): Component[] => [
  { id: 'clients', kind: 'user', label: 'Users', x: 0, y: 150 },
  { id: 'lb', kind: 'lb', label: 'Load balancer', x: 190, y: 150 },
  ...SERVERS.map((s, i) => ({
    id: s, kind: 'service' as const, label: `S${i + 1}${SLOW[s] > 1 ? ' (slow)' : ''}`, x: 420, y: 40 + i * 110, w: 150, h: 72,
    sub: down.has(s) ? 'down' : `${load[s] ?? 0} active · ${served[s] ?? 0} done`,
    tone: (down.has(s) ? 'danger' : undefined) as Tone | undefined, opacity: down.has(s) ? 0.55 : 1,
  })),
];
const links: Link[] = [{ from: 'clients', to: 'lb' }, ...SERVERS.map((s) => ({ from: 'lb', to: s }))];
const viewBox = fitViewBox(architecture(layout(new Set(), {}, {}), links), 24);

export default function LoadBalancer() {
  const [policy, setPolicy] = useState<Policy>('rr');
  const [rate, setRate] = useState(0.7);
  const [running, setRunning] = useState(true);
  const [down, setDown] = useState<Set<string>>(new Set());
  const [reqs, setReqs] = useState<Req[]>([]);
  const [served, setServed] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(0);
  const next = useRef({ id: 0, rr: 0 });
  const tick = useTicker(520, running);

  // One simulation step per tick: compute the next requests from the current ones,
  // then set state once. (Not inside a setState updater: React may call those
  // twice in development, which would count every request twice.)
  useEffect(() => {
    if (!tick) return;
    const load = (s: string) => reqs.filter((r) => r.server === s && (r.phase === 'srv' || r.phase === 'work')).length;
    const up = SERVERS.filter((s) => !down.has(s));
    const choose = () => {
      if (!up.length) return undefined;
      if (policy === 'random') return up[Math.floor(Math.random() * up.length)];
      if (policy === 'least') return [...up].sort((a, b) => load(a) - load(b))[0];
      // round robin: the next server in turn that is up
      for (let k = 0; k < SERVERS.length; k++) {
        const s = SERVERS[next.current.rr++ % SERVERS.length];
        if (!down.has(s)) return s;
      }
    };
    const out: Req[] = [];
    const done: Record<string, number> = {};
    let lost = 0;
    for (const r of reqs) {
      if (r.phase === 'failed') continue; // shown red for one tick, now gone
      if (r.server && down.has(r.server)) { out.push({ ...r, phase: 'failed' }); lost++; continue; }
      if (r.phase === 'new') out.push({ ...r, phase: 'lb' });
      else if (r.phase === 'lb') {
        const s = choose();
        if (s) out.push({ ...r, phase: 'srv', server: s, left: (2 + Math.floor(Math.random() * 4)) * SLOW[s] });
        else (out.push({ ...r, phase: 'failed' }), lost++);
      } else if (r.phase === 'srv') out.push({ ...r, phase: 'work' });
      else if (r.left > 1) out.push({ ...r, left: r.left - 1 });
      else done[r.server!] = (done[r.server!] ?? 0) + 1;
    }
    if (Math.random() < rate) out.push({ id: next.current.id++, phase: 'new', left: 0 });
    setReqs(out);
    if (lost) setFailed((f) => f + lost);
    if (Object.keys(done).length) setServed((v) => Object.fromEntries(SERVERS.map((s) => [s, (v[s] ?? 0) + (done[s] ?? 0)])));
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const load: Record<string, number> = {};
  for (const r of reqs) if (r.server && (r.phase === 'srv' || r.phase === 'work')) load[r.server] = (load[r.server] ?? 0) + 1;
  const arch = architecture(layout(down, load, served), links, { interactive: true });

  // where each request is drawn
  const slot: Record<string, number> = {};
  const packets = reqs.map((r) => {
    let p = arch.along('clients', 'lb', 0.1);
    if (r.phase === 'lb') p = arch.along('clients', 'lb', 0.9);
    if (r.phase === 'srv' || (r.phase === 'failed' && r.server && !slot[r.server])) p = arch.along('lb', r.server!, 0.85);
    if (r.phase === 'work' || (r.phase === 'failed' && r.server)) {
      const f = arch.frame(r.server!), k = (slot[r.server!] = (slot[r.server!] ?? 0) + 1) - 1;
      p = { x: f.x - f.w / 2 + 14 + (k % 12) * 11, y: f.y + 24 };
    }
    if (r.phase === 'failed' && !r.server) p = arch.along('clients', 'lb', 0.9);
    const tone: Tone = r.phase === 'failed' ? 'danger' : r.phase === 'work' ? 'success' : 'accent';
    return packet({ id: `r${r.id}`, ...p, tone, r: r.phase === 'work' ? 4.5 : 6 });
  });

  return (
    <>
      <Diagram
        scene={combine(arch, packets)}
        viewBox={viewBox}
        duration={360}
        onClick={(e) => {
          const id = (e.node.data as { component?: string })?.component;
          if (id && SERVERS.includes(id)) setDown((d) => { const n = new Set(d); n.has(id) ? n.delete(id) : n.add(id); return n; });
        }}
      />
      <div className="row spread">
        <Segmented value={policy} onChange={setPolicy} options={[{ value: 'rr', label: 'Round robin' }, { value: 'least', label: 'Least connections' }, { value: 'random', label: 'Random' }]} />
        <Switch label="Running" checked={running} onChange={setRunning} />
      </div>
      <div className="row">
        <div className="grow"><Slider label="Traffic" value={rate} onChange={setRate} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} /></div>
        <Button onClick={() => (setReqs([]), setServed({}), setFailed(0))}>Reset</Button>
      </div>
      <p className="hint">Watch S3's queue under round robin, then switch to least connections. Click a server to take it down: {failed} requests failed so far.</p>
    </>
  );
}
