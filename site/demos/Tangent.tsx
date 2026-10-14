// Drag the point along the curve. The tangent's slope is the derivative, and with
// "show f′" on, you can see that slope become the HEIGHT of another curve.
import { useEffect, useState } from 'react';
import { combine, plot } from 'dsviz';
import { Challenge, Diagram, Segmented, Switch, useBurst } from 'dsviz/react';

const fns = {
  'sin x': { f: Math.sin, df: Math.cos },
  'x²/2 − 1': { f: (x: number) => x * x / 2 - 1, df: (x: number) => x },
  'x³/3 − x': { f: (x: number) => x ** 3 / 3 - x, df: (x: number) => x * x - 1 },
};
type Name = keyof typeof fns;

const p = plot.plane({ x: [-4, 4], y: [-3, 3], width: 440, height: 300 });

export default function Tangent() {
  const [name, setName] = useState<Name>('sin x');
  const [x0, setX0] = useState(1);
  const [showDf, setShowDf] = useState(false);
  const [touched, setTouched] = useState(false);
  const [flats, setFlats] = useState({ left: false, right: false }); // flat points of the cubic found so far
  const [particles, fire] = useBurst();
  const { f, df } = fns[name];
  const t = plot.tangent(p, f, x0, { id: 'tangent', span: 1.6 });
  const flat = Math.abs(t.slope) < 0.03;
  useEffect(() => {
    if (name === 'x³/3 − x' && flat) setFlats((s) => ({ left: s.left || x0 < 0, right: s.right || x0 > 0 }));
  }, [name, flat, x0]);

  const scene = combine(
    plot.axes(p, { xLabel: 'x', yLabel: 'y' }),
    // same sample count for every function, so switching morphs point-for-point
    showDf && plot.fn(p, df, { id: 'df', tone: 'visited', dashed: true, width: 1.75 }),
    plot.fn(p, f, { id: 'f' }),
    showDf && plot.segment(p, { x: x0, y: f(x0) }, { x: x0, y: df(x0) }, { id: 'link', role: 'guide' }),
    t,
    showDf && plot.point(p, x0, df(x0), { id: 'Q', tone: 'visited', label: `f′ = ${t.slope.toFixed(2)}`, labelOffset: { x: 10, y: 14 } }),
    plot.point(p, x0, f(x0), { id: 'P', draggable: true, hint: !touched, tone: flat ? 'success' : undefined, label: `slope ${t.slope.toFixed(2)}` }),
    particles,
  );

  return (
    <>
      <Diagram
        scene={scene}
        height={320}
        viewBox={p.viewBox()}
        onDrag={(e) => { setTouched(true); setX0(Math.max(-3.9, Math.min(3.9, p.toWorld(e.x, e.y).x))); }}
      />
      <div className="row spread">
        <Segmented value={name} onChange={setName} options={Object.keys(fns) as Name[]} />
        <Switch label="Show f′" checked={showDf} onChange={setShowDf} />
      </div>
      <div className="stats">
        <span>x = <b>{x0.toFixed(2)}</b></span>
        <span>f(x) = <b>{f(x0).toFixed(2)}</b></span>
        <span className="tone-active">slope = <b>{t.slope.toFixed(2)}</b></span>
      </div>
      <Challenge
        goals={[
          { label: 'Find a point where the tangent is flat (slope 0)', done: flat },
          { label: 'Find a point where the slope is exactly 1', done: Math.abs(t.slope - 1) < 0.03 },
          { label: 'On x³/3 − x, find BOTH flat points', done: flats.left && flats.right },
        ]}
        onGoal={() => fire(p.sx(x0), p.sy(f(x0)))}
      />
    </>
  );
}
