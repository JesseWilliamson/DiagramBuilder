/**
 * Things you draw ON a plane. Each takes the plane first and works in world
 * coordinates, so `point(p, 2, 4)` means the point (2, 4), wherever that lands.
 */
import { handle } from '../handle';
import { Scene, SceneNode, Tone, arrow, path, text } from '../scene';
import { V2, Vec } from '../vec';
import { Plane, niceTicks } from './plane';

type Pt = [number, number];
type Fn = (x: number) => number;

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : String(+v.toFixed(2))).replace('-', '−');

export interface AxesOptions {
  id?: string;
  /** Tick positions, or a step. Default: nice ticks. */
  xTicks?: number[] | number;
  yTicks?: number[] | number;
  grid?: boolean;
  /** Tick labels. Default true. */
  labels?: boolean;
  xLabel?: string;
  yLabel?: string;
  /** Hide the 0 label at the origin (it collides with both axes). Default true. */
  hideZero?: boolean;
}

const ticksFor = (spec: number[] | number | undefined, lo: number, hi: number) => {
  if (Array.isArray(spec)) return spec;
  if (typeof spec === 'number') {
    const out: number[] = [];
    for (let v = Math.ceil(lo / spec) * spec; v <= hi + 1e-9; v += spec) out.push(+v.toPrecision(12));
    return out;
  }
  return niceTicks(lo, hi);
};

/**
 * Axes through the origin (or along the edge when 0 is out of range), with
 * optional grid lines and tick labels. Ticks are keyed by VALUE, so if the
 * plane's range changes the tick for "2" slides to its new place.
 */
export function axes(p: Plane, o: AxesOptions = {}): Scene {
  const id = o.id ?? 'axes';
  const xs = ticksFor(o.xTicks, p.x[0], p.x[1]);
  const ys = ticksFor(o.yTicks, p.y[0], p.y[1]);
  // Axis lines sit at 0 if it's visible, otherwise on the bottom / left edge.
  const ax = p.sy(Math.min(p.y[1], Math.max(p.y[0], 0)));
  const ay = p.sx(Math.min(p.x[1], Math.max(p.x[0], 0)));
  const nodes: SceneNode[] = [];
  if (o.grid ?? true) {
    for (const v of xs) nodes.push(path({ id: `${id}:gx:${v}`, points: [[p.sx(v), 0], [p.sx(v), p.height]], role: 'grid', width: 1 }));
    for (const v of ys) nodes.push(path({ id: `${id}:gy:${v}`, points: [[0, p.sy(v)], [p.width, p.sy(v)]], role: 'grid', width: 1 }));
  }
  nodes.push(
    arrow({ id: `${id}:x`, x1: 0, y1: ax, x2: p.width + 8, y2: ax, role: 'axis', width: 1.25 }),
    arrow({ id: `${id}:y`, x1: ay, y1: p.height, x2: ay, y2: -8, role: 'axis', width: 1.25 }),
  );
  const hideZero = o.hideZero ?? true;
  if (o.labels ?? true) {
    for (const v of xs) {
      if (hideZero && v === 0) continue;
      nodes.push(path({ id: `${id}:tx:${v}`, points: [[p.sx(v), ax - 3], [p.sx(v), ax + 3]], role: 'tick', width: 1 }));
      nodes.push(text({ id: `${id}:lx:${v}`, x: p.sx(v), y: ax + 14, text: fmt(v), size: 11, role: 'index' }));
    }
    for (const v of ys) {
      if (hideZero && v === 0) continue;
      nodes.push(path({ id: `${id}:ty:${v}`, points: [[ay - 3, p.sy(v)], [ay + 3, p.sy(v)]], role: 'tick', width: 1 }));
      nodes.push(text({ id: `${id}:ly:${v}`, x: ay - 8, y: p.sy(v), text: fmt(v), size: 11, role: 'index', anchor: 'end' }));
    }
  }
  if (o.xLabel) nodes.push(text({ id: `${id}:xl`, x: p.width + 14, y: ax, text: o.xLabel, size: 15, role: 'math', anchor: 'start' }));
  if (o.yLabel) nodes.push(text({ id: `${id}:yl`, x: ay, y: -20, text: o.yLabel, size: 15, role: 'math' }));
  return { nodes };
}

export interface FnOptions {
  id?: string;
  tone?: Tone;
  width?: number;
  /** Sample count across the domain. Default 160. Keep it fixed so the curve can morph point-for-point. */
  samples?: number;
  /** Plot only this x-range. Default: the plane's. */
  domain?: [number, number];
  dashed?: boolean;
}

