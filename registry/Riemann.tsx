// Riemann sums: area under a curve, approximated by n rectangles.
// Rectangles are keyed by index, so changing n resizes the ones you have and fades in the rest.
import { useState } from 'react';
import { combine } from '@figurae/core';
import { axes, fn, integrate, plane, point, riemann, RiemannRule, segment } from '@figurae/plot';
import { Diagram, MathText, Segmented, Slider } from '@figurae/react';

const f = (x: number) => 1.5 * (0.1 * x ** 3 - 0.9 * x ** 2 + 2 * x + 0.6);
const p = plane({ x: [-0.5, 6.5], y: [-0.6, 4], width: 440, height: 260 });
type Rule = RiemannRule;

export default function Riemann() {
  const [a, setA] = useState(0.5);
  const [b, setB] = useState(5.5);
  const [n, setN] = useState(6);
  const [rule, setRule] = useState<Rule>('left');
  const [touched, setTouched] = useState(false);
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const r = riemann(p, f, lo, hi, n, rule);
  const exact = integrate(f, lo, hi);

  const scene = combine(
    axes(p, { xTicks: 1, yTicks: 1 }),
    r,
    fn(p, f, { id: 'f' }),
    segment(p, { x: a, y: 0 }, { x: a, y: f(a) }, { id: 'ga', role: 'guide' }),
    segment(p, { x: b, y: 0 }, { x: b, y: f(b) }, { id: 'gb', role: 'guide' }),
    point(p, a, 0, { id: 'a', draggable: true, hint: !touched, tone: 'active', label: 'a', labelOffset: { x: -4, y: 16 } }),
    point(p, b, 0, { id: 'b', draggable: true, hint: !touched, tone: 'active', label: 'b', labelOffset: { x: -4, y: 16 } }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={p.viewBox()}
        onDrag={(e) => {
          setTouched(true);
          (e.id === 'a' ? setA : setB)(Math.max(0, Math.min(6, p.toWorld(e.x, e.y).x)));
        }}
      />
      <div className="row">
        <div className="grow"><Slider label="Rectangles" value={n} onChange={setN} min={1} max={40} format={(v) => `n = ${v}`} /></div>
        <Segmented value={rule} onChange={setRule} options={[{ value: 'left', label: 'Left' }, { value: 'mid', label: 'Mid' }, { value: 'right', label: 'Right' }, { value: 'trap', label: 'Trap' }]} />
      </div>
      <div className="stats formula">
        <span><MathText tex="\text{sum} =" /> <b>{r.sum.toFixed(4)}</b></span>
        <span><MathText tex="\text{exact} =" /> <b>{exact.toFixed(4)}</b></span>
        <span className={Math.abs(r.sum - exact) < 0.01 ? 'tone-success' : 'tone-danger'}><MathText tex="\text{error} =" /> <b>{(r.sum - exact).toFixed(4)}</b></span>
      </div>
    </>
  );
}
