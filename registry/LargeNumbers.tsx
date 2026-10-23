// Roll a die again and again. Early on the frequencies jump around; with more rolls they
// settle toward 1/6 each, and the running average settles toward 3.5.
import { useEffect, useMemo, useState } from 'react';
import { combine, path, translate } from '@dsviz/core';
import { axes, label, niceTicks, plane, segment } from '@dsviz/plot';
import { bars } from '@dsviz/prob';
import { Button, Diagram, Switch, useTicker } from '@dsviz/react';

const roll = () => 1 + Math.floor(Math.random() * 6);

export default function LargeNumbers() {
  const [rolls, setRolls] = useState<number[]>(() => Array.from({ length: 12 }, roll));
  const [auto, setAuto] = useState(false);
  const tick = useTicker(80, auto);
  const more = (k: number) => setRolls((r) => [...r, ...Array.from({ length: k }, roll)]);
  useEffect(() => { if (auto) more(rolls.length < 100 ? 1 : 10); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const n = rolls.length;
  const freq = [1, 2, 3, 4, 5, 6].map((face) => (n ? rolls.filter((r) => r === face).length / n : 0));

  const scene = useMemo(() => {
    const chart = bars(freq, {
      id: 'freq', width: 210, height: 150, max: 0.4, reference: 1 / 6,
      labels: [1, 2, 3, 4, 5, 6], showValues: n > 0, format: (v) => `${Math.round(v * 100)}%`,
    });
    // running mean, plotted against roll number; the x-range grows as you roll
    const p = plane({ x: [0, Math.max(20, n)], y: [1, 6], width: 230, height: 150 });
    const means: Array<[number, number]> = [];
    let s = 0;
    const step = Math.max(1, Math.floor(n / 200)); // at most ~200 points
    rolls.forEach((r, i) => {
      s += r;
      if (i % step === 0 || i === n - 1) means.push([p.sx(i + 1), p.sy(s / (i + 1))]);
    });
    const line = combine(
      axes(p, { yTicks: [1, 2, 3, 4, 5, 6], xTicks: niceTicks(0, Math.max(20, n), 4), grid: false, hideZero: false }),
      segment(p, { x: 0, y: 3.5 }, { x: Math.max(20, n), y: 3.5 }, { id: 'ev', role: 'guide' }),
      label(p, Math.max(20, n), 3.5, '3.5', { id: 'ev-label', anchor: 'start', dx: 6, size: 11 }),
      means.length > 1 && path({ id: 'mean', points: means, role: 'curve', tone: 'accent', width: 2 }),
    );
    return combine(chart, translate(line, 270, 0));
  }, [rolls]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Diagram scene={scene} viewBox={[-20, -24, 540, 210]} />
      <div className="row">
        <Button variant="primary" onClick={() => more(1)}>Roll</Button>
        <Button onClick={() => more(10)}>+10</Button>
        <Button onClick={() => more(100)}>+100</Button>
        <Button onClick={() => { setRolls([]); setAuto(false); }}>Reset</Button>
        <Switch label="Auto" checked={auto} onChange={setAuto} />
      </div>
      <div className="stats">
        <span>rolls = <b>{n}</b></span>
        <span>mean = <b>{n ? (rolls.reduce((a, b) => a + b, 0) / n).toFixed(3) : '—'}</b></span>
        <span>expected = <b>3.5</b></span>
      </div>
    </>
  );
}
