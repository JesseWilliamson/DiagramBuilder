import { useEffect, useState } from 'react';
import { combine, plot } from 'dsviz';
import { Diagram, useTicker } from 'dsviz/react';

// A function morphing through a few shapes, with its Riemann rectangles and a
// tangent riding along. Everything keyed, so it all tweens.
const fns: Array<[string, (x: number) => number]> = [
  ['sin x + 1.5', (x) => Math.sin(x) + 1.5],
  ['x²/4', (x) => (x * x) / 4],
  ['2 − |x|/2', (x) => 2 - Math.abs(x) / 2],
  ['eˣ / 8', (x) => Math.exp(x) / 8],
  ['1.2 + cos 2x', (x) => 1.2 + 0.8 * Math.cos(2 * x)],
];
const p = plot.plane({ x: [-3.2, 3.2], y: [-0.4, 3], width: 520, height: 250 });

export function Hero() {
  const tick = useTicker(2400);
  const [x0, setX0] = useState(0.8);
  useEffect(() => setX0(-2 + ((tick * 1.37) % 4)), [tick]);
  const [name, f] = fns[tick % fns.length];
  const r = plot.riemann(p, f, -2.5, 2.5, 10 + (tick % 3) * 5, 'mid', { tone: 'accent' });
  const scene = combine(
    plot.axes(p, { xTicks: 1, yTicks: 1, labels: false }),
    r,
    plot.fn(p, f, { id: 'f', width: 2.5 }),
    plot.tangent(p, f, x0, { id: 't', span: 0.9 }),
    plot.point(p, x0, f(x0), { id: 'P', tone: 'active' }),
  );
  return (
    <div className="hero-card">
      <Diagram scene={scene} height={260} viewBox={p.viewBox([12, 12, 12, 12])} duration={900} label="A function morphing between shapes with its Riemann sum" />
      <div className="cap"><span>f(x) = {name}</span><span>Σ ≈ {r.sum.toFixed(3)}</span></div>
    </div>
  );
}
