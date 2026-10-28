/**
 * Path geometry: SVG path data for a point list, and resampling.
 *
 * Resampling is the interesting part. To tween shape A (n points) into shape B
 * (m points) you need a point-to-point pairing. Walking along each shape by
 * ARC LENGTH gives a natural one: "the point 30% of the way along" in A pairs
 * with the point 30% of the way along in B. So we resample the old shape to m
 * evenly spaced points and tween those.
 */
import { NumericProps } from './scene';

type Pt = readonly [number, number];

const r = (v: number) => String(Math.round(v * 100) / 100);

/**
 * `d` attribute for the points. Straight segments, or (smooth) a Catmull-Rom
 * spline converted to cubic Béziers: for the segment P1→P2 the control points
 * are P1 + (P2-P0)/6 and P2 - (P3-P1)/6. Endpoints reuse themselves as their
 * missing neighbour (open) or wrap around (closed).
 */
export function pathData(pts: ReadonlyArray<Pt>, closed: boolean, smooth: boolean): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${r(pts[0][0])} ${r(pts[0][1])}`;
  const at = (i: number): Pt => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${r(pts[0][0])} ${r(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p1 = at(i), p2 = at(i + 1);
    if (!smooth) d += `L${r(p2[0])} ${r(p2[1])}`;
    else {
      const p0 = at(i - 1), p3 = at(i + 2);
      d += `C${r(p1[0] + (p2[0] - p0[0]) / 6)} ${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)} ${r(p2[1] - (p3[1] - p1[1]) / 6)} ${r(p2[0])} ${r(p2[1])}`;
    }
  }
  return closed ? d + 'Z' : d;
}

/**
 * `d` attribute for a dot at each point: a zero-length segment per point,
 * which a round line cap draws as a dot as wide as the stroke.
 */
export function dotData(pts: ReadonlyArray<Pt>): string {
  return pts.map(([x, y]) => `M${r(x)} ${r(y)}h0`).join('');
}

/** `count` points spaced evenly by arc length along the polyline through `pts`. */
export function resample(pts: ReadonlyArray<Pt>, count: number, closed = false): Array<[number, number]> {
  if (!pts.length || count <= 0) return [];
  if (pts.length === 1) return Array.from({ length: count }, () => [pts[0][0], pts[0][1]]);
  const ring = closed ? [...pts, pts[0]] : pts;
  const cum = [0];
  for (let i = 1; i < ring.length; i++) cum.push(cum[i - 1] + Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]));
  const total = cum[cum.length - 1];
  const out: Array<[number, number]> = [];
  let seg = 1;
  for (let k = 0; k < count; k++) {
    // closed shapes don't repeat the start point; open ones end exactly on the last point
    const frac = count === 1 ? 0 : closed ? k / count : k / (count - 1);
    const target = frac * total;
    while (seg < cum.length - 1 && cum[seg] < target) seg++;
    const span = cum[seg] - cum[seg - 1];
    const t = span === 0 ? 0 : (target - cum[seg - 1]) / span;
    out.push([ring[seg - 1][0] + (ring[seg][0] - ring[seg - 1][0]) * t, ring[seg - 1][1] + (ring[seg][1] - ring[seg - 1][1]) * t]);
  }
  return out;
}

/** Resample the points stored in a flat numeric bag (p0 p1 …), returning a bag with `to` points. */
export function resampleProps(cur: NumericProps, from: number, to: number, closed: boolean): NumericProps {
  const pts: Pt[] = Array.from({ length: from }, (_, i) => [cur[`p${2 * i}`], cur[`p${2 * i + 1}`]] as Pt);
  const out: NumericProps = {};
  resample(pts, to, closed).forEach(([x, y], i) => ((out[`p${2 * i}`] = x), (out[`p${2 * i + 1}`] = y)));
  return out;
}