/**
 * Sample y = f(x) into path(s), clipped to the plane. The curve is SPLIT
 * wherever f is undefined (NaN / ±Infinity), leaves the visible y-range, or
 * jumps by more than the plane's height between two samples (tan x, 1/x), so
 * you never get a vertical line through an asymptote.
 * Pieces are keyed `id:0`, `id:1`, … so the main piece keeps its identity.
 */
export function fn(p: Plane, f: Fn, o: FnOptions = {}): Scene {
  const id = o.id ?? 'f';
  const [a, b] = o.domain ?? p.x;
  const n = Math.max(2, o.samples ?? 160);
  const [ylo, yhi] = p.y;
  const span = yhi - ylo;
  const inside = (y: number) => y >= ylo && y <= yhi;
  const pieces: Pt[][] = [];
  let cur: Pt[] = [];
  let prev: { x: number; y: number } | null = null;
  const end = () => {
    if (cur.length > 1) pieces.push(cur);
    cur = [];
  };
  for (let i = 0; i < n; i++) {
    const x = a + ((b - a) * i) / (n - 1);
    const y = f(x);
    if (!Number.isFinite(y)) {
      end();
      prev = null;
      continue;
    }
    if (prev) {
      // a jump bigger than the whole visible range between two samples is an asymptote, not a steep bit
      if (Math.abs(y - prev.y) > span) {
        end();
      } else if (inside(prev.y) !== inside(y)) {
        // crossing the top or bottom edge: add the exact point on the edge, then start/stop the piece
        const edge = (inside(prev.y) ? y : prev.y) > yhi ? yhi : ylo;
        const t = (edge - prev.y) / (y - prev.y);
        const ex = prev.x + (x - prev.x) * t;
        cur.push([p.sx(ex), p.sy(edge)]);
        if (inside(prev.y)) end();
      }
    }
    if (inside(y)) cur.push([p.sx(x), p.sy(y)]);
    prev = { x, y };
  }
  end();
  return {
    nodes: pieces.map((pts, k) => path({ id: `${id}:${k}`, points: pts, role: 'curve', tone: o.tone, width: o.width ?? 2.25, dashed: o.dashed })),
  };
}

export interface PointOptions {
  id: string;
  label?: string;
  tone?: Tone;
  draggable?: boolean;
  r?: number;
  /** Where the label sits relative to the point, in px. Default (8, -10). */
  labelOffset?: Vec;
  data?: unknown;
  /** Pulse a "drag me" ring (turn off once touched). */
  hint?: boolean;
}

/** A dot at world (x, y). With `draggable`, it gets a big hit target; drag events carry `data`. */
export function point(p: Plane, x: number, y: number, o: PointOptions): Scene {
  const c = p.toPx(x, y);
  const off = o.labelOffset ?? V2(8, -12);
  const nodes: SceneNode[] = handle({ id: o.id, x: c.x, y: c.y, r: o.r ?? 5, tone: o.tone, draggable: !!o.draggable, hint: o.hint, data: o.data ?? { id: o.id } });
  if (o.label) nodes.push(text({ id: `${o.id}:label`, x: c.x + off.x, y: c.y + off.y, text: o.label, size: 13, role: 'math', tone: o.tone, anchor: off.x < 0 ? 'end' : 'start' }));
  return { nodes };
}

export interface LineOptions {
  id: string;
  tone?: Tone;
  width?: number;
  dashed?: boolean;
  role?: string;
}

/** Straight segment between two world points. */
export function segment(p: Plane, a: Vec, b: Vec, o: LineOptions): Scene {
  const A = p.toPx(a), B = p.toPx(b);
  return { nodes: [path({ id: o.id, points: [[A.x, A.y], [B.x, B.y]], role: o.role ?? 'curve', tone: o.tone, width: o.width ?? 1.75, dashed: o.dashed })] };
}

/** An arrow from `from` to `to` (world coordinates), e.g. a vector. */
export function vector(p: Plane, from: Vec, to: Vec, o: LineOptions & { label?: string }): Scene {
  const A = p.toPx(from), B = p.toPx(to);
  const nodes: SceneNode[] = [arrow({ id: o.id, x1: A.x, y1: A.y, x2: B.x, y2: B.y, tone: o.tone ?? 'accent', width: o.width ?? 2.25, dashed: o.dashed })];
  if (o.label) {
    // label beside the midpoint, pushed off the line to its left
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    const dx = B.x - A.x, dy = B.y - A.y, l = Math.hypot(dx, dy) || 1;
    nodes.push(text({ id: `${o.id}:label`, x: mx + (dy / l) * 14, y: my - (dx / l) * 14, text: o.label, size: 14, role: 'math', tone: o.tone ?? 'accent' }));
  }
  return { nodes };
}

