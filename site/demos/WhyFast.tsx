// Why binary search is fast: every step halves the interval, so n values take about log₂ n steps.
// The slider moves the EXPONENT, so each notch doubles n.
import { combine, rect, text } from 'dsviz';
import { Diagram, Slider } from 'dsviz/react';
import { useState } from 'react';

const steps = (n: number) => Math.floor(Math.log2(n)) + 1;

export default function WhyFast() {
  const [k, setK] = useState(6);
  const n = 2 ** k;

  // Halving chips: n, n/2, … 1. Keyed by position in the chain, so they slide as n changes.
  const sizes: number[] = [];
  for (let s = n; s >= 1; s = Math.floor(s / 2)) sizes.push(s);
  const chipW = 34, gap = 6;
  const chips = sizes.flatMap((s, i) => {
    const x = i * (chipW + gap) + chipW / 2;
    const label = s >= 1000 ? `${Math.round(s / 1024)}k` : String(s);
    return [
      rect({ id: `chip:${i}`, x, y: 12, w: chipW, h: 24, rx: 6, tone: i === sizes.length - 1 ? 'success' : undefined }),
      text({ id: `chip:${i}:t`, x, y: 12, text: label, size: 10, role: 'value' }),
    ];
  });

  // Both bars on one scale: the linear scan is always full width.
  const W = 380;
  const bar = (id: string, y: number, v: number, tone: 'success' | 'muted', label: string) => [
    text({ id: `${id}:l`, x: 0, y, text: label, size: 11, anchor: 'start', role: 'caption' }),
    rect({ id: `${id}:track`, x: 100 + W / 2, y, w: W, h: 6, rx: 3, role: 'track' }),
    rect({ id: `${id}:bar`, x: 100 + Math.max(3, (W * v) / n) / 2, y, w: Math.max(3, (W * v) / n), h: 6, rx: 3, tone }),
    text({ id: `${id}:v`, x: 100 + W + 50, y, text: v.toLocaleString(), size: 11, anchor: 'end', role: 'value' }),
  ];

  return (
    <>
      <Slider label="Array size" value={k} onChange={setK} min={1} max={20} ticks={Array.from({ length: 20 }, (_, i) => i + 1)} format={() => `n = ${n.toLocaleString()}`} />
      <Diagram
        scene={combine(chips, bar('bin', 72, steps(n), 'success', 'Binary search'), bar('lin', 98, n, 'muted', 'Linear scan'))}
        height={130}
        viewBox={[-8, -10, 548, 125]}
      />
      <p className="status">
        At n = {n.toLocaleString()}, binary search needs <b className="tone-success">{steps(n)}</b> comparisons where a scan needs up to <b>{n.toLocaleString()}</b>.
      </p>
      <p className="hint">Drag to the end: a million values, twenty-one questions.</p>
    </>
  );
}
