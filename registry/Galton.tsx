// A Galton board. Every peg is a coin flip: left or right. Add up enough flips and
// the bins fill into a bell shape, the binomial distribution, whatever the bias.
import { useEffect, useMemo, useState } from 'react';
import { circle, combine, easeInQuad, path } from '@figurae/core';
import { bars } from '@figurae/prob';
import { Button, Diagram, Slider, Switch, useTicker } from '@figurae/react';

const ROWS = 10, DX = 26, DY = 20;
type Ball = { id: number; path: boolean[]; step: number };

const choose = (n: number, k: number) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const binomial = (n: number, k: number, p: number) => choose(n, k) * p ** k * (1 - p) ** (n - k);

export default function Galton() {
  const [p, setP] = useState(0.5);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [queue, setQueue] = useState(40); // start with a few balls in flight
  const [bins, setBins] = useState<number[]>(() => Array(ROWS + 1).fill(0));
  const [nextId, setNextId] = useState(0);
  const [auto, setAuto] = useState(false);
  const [showCurve, setShowCurve] = useState(true);
  const total = bins.reduce((a, b) => a + b, 0);

  const running = auto || queue > 0 || balls.length > 0;
  const tick = useTicker(110, running);
  useEffect(() => {
    if (!running) return;
    // advance every ball one row; the ones past the last row land in a bin
    const landed: number[] = [];
    const moved = balls.flatMap((b) => {
      // step ROWS + 1 is "sitting on top of its bin"; one tick later it's counted
      if (b.step > ROWS) { landed.push(b.path.filter(Boolean).length); return []; }
      return [{ ...b, step: b.step + 1 }];
    });
    const spawn = auto || queue > 0;
    if (spawn) {
      moved.push({ id: nextId, path: Array.from({ length: ROWS }, () => Math.random() < p), step: 0 });
      setNextId((n) => n + 1);
      if (queue > 0) setQueue((q) => q - 1);
    }
    setBalls(moved);
    if (landed.length) setBins((bs) => bs.map((c, k) => c + landed.filter((l) => l === k).length));
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const binY = ROWS * DY + 8, H = 110;
  const chart = bars(bins, { id: 'bins', x: -((ROWS + 1) * DX) / 2, y: binY, width: (ROWS + 1) * DX, height: H, fill: 0.86, max: Math.max(8, ...bins), tones: () => 'accent' });

  const scene = useMemo(() => {
    const pegs = [];
    for (let r = 0; r < ROWS; r++) for (let i = 0; i <= r; i++) pegs.push(circle({ id: `peg${r}:${i}`, x: (i - r / 2) * DX, y: r * DY + 10, r: 2.2, role: 'dot' }));
    // a ball after `step` flips sits between pegs: x is (rights − step/2) × spacing
    const dots = balls.map((b) => {
      if (b.step > ROWS) {
        // drop onto the top of its bin's stack
        const k = b.path.filter(Boolean).length;
        return circle({ id: `ball${b.id}`, x: chart.base(k).x, y: chart.yOf(bins[k] + 1) - 5, r: 5, tone: 'active' });
      }
      const rights = b.path.slice(0, b.step).filter(Boolean).length;
      return circle({ id: `ball${b.id}`, x: (rights - b.step / 2) * DX, y: b.step * DY, r: 5, tone: 'active', enter: { y: -16 } });
    });
    // expected counts for this many balls, as a smooth dashed curve over the bins
    const curve = showCurve && total > 0 && path({
      id: 'binomial', smooth: true, role: 'curve', tone: 'success', dashed: true, width: 2,
      points: bins.map((_, k) => [chart.base(k).x, chart.yOf(total * binomial(ROWS, k, p))] as [number, number]),
    });
    return combine(pegs, dots, chart, curve);
  }, [balls, bins, showCurve, p]); // eslint-disable-line react-hooks/exhaustive-deps

  const peak = bins.indexOf(Math.max(...bins));
  return (
    <>
      <Diagram scene={scene} viewBox={[-160, -24, 320, binY + H + 50]} duration={110} ease={easeInQuad} />
      <div className="row">
        <Button variant="primary" onClick={() => setQueue((q) => q + 1)}>Drop 1</Button>
        <Button onClick={() => setQueue((q) => q + 25)}>Drop 25</Button>
        <Switch label="Auto" checked={auto} onChange={setAuto} />
        <Switch label="Binomial" checked={showCurve} onChange={setShowCurve} />
        <Button onClick={() => { setBins(Array(ROWS + 1).fill(0)); setBalls([]); setQueue(0); setAuto(false); }}>Reset</Button>
      </div>
      <Slider label="Chance of going right" value={p} onChange={setP} min={0.1} max={0.9} step={0.05} format={(v) => `p = ${v.toFixed(2)}`} />
    </>
  );
}