/** Numerical derivative (central difference). Good to ~1e-6 for smooth f. */
export const derivative = (f: Fn, x: number, h = 1e-4) => (f(x + h) - f(x - h)) / (2 * h);

/**
 * The tangent line to f at x0, drawn `span` world units either side, clipped
 * to the plane. Returns the scene plus the slope it used.
 */
export function tangent(p: Plane, f: Fn, x0: number, o: LineOptions & { span?: number } = { id: 'tangent' }): Scene & { slope: number } {
  const m = derivative(f, x0);
  const y0 = f(x0);
  const span = o.span ?? (p.x[1] - p.x[0]) / 4;
  // shorten the span so the line stays inside the y-range when it is steep
  const maxDx = Math.abs(m) > 1e-9 ? (p.y[1] - p.y[0]) / Math.abs(m) / 1.5 : span;
  const d = Math.min(span, maxDx);
  return { ...segment(p, V2(x0 - d, y0 - m * d), V2(x0 + d, y0 + m * d), { ...o, tone: o.tone ?? 'active' }), slope: m };
}

export interface AreaOptions {
  id?: string;
  tone?: Tone;
  samples?: number;
  /** Shade between f and g instead of f and the x-axis. */
  g?: Fn;
}

/** Shaded region between f and the x-axis (or g) for a ≤ x ≤ b, as one closed path. */
export function area(p: Plane, f: Fn, a: number, b: number, o: AreaOptions = {}): Scene {
  const n = o.samples ?? 80;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const top: Pt[] = [], bottom: Pt[] = [];
  const g = o.g ?? (() => 0);
  for (let i = 0; i < n; i++) {
    const x = lo + ((hi - lo) * i) / (n - 1);
    top.push([p.sx(x), p.sy(clampY(p, f(x)))]);
    bottom.push([p.sx(x), p.sy(clampY(p, g(x)))]);
  }
  return { nodes: [path({ id: o.id ?? 'area', points: [...top, ...bottom.reverse()], closed: true, role: 'area', tone: o.tone })] };
}

const clampY = (p: Plane, y: number) => (Number.isFinite(y) ? Math.min(p.y[1], Math.max(p.y[0], y)) : 0);

export type RiemannRule = 'left' | 'right' | 'mid' | 'trap';

/**
 * Riemann sum of f over [a, b] with n pieces. Each piece is keyed by its INDEX,
 * so changing n makes existing rectangles resize and new ones fade in, rather
 * than everything being replaced. `trap` draws trapezoids (closed paths).
 * Returns the scene and the numeric sum.
 */
export function riemann(p: Plane, f: Fn, a: number, b: number, n: number, rule: RiemannRule = 'left', o: { id?: string; tone?: Tone } = {}): Scene & { sum: number } {
  const id = o.id ?? 'riemann';
  const w = (b - a) / n;
  const nodes: SceneNode[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const xl = a + i * w, xr = xl + w;
    let pts: Pt[];
    if (rule === 'trap') {
      const yl = f(xl), yr = f(xr);
      sum += ((yl + yr) / 2) * w;
      pts = [[xl, 0], [xl, yl], [xr, yr], [xr, 0]];
    } else {
      const h = f(rule === 'left' ? xl : rule === 'right' ? xr : (xl + xr) / 2);
      sum += h * w;
      // 4 points, same as the trapezoid: switching rule morphs instead of popping
      pts = [[xl, 0], [xl, h], [xr, h], [xr, 0]];
    }
    const px = pts.map(([x, y]) => [p.sx(x), p.sy(clampY(p, y))] as Pt);
    const neg = rule === 'trap' ? f(xl) + f(xr) < 0 : px[1][1] > px[0][1];
    nodes.push(path({ id: `${id}:${i}`, points: px, closed: true, role: 'bar', tone: o.tone ?? (neg ? 'danger' : 'accent'), width: 1 }));
  }
  return { nodes, sum };
}

/** Numerical integral by Simpson's rule (n even). */
export function integrate(f: Fn, a: number, b: number, n = 400): number {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/** A maths label at world (x, y): italic serif via role 'math'. */
export function label(p: Plane, x: number, y: number, s: string, o: { id: string; tone?: Tone; size?: number; anchor?: 'start' | 'middle' | 'end'; dx?: number; dy?: number }): Scene {
  const c = p.toPx(x, y);
  return { nodes: [text({ id: o.id, x: c.x + (o.dx ?? 0), y: c.y + (o.dy ?? 0), text: s, size: o.size ?? 14, role: 'math', tone: o.tone, anchor: o.anchor })] };
}
