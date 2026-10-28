// Drag the point along the curve. The yellow line is the tangent; its slope is
// the derivative. "Show f′" plots every slope as a height, as its own curve.
import { useState } from 'react';
import { combine } from 'dsviz';
import { axes, fn, plane, point, segment, tangent } from 'dsviz/plot';
import { Diagram, MathText, Segmented, Switch } from 'dsviz/react';

const fns = {
  'sin x': { f: Math.sin, df: Math.cos },
  'x²/2 − 1': { f: (x: number) => x * x / 2 - 1, df: (x: number) => x },
  'x³/3 − x': { f: (x: number) => x ** 3 / 3 - x, df: (x: number) => x * x - 1 },
};
type Name = keyof typeof fns;

const p = plane({ x: [-4, 4], y: [-3, 3], width: 400, height: 300 });

export default function Tangent() {
  const [name, setName] = useState<Name>('sin x');
  const [x0, setX0] = useState(1);
  const [showDf, setShowDf] = useState(false);
  const [touched, setTouched] = useState(false);
  const { f, df } = fns[name];
  const t = tangent(p, f, x0, { id: 'tangent', span: 1.4 });

  const scene = combine(
    axes(p, { xLabel: 'x', yLabel: 'y' }),
    // every curve has the same number of samples, so switching functions morphs point for point
    showDf && fn(p, df, { id: 'df', tone: 'visited', dashed: true, width: 2 }),
    fn(p, f, { id: 'f' }),
    showDf && segment(p, { x: x0, y: f(x0) }, { x: x0, y: df(x0) }, { id: 'link', role: 'guide' }),
    t,
    showDf && point(p, x0, df(x0), { id: 'Q', tone: 'visited' }),
    point(p, x0, f(x0), { id: 'P', draggable: true, hint: !touched }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={p.viewBox()}
        onDrag={(e) => { setTouched(true); setX0(Math.max(-3.9, Math.min(3.9, p.toWorld(e.x, e.y).x))); }}
      />
      <div className="row spread">
        <Segmented value={name} onChange={setName} options={Object.keys(fns) as Name[]} />
        <Switch label="Show f′" checked={showDf} onChange={setShowDf} />
      </div>
      <p className="stats formula">
        <span><MathText tex="x =" /> <b>{x0.toFixed(2)}</b></span>
        <span><MathText tex="f(x) =" /> <b>{f(x0).toFixed(2)}</b></span>
        <span className="tone-active"><MathText tex="f'(x) =" /> <b>{t.slope.toFixed(2)}</b></span>
      </p>
    </>
  );
}
