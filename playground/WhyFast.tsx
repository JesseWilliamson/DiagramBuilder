import { useMemo, useState } from 'react';
import { combine, rect, text } from '../src';
import { Diagram, Slider } from '../src/react';

/** Sizes the slider can pick: 2^1 … 2^20. The slider moves the EXPONENT so every notch doubles n. */
const steps = (n: number) => Math.floor(Math.log2(n)) + 1;

export function WhyFast() {
  const [k, setK] = useState(6);
  const n = 2 ** k;

  const scene = useMemo(() => {
    // Halving chips: n, n/2, … 1
    const sizes: number[] = [];
    for (let s = n; s >= 1; s = Math.floor(s / 2)) sizes.push(s);
    const chipW = 30, gap = 8;
    const chips = sizes.flatMap((s, i) => {
      const x = i * (chipW + gap) + chipW / 2;
      // keyed by position in the halving chain: chips slide/fade as n changes
      return [
        rect({ id: `chip:${i}`, x, y: 12, w: chipW, h: 24, rx: 8, tone: i === sizes.length - 1 ? 'success' : undefined }),
        text({ id: `chip:${i}:t`, x, y: 12, text: String(s), size: 11, role: 'value' }),
      ];
    });
    // Bars share one scale: the linear scan is always the full width.
    const W = 380;
    const bin = steps(n);
    const bar = (id: string, y: number, v: number, tone: string, label: string) => [
      text({ id: `${id}:l`, x: 0, y, text: label, size: 11, anchor: 'start', role: 'caption' }),
      rect({ id: `${id}:track`, x: 95 + W / 2, y, w: W, h: 6, rx: 3, tone: 'muted' }),
      rect({ id: `${id}:bar`, x: 95 + (W * v) / n / 2, y, w: Math.max(2, (W * v) / n), h: 6, rx: 3, tone }),
      text({ id: `${id}:v`, x: 95 + W + 24, y, text: String(v), size: 11, anchor: 'end', role: 'value' }),
    ];
    return combine(chips, bar('bin', 70, bin, 'success', 'Binary search'), bar('lin', 96, n, 'muted', 'Linear scan'));
  }, [n]);

  return (
    <div className="card">
      <Slider label="Array size" value={k} onChange={setK} min={1} max={20} ticks={Array.from({ length: 20 }, (_, i) => i + 1)} format={() => `n = ${n.toLocaleString()}`} />
      <Diagram scene={scene} height={130} viewBox={[-8, -12, 520, 130]} label="Halving steps and a comparison with linear scan" />
      <p className="note">At n = {n.toLocaleString()}, binary search needs {steps(n)} comparisons where a scan needs up to {n.toLocaleString()}.</p>
    </div>
  );
}
