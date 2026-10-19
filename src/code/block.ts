/**
 * Code blocks inside a diagram: monospace lines with line numbers and
 * highlighted ranges, for pointing at code beside a picture of what it does.
 *
 * Why in the SVG and not as HTML next to it? So an arrow can point from a line
 * to a box (`line(n)` and `right(n)` are anchors), and so the whole figure
 * exports as one SVG. For a code panel that sits beside a diagram, the React
 * `<CodeTrace>` is the better fit.
 *
 * Ids: each line is keyed by its number and each highlight by its position in
 * the list, so moving a highlight from lines 3–4 to 7–9 slides one band down
 * instead of fading one out and another in. Monospace text is the one place
 * where the width estimate is exact enough to size things by: every character
 * is the same width (0.6 em is close for common code fonts).
 */
import { Box, Scene, SceneNode, Tone, estimateTextWidth, rect, text } from '../scene';
import { V2, Vec } from '../vec';

export interface CodeBlockOptions {
  id?: string;
  /** Top-left corner. */
  x?: number;
  y?: number;
  /** Line ranges to highlight, 1-based and inclusive: [[3, 5], [9, 9]]. */
  highlight?: readonly (readonly [number, number])[];
  /** Tone of the highlight bands. Default 'active'. */
  tone?: Tone;
  /** Show line numbers. Default true. */
  numbers?: boolean;
  /** The first line's number. Default 1. */
  start?: number;
  /** Font size. Default 13. */
  size?: number;
  /** Line height. Default 1.6 × size. */
  lineHeight?: number;
  /** Minimum width of the block. */
  width?: number;
  /** For a host that highlights syntax itself; dsviz draws plain text. Kept in `data`. */
  language?: string;
  /** Faded lines (not highlighted ones) when something is highlighted. Default false. */
  dimOthers?: boolean;
}

export interface CodeBlock extends Scene {
  /** Left end of line n's text (1-based, or as numbered by `start`), vertically centred. */
  line(n: number): Vec;
  /** Right edge of the block at line n: where an arrow to something beside it starts. */
  right(n: number): Vec;
  box: Box;
}

const CHAR = 0.6;

export function block(source: string | readonly string[], o: CodeBlockOptions = {}): CodeBlock {
  const id = o.id ?? 'code';
  const size = o.size ?? 13, lh = o.lineHeight ?? Math.round(size * 1.6);
  const start = o.start ?? 1;
  const lines = (typeof source === 'string' ? source.replace(/\n$/, '').split('\n') : [...source]).map((l) => l.replace(/\t/g, '    '));
  const x0 = o.x ?? 0, y0 = o.y ?? 0, pad = 10;
  const numbers = o.numbers !== false;
  const gutter = numbers ? estimateTextWidth(String(start + lines.length - 1), size) + 14 : 0;
  const textX = x0 + pad + gutter;
  const longest = Math.max(0, ...lines.map((l) => l.length));
  const w = Math.max(o.width ?? 0, gutter + longest * size * CHAR + 2 * pad);
  const h = lines.length * lh + 2 * pad;
  const lineY = (i: number) => y0 + pad + i * lh + lh / 2; // i is 0-based here
  const lit = (n: number) => (o.highlight ?? []).some(([a, b]) => n >= a && n <= b);

  const nodes: SceneNode[] = [rect({ id: `${id}:bg`, x: x0 + w / 2, y: y0 + h / 2, w, h, rx: 8, role: 'code-bg', data: { language: o.language } })];
  (o.highlight ?? []).forEach(([a, b], k) => {
    const lo = Math.max(start, Math.min(a, b)), hi = Math.min(start + lines.length - 1, Math.max(a, b));
    if (hi < lo) return;
    const top = lineY(lo - start) - lh / 2, bottom = lineY(hi - start) + lh / 2;
    nodes.push(rect({ id: `${id}:hl:${k}`, x: x0 + w / 2, y: (top + bottom) / 2, w: w - 4, h: bottom - top, rx: 4, role: 'code-highlight', tone: o.tone ?? 'active' }));
  });
  lines.forEach((l, i) => {
    const n = start + i, y = lineY(i);
    const fade = o.dimOthers && o.highlight?.length && !lit(n) ? 0.45 : undefined;
    if (numbers) nodes.push(text({ id: `${id}:num:${n}`, x: textX - 12, y, text: String(n), size, anchor: 'end', role: 'code-number', opacity: fade }));
    // SVG collapses runs of spaces; no-break spaces keep the indentation
    if (l) nodes.push(text({ id: `${id}:line:${n}`, x: textX, y, text: l.replace(/ /g, ' '), size, anchor: 'start', role: 'code-line', opacity: fade, data: { line: n } }));
  });
  return {
    nodes,
    line: (n) => V2(textX, lineY(n - start)),
    right: (n) => V2(x0 + w, lineY(n - start)),
    box: { x: x0, y: y0, w, h },
  };
}
