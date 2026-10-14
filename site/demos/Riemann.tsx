// Riemann sums: area under a curve, approximated by n rectangles.
// Rectangles are keyed by index, so changing n resizes the ones you have and fades in the rest.
import { useState } from 'react';
import { combine, plot } from 'dsviz';
import { Challenge, Diagram, Segmented, Slider } from 'dsviz/react';

const f = (x: number) => 1.5 * (0.1 * x ** 3 - 0.9 * x ** 2 + 2 * x + 0.6);
const p = plot.plane({ x: [-0.5, 6.5], y: [-0.6, 4], width: 440, height: 260 });
type Rule = plot.RiemannRule;

export default function Riemann() {
  const [a, setA] = useState(0.5);
  const [b, setB] = useState(5.5);
  const [n, setN] = useState(6);
  const [rule, setRule] = useState<Rule>('left');
  const [touched, setTouched] = useState(false);
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const r = plot.riemann(p, f, lo, hi, n, rule);
  const exact = plot.integrate(f, lo, hi);

  const scene = combine(
    plot.axes(p, { xTicks: 1, yTicks: 1 }),
    r,
    plot.fn(p, f, { id: 'f' }),
    plot.segment(p, { x: a, y: 0 }, { x: a, y: f(a) }, { id: 'ga', role: 'guide' }),
    plot.segment(p, { x: b, y: 0 }, { x: b, y: f(b) }, { id: 'gb', role: 'guide' }),
    plot.point(p, a, 0, { id: 'a', draggable: true, hint: !touched, tone: 'active', label: 'a', labelOffset: { x: -4, y: 16 } }),
    plot.point(p, b, 0, { id: 'b', draggable: true, hint: !touched, tone: 'active', label: 'b', labelOffset: { x: -4, y: 16 } }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        height={290}
        viewBox={p.viewBox()}
        onDrag={(e) => {
          setTouched(true);
          const x = Math.round(Math.max(0, Math.min(6, p.toWorld(e.x, e.y).x)) * 10) / 10;
          (e.id === 'a' ? setA : setB)(x);
        }}
      />
      <div className="row">
        <div className="grow"><Slider label="Rectangles" value={n} onChange={setN} min={1} max={40} format={(v) => `n = ${v}`} /></div>
        <Segmented value={rule} onChange={setRule} options={[{ value: 'left', label: 'Left' }, { value: 'mid', label: 'Mid' }, { value: 'right', label: 'Right' }, { value: 'trap', label: 'Trap' }]} />
      </div>
      <div className="stats">
        <span>sum = <b>{r.sum.toFixed(4)}</b></span>
        <span>∫ = <b>{exact.toFixed(4)}</b></span>
        <span className={Math.abs(r.sum - exact) < 0.01 ? 'tone-success' : 'tone-danger'}>error = <b>{(r.sum - exact).toFixed(4)}</b></span>
      </div>
      <Challenge
        goals={[
          { label: 'Get the error under 0.01 using at most 10 rectangles', done: n <= 10 && Math.abs(r.sum - exact) < 0.01 },
          { label: 'Make the sum an UNDER-estimate with the left rule', done: rule === 'left' && r.sum < exact - 0.01 },
          { label: 'Get the error under 0.001', done: Math.abs(r.sum - exact) < 0.001 && hi - lo > 1 },
        ]}
      />
    </>
  );
}
