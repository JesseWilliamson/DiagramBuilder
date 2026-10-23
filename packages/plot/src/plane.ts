/**
 * A coordinate plane: the mapping between WORLD units (maths, y up) and
 * PIXELS (SVG, y down). Every other plot function takes a plane, so that is
 * the only place this conversion lives.
 *
 *   sx(x) = (x - x0) / (x1 - x0) * width            left → right
 *   sy(y) = (1 - (y - y0) / (y1 - y0)) * height     the `1 -` flips y
 *
 * The plane's pixel box is [0, width] × [0, height]. Pass `plane.viewBox()` to
 * <Diagram viewBox> so the camera stays put while things inside it move (an
 * auto-fitting camera would chase a dragged point around).
 */
import { V2, Vec } from '@figurae/core';

export interface PlaneOptions {
  x: [number, number];
  y: [number, number];
  /** Pixel size of the plotting area. Default 360 × 240. */
  width?: number;
  height?: number;
}

export interface Plane {
  readonly x: [number, number];
  readonly y: [number, number];
  readonly width: number;
  readonly height: number;
  /** World x → pixel x. */
  sx(x: number): number;
  /** World y → pixel y. */
  sy(y: number): number;
  toPx(x: number, y: number): Vec;
  toPx(p: Vec): Vec;
  /** Pixel → world (e.g. a drag position back into maths coordinates). */
  toWorld(px: number, py: number): Vec;
  toWorld(p: Vec): Vec;
  /** Clamp a world point into the visible range. */
  clamp(p: Vec): Vec;
  /** Pixels per world unit along x / y. */
  readonly unitX: number;
  readonly unitY: number;
  /** A viewBox around the plot with room for tick labels. */
  viewBox(pad?: number | [number, number, number, number]): [number, number, number, number];
}

export function plane(o: PlaneOptions): Plane {
  const [x0, x1] = o.x, [y0, y1] = o.y;
  const width = o.width ?? 360, height = o.height ?? 240;
  const sx = (x: number) => ((x - x0) / (x1 - x0)) * width;
  const sy = (y: number) => (1 - (y - y0) / (y1 - y0)) * height;
  const wx = (px: number) => x0 + (px / width) * (x1 - x0);
  const wy = (py: number) => y0 + (1 - py / height) * (y1 - y0);
  return {
    x: o.x,
    y: o.y,
    width,
    height,
    sx,
    sy,
    toPx: ((a: number | Vec, b?: number) => (typeof a === 'number' ? V2(sx(a), sy(b!)) : V2(sx(a.x), sy(a.y)))) as Plane['toPx'],
    toWorld: ((a: number | Vec, b?: number) => (typeof a === 'number' ? V2(wx(a), wy(b!)) : V2(wx(a.x), wy(a.y)))) as Plane['toWorld'],
    clamp: (p) => V2(Math.min(x1, Math.max(x0, p.x)), Math.min(y1, Math.max(y0, p.y))),
    unitX: width / (x1 - x0),
    unitY: height / (y1 - y0),
    viewBox(pad = [30, 30, 28, 34]) {
      const [t, r, b, l] = typeof pad === 'number' ? [pad, pad, pad, pad] : pad;
      return [-l, -t, width + l + r, height + t + b];
    },
  };
}

/** "Nice" tick values: steps of 1, 2 or 5 × 10^k, about `target` of them. */
export function niceTicks(lo: number, hi: number, target = 6): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => span / s <= target) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  return out;
}
