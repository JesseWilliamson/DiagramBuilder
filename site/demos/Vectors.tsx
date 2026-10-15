// Vectors you can grab by the tip. Same plane, three questions.
import { useState } from 'react';
import { combine, geom, plot, Vec } from 'dsviz';
import { Diagram, MathText, Segmented } from 'dsviz/react';

// Equal pixels per unit on both axes (60), so angles on screen are true angles.
const p = plot.plane({ x: [-1, 6], y: [-1, 4], width: 420, height: 300 });
const O = { x: 0, y: 0 };
const add = (a: Vec, b: Vec) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec) => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, k: number) => ({ x: a.x * k, y: a.y * k });
const snap = (v: number) => Math.round(v * 4) / 4;
const fmt = (v: Vec) => `(${+v.x.toFixed(2)}, ${+v.y.toFixed(2)})`;

type Mode = 'sum' | 'difference' | 'projection';

const projOf = (u: Vec, v: Vec) => scale(v, geom.dot(u, v) / (geom.dot(v, v) || 1));
// Every point the current mode draws. The handles are clamped to the plane,
// but u + v or u − v can still land outside it, so we check those too.
const drawn = (u: Vec, v: Vec, mode: Mode) => [u, v, mode === 'sum' ? add(u, v) : mode === 'difference' ? sub(u, v) : projOf(u, v)];
const fits = (u: Vec, v: Vec, mode: Mode) =>
  drawn(u, v, mode).every((q) => q.x >= p.x[0] && q.x <= p.x[1] && q.y >= p.y[0] && q.y <= p.y[1]);
// A starting position that fits, for each mode.
const presets: Record<Mode, [Vec, Vec]> = {
  sum: [{ x: 3.5, y: 1 }, { x: 1.25, y: 2.5 }],
  difference: [{ x: 3.5, y: 1.5 }, { x: 1.25, y: 2.5 }],
  projection: [{ x: 3.5, y: 1 }, { x: 1.25, y: 2.5 }],
};

export default function Vectors() {
  const [u, setU] = useState<Vec>({ x: 3.5, y: 1 });
  const [v, setV] = useState<Vec>({ x: 1.25, y: 2.5 });
  const [mode, setMode] = useState<Mode>('sum');
  const [touched, setTouched] = useState(false);

  const dot = geom.dot(u, v);
  const proj = projOf(u, v);
  const theta = geom.toDegrees(geom.angleAt(p.toPx(u), p.toPx(O), p.toPx(v)));

  const scene = combine(
    plot.axes(p, { xTicks: 1, yTicks: 1, labels: true }),
    // the drag handles go first, so the arrowheads draw on top of them (lines ignore the pointer)
    plot.point(p, u.x, u.y, { id: 'U', draggable: true, hint: !touched, tone: 'accent' }),
    plot.point(p, v.x, v.y, { id: 'V', draggable: true, hint: !touched, tone: 'visited' }),
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
      plot.vector(p, O, proj, { id: 'result', tone: 'success', label: 'proj_v u', width: 3 }),
    ],
    plot.vector(p, O, u, { id: 'u', tone: 'accent', label: 'u' }),
    plot.vector(p, O, v, { id: 'v', tone: 'visited', label: 'v' }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={p.viewBox()}
        onDrag={(e) => {
          setTouched(true);
          const w = p.clamp(p.toWorld(e.x, e.y));
          const cur = e.id === 'U' ? u : v;
          const ok = (q: Vec) => (e.id === 'U' ? fits(q, v, mode) : fits(u, q, mode));
          // Walk from where the handle is toward the pointer and stop at the last
          // spot where everything still fits (binary search on the straight path),
          // so dragging too far feels like hitting a wall rather than jumping.
          let lo = 0, hi = 1;
          if (!ok(w)) for (let i = 0; i < 14; i++) {
            const t = (lo + hi) / 2;
            ok({ x: cur.x + (w.x - cur.x) * t, y: cur.y + (w.y - cur.y) * t }) ? (lo = t) : (hi = t);
          } else lo = 1;
          let next = { x: snap(cur.x + (w.x - cur.x) * lo), y: snap(cur.y + (w.y - cur.y) * lo) };
          if (!ok(next)) next = cur; // snapping nudged it out: stay put
          (e.id === 'U' ? setU : setV)(next);
        }}
      />
      <Segmented value={mode} onChange={(m) => { if (!fits(u, v, m)) (setU(presets[m][0]), setV(presets[m][1])); setMode(m); }} options={['sum', 'difference', 'projection']} />
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
