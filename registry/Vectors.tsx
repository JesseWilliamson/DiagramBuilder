// Vectors you can grab by the tip. Same plane, three questions.
import { useState } from 'react';
import { combine, Vec } from '@figurae/core';
import { angleAt, angleMark, dot as geomDot, toDegrees } from '@figurae/geom';
import { axes, plane, point, segment, vector } from '@figurae/plot';
import { Diagram, MathText, Segmented } from '@figurae/react';

// Equal pixels per unit on both axes (60), so angles on screen are true angles.
const p = plane({ x: [-1, 6], y: [-1, 4], width: 420, height: 300 });
const O = { x: 0, y: 0 };
const add = (a: Vec, b: Vec) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec) => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, k: number) => ({ x: a.x * k, y: a.y * k });
// fixed decimals, so the numbers keep their width while you drag instead of jittering
const fmt = (v: Vec) => `(${v.x.toFixed(1)}, ${v.y.toFixed(1)})`;

type Mode = 'sum' | 'difference' | 'projection';

const projOf = (u: Vec, v: Vec) => scale(v, geomDot(u, v) / (geomDot(v, v) || 1));

export default function Vectors() {
  const [u, setU] = useState<Vec>({ x: 3.5, y: 1 });
  const [v, setV] = useState<Vec>({ x: 1.25, y: 2.5 });
  const [mode, setMode] = useState<Mode>('sum');
  const [touched, setTouched] = useState(false);

  const dot = geomDot(u, v);
  const proj = projOf(u, v);
  const theta = toDegrees(angleAt(p.toPx(u), p.toPx(O), p.toPx(v)));

  const scene = combine(
    axes(p, { xTicks: 1, yTicks: 1, labels: true }),
    // the drag handles go first, so the arrowheads draw on top of them (lines ignore the pointer)
    point(p, u.x, u.y, { id: 'U', draggable: true, hint: !touched, tone: 'accent' }),
    point(p, v.x, v.y, { id: 'V', draggable: true, hint: !touched, tone: 'visited' }),
    mode === 'sum' && [
      vector(p, u, add(u, v), { id: 'v-copy', tone: 'muted', dashed: true, width: 1.5 }),
      vector(p, v, add(u, v), { id: 'u-copy', tone: 'muted', dashed: true, width: 1.5 }),
      vector(p, O, add(u, v), { id: 'result', tone: 'success', label: 'u + v' }),
    ],
    mode === 'difference' && [
      vector(p, v, u, { id: 'result', tone: 'danger', label: 'u − v' }),
      vector(p, O, sub(u, v), { id: 'v-copy', tone: 'muted', dashed: true, width: 1.5 }),
    ],
    mode === 'projection' && [
      angleMark(p.toPx(u), p.toPx(O), p.toPx(v), { id: 'theta', r: 30, label: 'θ', tone: 'active' }),
      segment(p, u, proj, { id: 'perp', role: 'guide' }),
      vector(p, O, proj, { id: 'result', tone: 'success', label: 'proj_v u', width: 3 }),
    ],
    vector(p, O, u, { id: 'u', tone: 'accent', label: 'u' }),
    vector(p, O, v, { id: 'v', tone: 'visited', label: 'v' }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={p.viewBox()}
        onDrag={(e) => {
          setTouched(true);
          // Only the tips you hold are kept on the plane, so they can always be
          // grabbed again. What they produce (u + v, u − v) is free to run off
          // the edge; the fixed camera clips it.
          (e.id === 'U' ? setU : setV)(p.clamp(p.toWorld(e.x, e.y)));
        }}
      />
      <Segmented value={mode} onChange={setMode} options={['sum', 'difference', 'projection']} />
      <div className="stats formula">
        <span className="tone-accent"><MathText tex="u =" /> <b>{fmt(u)}</b></span>
        <span className="tone-visited"><MathText tex="v =" /> <b>{fmt(v)}</b></span>
        {mode === 'sum' && <span className="tone-success"><MathText tex="u + v =" /> <b>{fmt(add(u, v))}</b></span>}
        {mode === 'difference' && <span className="tone-danger"><MathText tex="u - v =" /> <b>{fmt(sub(u, v))}</b></span>}
        {mode === 'projection' && <>
          <span><MathText tex="u \cdot v =" /> <b>{dot.toFixed(2)}</b></span>
          <span className="tone-active"><MathText tex="\theta =" /> <b>{theta.toFixed(1)}°</b></span>
        </>}
      </div>
    </>
  );
}
