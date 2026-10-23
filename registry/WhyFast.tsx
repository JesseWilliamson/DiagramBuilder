// Why binary search is fast: every step halves what's left, so n values need
// about log₂ n steps. The slider moves the exponent, so each notch doubles n.
import { useState } from 'react';
import { combine, rect, text } from '@figurae/core';
import { Diagram, Slider } from '@figurae/react';

const steps = (n: number) => Math.floor(Math.log2(n)) + 1;
const short = (v: number) => (v >= 2 ** 20 ? `${v / 2 ** 20}M` : v >= 1024 ? `${v / 1024}k` : String(v));

const CHIP = 36, GAP = 6, PER_ROW = 11, BAR = 280;

export default function WhyFast() {
  const [k, setK] = useState(6);
  const n = 2 ** k;

  // n, n/2, …, 1 as chips, wrapping after 11. Keyed by position in the chain,
  // so moving the slider slides chips along rather than redrawing them.
  const sizes = Array.from({ length: k + 1 }, (_, i) => n / 2 ** i);
  const chips = sizes.map((s, i) => {
    const x = (i % PER_ROW) * (CHIP + GAP) + CHIP / 2, y = Math.floor(i / PER_ROW) * 34;
    const last = i === sizes.length - 1;
    return [
      rect({ id: `chip${i}`, x, y, w: CHIP, h: 26, rx: 5, tone: last ? 'success' : undefined }),
      text({ id: `chip${i}:t`, x, y, text: short(s), size: 12, role: 'value' }),
    ];
  });

  // both bars share one scale: the linear scan always fills it
  const top = 34 * Math.ceil(sizes.length / PER_ROW) + 18;
  const bar = (id: string, y: number, v: number, tone: 'success' | 'muted', label: string) => [
    text({ id: `${id}:l`, x: 0, y, text: label, size: 13, anchor: 'start' }),
    rect({ id: `${id}:track`, x: 110 + BAR / 2, y, w: BAR, h: 10, rx: 5, role: 'track' }),
    rect({ id: `${id}:bar`, x: 110 + Math.max(10, (BAR * v) / n) / 2, y, w: Math.max(10, (BAR * v) / n), h: 10, rx: 5, tone }),
    text({ id: `${id}:v`, x: 110 + BAR + 12, y, text: v.toLocaleString(), size: 13, anchor: 'start', role: 'value' }),
  ];

  return (
    <>
      <Slider label="Array size" value={k} onChange={setK} min={1} max={20} format={() => `n = ${n.toLocaleString()}`} />
      <Diagram scene={combine(chips, bar('bin', top, steps(n), 'success', 'Binary search'), bar('lin', top + 28, n, 'muted', 'Linear scan'))} />
      <p className="status">
        <b className="tone-success">{steps(n)}</b> comparisons for binary search, up to <b>{n.toLocaleString()}</b> for a linear scan.
      </p>
    </>
  );
}
