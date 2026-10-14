export const V2 = (x, y) => ({ x, y });
export const vadd = (a, b) => V2(a.x + b.x, a.y + b.y);
export const vsub = (a, b) => V2(a.x - b.x, a.y - b.y);
export const vscale = (a, k) => V2(a.x * k, a.y * k);
export const vlen = (a) => Math.hypot(a.x, a.y);
export const vdist = (a, b) => vlen(vsub(a, b));
export const vlerp = (a, b, t) => V2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
/** Unit vector in the same direction (or (0,0) for the zero vector). */
export const vnorm = (a) => {
    const l = vlen(a);
    return l < 1e-9 ? V2(0, 0) : V2(a.x / l, a.y / l);
};
/** Rotate 90° clockwise on screen (because +y is down). */
export const vperp = (a) => V2(-a.y, a.x);
