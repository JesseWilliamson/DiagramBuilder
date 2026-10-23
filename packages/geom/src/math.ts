/**
 * Plane geometry helpers. All take and return plain {x, y} points and work
 * the same in pixel or world coordinates (nothing here assumes y up or down,
 * except `signedArea`'s sign).
 */
import { V2, Vec, vadd, vdist, vscale, vsub } from '@dsviz/core';

export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const cross = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x;

/** The (unsigned, ≤ π) angle at vertex B in the triangle A-B-C, in radians. */
export function angleAt(a: Vec, b: Vec, c: Vec): number {
  const u = vsub(a, b), v = vsub(c, b);
  return Math.atan2(Math.abs(cross(u, v)), dot(u, v));
}

export const toDegrees = (rad: number) => (rad * 180) / Math.PI;

/** Where the infinite lines AB and CD cross, or null if parallel. */
export function lineIntersection(a: Vec, b: Vec, c: Vec, d: Vec): Vec | null {
  const r = vsub(b, a), s = vsub(d, c);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-12) return null;
  const t = cross(vsub(c, a), s) / den;
  return vadd(a, vscale(r, t));
}

/** Intersection points of two circles: 0, 1 (tangent) or 2 points. */
export function circleIntersections(c1: Vec, r1: number, c2: Vec, r2: number): Vec[] {
  const d = vdist(c1, c2);
  if (d < 1e-12 || d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const ux = (c2.x - c1.x) / d, uy = (c2.y - c1.y) / d;
  const m = V2(c1.x + a * ux, c1.y + a * uy);
  if (h < 1e-9) return [m];
  return [V2(m.x - h * uy, m.y + h * ux), V2(m.x + h * uy, m.y - h * ux)];
}

/** The foot of the perpendicular from P onto the line AB. */
export function footOfPerpendicular(p: Vec, a: Vec, b: Vec): Vec {
  const ab = vsub(b, a);
  const t = dot(vsub(p, a), ab) / (dot(ab, ab) || 1);
  return vadd(a, vscale(ab, t));
}

/** Circle through three points, or null if they are collinear. */
export function circumcircle(a: Vec, b: Vec, c: Vec): { center: Vec; r: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  const center = V2((a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d, (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d);
  return { center, r: vdist(center, a) };
}

/** Circle tangent to all three sides. */
export function incircle(a: Vec, b: Vec, c: Vec): { center: Vec; r: number } {
  const la = vdist(b, c), lb = vdist(a, c), lc = vdist(a, b);
  const p = la + lb + lc || 1;
  const center = V2((la * a.x + lb * b.x + lc * c.x) / p, (la * a.y + lb * b.y + lc * c.y) / p);
  return { center, r: Math.abs(signedArea([a, b, c])) / (p / 2) };
}

export const centroid = (pts: readonly Vec[]): Vec =>
  vscale(pts.reduce((s, p) => vadd(s, p), V2(0, 0)), 1 / Math.max(1, pts.length));

/** Intersection of the altitudes. */
export function orthocenter(a: Vec, b: Vec, c: Vec): Vec | null {
  return lineIntersection(a, footOfPerpendicular(a, b, c), b, footOfPerpendicular(b, a, c));
}

/** Shoelace formula. Positive when the points go counter-clockwise in a y-up system. */
export function signedArea(pts: readonly Vec[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) s += cross(pts[i], pts[(i + 1) % pts.length]);
  return s / 2;
}

/** Evenly spaced points on a circular arc from angle a0 to a1 (radians, counter-clockwise if a1 > a0). */
export function arcPoints(center: Vec, r: number, a0: number, a1: number, n: number): Array<[number, number]> {
  return Array.from({ length: n }, (_, i) => {
    const t = a0 + ((a1 - a0) * i) / Math.max(1, n - 1);
    return [center.x + r * Math.cos(t), center.y + r * Math.sin(t)] as [number, number];
  });
}
