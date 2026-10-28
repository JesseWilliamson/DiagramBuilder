/**
 * Bar charts for distributions. Bars grow from a baseline, keyed by index, so
 * changing the data makes each bar grow or shrink in place.
 */
import { Scene, SceneNode, Tone, V2, Vec, path, rect, text } from '../core';
import { ToneSpec, resolveTone } from './common';

export interface BarsOptions {
  id?: string;
  /** Top-left of the chart area. */
  x?: number;
  y?: number;
  /** Size of the plotting area (bars only, labels sit outside). Default 320 × 160. */
  width?: number;
  height?: number;
  /** Category labels under each bar. */
  labels?: readonly (string | number)[];
  /** The value that reaches the top. Default: the largest value. */
  max?: number;
  tones?: ToneSpec<number, number>;
  /** Value text above each bar. */
  showValues?: boolean;
  format?: (v: number, i: number) => string;
  /** Bar width as a fraction of its slot. Default 0.7. */
  fill?: number;
  /** Draw a dashed reference line at this value (e.g. the expected count). */
  reference?: number;
  interactive?: boolean;
}

export interface BarsDiagram extends Scene {
  /** Centre of the top edge of bar i. */
  top(i: number): Vec;
  /** Centre of bar i on the baseline. */
  base(i: number): Vec;
  /** y pixel for a value. */
  yOf(v: number): number;
}

export function bars(values: readonly number[], o: BarsOptions = {}): BarsDiagram {
  const id = o.id ?? 'bars';
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const W = o.width ?? 320, H = o.height ?? 160;
  const max = o.max ?? Math.max(1e-9, ...values);
  const slot = W / Math.max(1, values.length);
  const bw = slot * (o.fill ?? 0.7);
  const yOf = (v: number) => y0 + H - (Math.max(0, v) / max) * H;
  const cx = (i: number) => x0 + slot * (i + 0.5);
  const nodes: SceneNode[] = [];
  values.forEach((v, i) => {
    const top = Math.min(yOf(v), y0 + H);
    const h = y0 + H - top;
    nodes.push(
      rect({
        // a zero-height bar would still draw its outline as a stray line, so hide it (but keep its id, so it can grow back)
        id: `${id}:bar:${i}`, x: cx(i), y: top + h / 2, w: bw, h, rx: Math.min(3, bw / 4), opacity: h < 0.5 ? 0 : 1,
        role: 'bar', tone: resolveTone(o.tones, i, v),
        enter: { y: y0 + H, h: 0 }, interactive: o.interactive, data: { index: i, value: v },
      }),
    );
    if (o.showValues) nodes.push(text({ id: `${id}:val:${i}`, x: cx(i), y: top - 9, text: o.format ? o.format(v, i) : String(v), size: 11, role: 'value', enter: { y: y0 + H - 9 } }));
    if (o.labels) nodes.push(text({ id: `${id}:label:${i}`, x: cx(i), y: y0 + H + 13, text: String(o.labels[i] ?? ''), size: 12, role: 'index' }));
  });
  nodes.push(path({ id: `${id}:baseline`, points: [[x0, y0 + H], [x0 + W, y0 + H]], role: 'axis', width: 1 }));
  if (o.reference !== undefined) nodes.push(path({ id: `${id}:ref`, points: [[x0, yOf(o.reference)], [x0 + W, yOf(o.reference)]], role: 'guide', width: 1.25 }));
  return { nodes, top: (i) => V2(cx(i), yOf(values[i])), base: (i) => V2(cx(i), y0 + H), yOf };
}

export interface SampleSpaceOptions {
  id?: string;
  x?: number;
  y?: number;
  cell?: number;
  gap?: number;
  /** Text inside cell (r, c). Default: nothing. */
  text?: (r: number, c: number) => string;
  tones?: (r: number, c: number) => Tone | undefined;
  interactive?: boolean;
  /** Header labels; e.g. die faces. */
  rowLabels?: readonly (string | number)[];
  colLabels?: readonly (string | number)[];
}

export interface SampleSpaceDiagram extends Scene {
  center(r: number, c: number): Vec;
}

/**
 * A grid of equally likely outcomes, e.g. two dice: 6 × 6 = 36 cells. Count
 * the highlighted cells and divide by the total: that's the probability.
 * Cells carry `{ r, c }` in `data`, so clicks tell you which outcome was hit.
 */
export function sampleSpace(rows: number, cols: number, o: SampleSpaceOptions = {}): SampleSpaceDiagram {
  const id = o.id ?? 'space';
  const cell = o.cell ?? 30, gap = o.gap ?? 4;
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const center = (r: number, c: number) => V2(x0 + c * (cell + gap) + cell / 2, y0 + r * (cell + gap) + cell / 2);
  const nodes: SceneNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = center(r, c);
      const tone = o.tones?.(r, c);
      nodes.push(rect({ id: `${id}:${r}:${c}`, x: p.x, y: p.y, w: cell, h: cell, rx: 4, tone, interactive: o.interactive, data: { r, c } }));
      const s = o.text?.(r, c);
      if (s) nodes.push(text({ id: `${id}:${r}:${c}:t`, x: p.x, y: p.y, text: s, size: Math.round(cell * 0.42), role: 'value', tone: tone === 'muted' ? 'muted' : undefined }));
    }
  }
  o.colLabels?.forEach((l, c) => nodes.push(text({ id: `${id}:col:${c}`, x: center(0, c).x, y: y0 - 12, text: String(l), size: 11, role: 'index' })));
  o.rowLabels?.forEach((l, r) => nodes.push(text({ id: `${id}:row:${r}`, x: x0 - 12, y: center(r, 0).y, text: String(l), size: 11, role: 'index', anchor: 'end' })));
  return { nodes, center };
}

/** The six pips of a die face as a small group of dots, centred at (x, y). */
export function diePips(face: number, x: number, y: number, o: { id: string; size?: number; tone?: Tone }): Scene {
  const s = o.size ?? 30;
  const q = s * 0.26;
  const layout: Record<number, Array<[number, number]>> = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };
  const nodes: SceneNode[] = [rect({ id: o.id, x, y, w: s, h: s, rx: s * 0.2, tone: o.tone })];
  // pips keyed by slot number so going 5 → 6 moves pips rather than replacing them all
  (layout[face] ?? []).forEach(([dx, dy], i) =>
    nodes.push({ kind: 'circle', id: `${o.id}:pip:${i}`, x: x + dx * q, y: y + dy * q, r: s * 0.08, role: 'dot' }),
  );
  return { nodes };
}
