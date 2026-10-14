// The path primitive: one closed path, morphing between shapes with different point counts.
// Before tweening, the old shape is resampled (by arc length) to the new point count.
import { useState } from 'react';
import { circle, combine, path, Vec } from 'dsviz';
import { Diagram, Segmented, Slider, Switch } from 'dsviz/react';

type Shape = 'polygon' | 'star' | 'heart' | 'circle';
const R = 100;

function shapePoints(shape: Shape, n: number): Array<[number, number]> {
  const around = (count: number, r: (i: number) => number) =>
    Array.from({ length: count }, (_, i) => {
      const t = -Math.PI / 2 + (2 * Math.PI * i) / count;
      return [r(i) * Math.cos(t), r(i) * Math.sin(t)] as [number, number];
    });
  if (shape === 'polygon') return around(n, () => R);
  if (shape === 'star') return around(2 * n, (i) => (i % 2 ? R * 0.45 : R));
  if (shape === 'circle') return around(72, () => R);
  // heart: a classic parametric curve (y negated because SVG's y points down)
  return Array.from({ length: 80 }, (_, i) => {
    const t = (2 * Math.PI * i) / 80;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [x * 6.2, -y * 6.2 - 10] as [number, number];
  });
}

const tones = { polygon: 'accent', star: 'active', heart: 'danger', circle: 'success' } as const;

export default function Morph() {
  const [shape, setShape] = useState<Shape>('polygon');
  const [n, setN] = useState(5);
  const [smooth, setSmooth] = useState(false);
  const [dots, setDots] = useState(true);
  const pts = shapePoints(shape, n);

  const scene = combine(
    path({ id: 'shape', points: pts, closed: true, smooth, tone: tones[shape], width: 2 }),
    // the vertices themselves, keyed by index: watch them slide when the count changes
    dots && pts.map(([x, y], i) => circle({ id: `pt${i}`, x, y, r: 2.5, role: 'dot' })),
  );

  return (
    <>
      <Diagram scene={scene} viewBox={[-130, -125, 260, 250]} duration={650} />
      <div className="row">
        <Segmented value={shape} onChange={setShape} options={['polygon', 'star', 'heart', 'circle']} />
        <Switch label="Smooth" checked={smooth} onChange={setSmooth} />
        <Switch label="Points" checked={dots} onChange={setDots} />
      </div>
      {(shape === 'polygon' || shape === 'star') && <Slider label="Corners" value={n} onChange={setN} min={3} max={12} format={(v) => String(v)} />}
      <p className="stats"><span>points = <b>{pts.length}</b></span></p>
    </>
  );
}
