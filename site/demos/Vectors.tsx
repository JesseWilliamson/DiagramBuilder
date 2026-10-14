// Vectors you can grab by the tip. Same plane, three questions.
import { useState } from 'react';
import { combine, geom, plot, Vec } from 'dsviz';
import { Challenge, Diagram, Segmented } from 'dsviz/react';

// Equal pixels per unit on both axes (60), so angles on screen are true angles.
const p = plot.plane({ x: [-1, 6], y: [-1, 4], width: 420, height: 300 });
const O = { x: 0, y: 0 };
const add = (a: Vec, b: Vec) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec) => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, k: number) => ({ x: a.x * k, y: a.y * k });
const snap = (v: number) => Math.round(v * 4) / 4;
const fmt = (v: Vec) => `(${+v.x.toFixed(2)}, ${+v.y.toFixed(2)})`;

type Mode = 'sum' | 'difference' | 'projection';

export default function Vectors() {
  const [u, setU] = useState<Vec>({ x: 3.5, y: 1 });
  const [v, setV] = useState<Vec>({ x: 1.25, y: 2.5 });
  const [mode, setMode] = useState<Mode>('sum');
  const [touched, setTouched] = useState(false);

  const dot = geom.dot(u, v);
  const proj = scale(v, dot / (geom.dot(v, v) || 1));
  const theta = geom.toDegrees(geom.angleAt(p.toPx(u), p.toPx(O), p.toPx(v)));

  const scene = combine(
    plot.axes(p, { xTicks: 1, yTicks: 1, labels: true }),
    mode === 'sum' && [
      plot.vector(p, u, add(u, v), { id: 'v-copy', tone: 'muted', dashed: true, width: 1.5 }),
      plot.vector(p, v, add(u, v), { id: 'u-copy', tone: 'muted', dashed: true, width: 1.5 }),
      plot.vector(p, O, add(u, v), { id: 'result', tone: 'success', label: 'u + v' }),
    ],
    mode === 'difference' && [
      plot.vector(p, v, u, { id: 'result', tone: 'danger', label: 'u − v' }),
      plot.vector(p, O, sub(u, v), { id: 'v-copy', tone: 'muted', dashed: true, width: 1.5 }),
    ],
    mode === 'projection' && [
      geom.angleMark(p.toPx(u), p.toPx(O), p.toPx(v), { id: 'theta', r: 30, label: 'θ', tone: 'active' }),
      plot.segment(p, u, proj, { id: 'perp', role: 'guide' }),
      plot.vector(p, O, proj, { id: 'result', tone: 'success', label: 'proj', width: 3 }),
    ],
    plot.vector(p, O, u, { id: 'u', tone: 'accent', label: 'u' }),
    plot.vector(p, O, v, { id: 'v', tone: 'visited', label: 'v' }),
    plot.point(p, u.x, u.y, { id: 'U', draggable: true, hint: !touched, tone: 'accent' }),
    plot.point(p, v.x, v.y, { id: 'V', draggable: true, hint: !touched, tone: 'visited' }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        height={320}
        viewBox={p.viewBox()}
        onDrag={(e) => {
          setTouched(true);
          const w = p.clamp(p.toWorld(e.x, e.y));
          (e.id === 'U' ? setU : setV)({ x: snap(w.x), y: snap(w.y) });
        }}
      />
      <Segmented value={mode} onChange={setMode} options={['sum', 'difference', 'projection']} />
      <div className="stats">
        <span className="tone-accent">u = <b>{fmt(u)}</b></span>
        <span className="tone-visited">v = <b>{fmt(v)}</b></span>
        {mode === 'sum' && <span className="tone-success">u + v = <b>{fmt(add(u, v))}</b></span>}
        {mode === 'difference' && <span className="tone-danger">u − v = <b>{fmt(sub(u, v))}</b></span>}
        {mode === 'projection' && <>
          <span>u · v = <b>{dot.toFixed(2)}</b></span>
          <span className="tone-active">θ = <b>{theta.toFixed(1)}°</b></span>
        </>}
      </div>
      <Challenge
        goals={[
          { label: 'Make u + v land exactly on (5, 3)', done: add(u, v).x === 5 && add(u, v).y === 3 },
          { label: 'Make u and v perpendicular (u · v = 0)', done: dot === 0 && geom.dot(u, u) > 0 && geom.dot(v, v) > 0 },
          { label: 'Make u − v point straight down', done: sub(u, v).x === 0 && sub(u, v).y < 0 },
        ]}
      />
    </>
  );
}
