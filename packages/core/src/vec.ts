/**
 * Tiny 2D vector helpers. Everything in figurae uses plain `{x, y}` objects
 * (not a class) so that positions stay serialisable and easy to diff.
 *
 * Coordinates are SVG-native: +x goes right, +y goes DOWN.
 */
export interface Vec {
  x: number;
  y: number;
}

export const V2 = (x: number, y: number): Vec => ({ x, y });
export const vadd = (a: Vec, b: Vec): Vec => V2(a.x + b.x, a.y + b.y);
export const vsub = (a: Vec, b: Vec): Vec => V2(a.x - b.x, a.y - b.y);
export const vscale = (a: Vec, k: number): Vec => V2(a.x * k, a.y * k);
export const vlen = (a: Vec): number => Math.hypot(a.x, a.y);
export const vdist = (a: Vec, b: Vec): number => vlen(vsub(a, b));
export const vlerp = (a: Vec, b: Vec, t: number): Vec =>
  V2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

/** Unit vector in the same direction (or (0,0) for the zero vector). */
export const vnorm = (a: Vec): Vec => {
  const l = vlen(a);
  return l < 1e-9 ? V2(0, 0) : V2(a.x / l, a.y / l);
};

/** Rotate 90° clockwise on screen (because +y is down). */
export const vperp = (a: Vec): Vec => V2(-a.y, a.x);
