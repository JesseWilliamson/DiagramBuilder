import { V2, vadd, vnorm, vperp, vscale, vsub } from './vec';
export function numericProps(n) {
    const opacity = n.opacity ?? 1;
    switch (n.kind) {
        case 'circle':
            return { x: n.x, y: n.y, r: n.r, opacity };
        case 'rect':
            return { x: n.x, y: n.y, w: n.w, h: n.h, rx: n.rx ?? 0, opacity };
        case 'text':
            return { x: n.x, y: n.y, size: n.size ?? 16, opacity };
        case 'arrow':
            return { x1: n.x1, y1: n.y1, x2: n.x2, y2: n.y2, bend: n.bend ?? 0, width: n.width ?? 2, opacity };
    }
}
export const tagFor = (kind) => (kind === 'arrow' ? 'path' : kind);
export function classFor(n) {
    const c = ['dv', `dv-${n.kind}`, `dv-tone-${n.tone ?? 'default'}`];
    if (n.role)
        c.push(`dv-role-${n.role}`);
    if (n.dashed)
        c.push('dv-dashed');
    if (n.draggable)
        c.push('dv-draggable');
    if (n.interactive || n.draggable)
        c.push('dv-interactive');
    return c.join(' ');
}
/** Round to 2 decimals so the DOM / SVG strings stay readable. */
const f = (v) => String(Math.round(v * 100) / 100);
const PLAIN = { rxScale: 1, strokeScale: 1, head: 'chevron', headScale: 1 };
export function describe(n, p, g = PLAIN) {
    const solidHead = n.kind === 'arrow' && (n.head ?? true) && g.head === 'triangle';
    const attrs = {
        class: classFor(n) + (solidHead ? ' dv-head-solid' : ''),
        'data-id': n.id,
        opacity: f(p.opacity),
    };
    switch (n.kind) {
        case 'circle':
            return { tag: 'circle', attrs: { ...attrs, cx: f(p.x), cy: f(p.y), r: f(Math.max(0, p.r)) } };
        case 'rect':
            return {
                tag: 'rect',
                attrs: {
                    ...attrs,
                    x: f(p.x - p.w / 2),
                    y: f(p.y - p.h / 2),
                    width: f(Math.max(0, p.w)),
                    height: f(Math.max(0, p.h)),
                    rx: f(p.rx * g.rxScale),
                },
            };
        case 'text':
            return {
                tag: 'text',
                text: n.text,
                attrs: {
                    ...attrs,
                    x: f(p.x),
                    y: f(p.y),
                    'font-size': f(p.size),
                    'text-anchor': n.anchor ?? 'middle',
                    'dominant-baseline': 'central',
                    ...(n.weight != null ? { 'font-weight': String(n.weight) } : {}),
                },
            };
        case 'arrow': {
            const w = p.width * g.strokeScale;
            return {
                tag: 'path',
                attrs: {
                    ...attrs,
                    d: arrowPath(V2(p.x1, p.y1), V2(p.x2, p.y2), p.bend, n.head ?? true, w, g.head, g.headScale),
                    'stroke-width': f(w),
                },
            };
        }
    }
}
/** Control point of a bent line: midpoint pushed `bend` px sideways. */
export function bendControl(a, b, bend) {
    const mid = V2((a.x + b.x) / 2, (a.y + b.y) / 2);
    return vadd(mid, vscale(vperp(vnorm(vsub(b, a))), bend));
}
/**
 * Path data for a (possibly curved) line plus its arrowhead, as ONE path so a
 * single element can be tweened.
 *
 *  - 'chevron':  an open "V" — stroke only.
 *  - 'triangle': a closed triangle that CSS fills (class dv-head-solid).
 *    Filling a path fills EVERY sub-path, and an open curve "M a Q c b" would
 *    fill the lens between the curve and its chord. So the line part retraces
 *    itself back to the start: a shape that goes there and back encloses zero
 *    area, so only the triangle gets filled. (A straight line has zero area anyway.)
 */
export function arrowPath(a, b, bend, head, width, style = 'chevron', headScale = 1) {
    const curved = Math.abs(bend) > 0.5;
    const c = curved ? bendControl(a, b, bend) : null;
    // A quadratic curve arrives along (end - control), a straight line along (end - start).
    const dir = vnorm(vsub(b, c ?? a));
    const hasHead = head && (dir.x !== 0 || dir.y !== 0);
    const size = (6 + width * 1.5) * headScale;
    const solid = hasHead && style === 'triangle';
    // A solid head covers the last bit of the line, so stop the line at its base.
    const end = solid ? vsub(b, vscale(dir, size * 0.8)) : b;
    let d = c ? `M${f(a.x)} ${f(a.y)}Q${f(c.x)} ${f(c.y)} ${f(end.x)} ${f(end.y)}` : `M${f(a.x)} ${f(a.y)}L${f(end.x)} ${f(end.y)}`;
    if (solid && c)
        d += `Q${f(c.x)} ${f(c.y)} ${f(a.x)} ${f(a.y)}`; // retrace: zero fill area
    if (!hasHead)
        return d;
    const back = vsub(b, vscale(dir, size));
    const spread = solid ? 0.55 : 0.6;
    const side = vscale(vperp(dir), size * spread);
    const l = vadd(back, side), r = vsub(back, side);
    d += solid
        ? `M${f(b.x)} ${f(b.y)}L${f(l.x)} ${f(l.y)}L${f(r.x)} ${f(r.y)}Z`
        : `M${f(l.x)} ${f(l.y)}L${f(b.x)} ${f(b.y)}L${f(r.x)} ${f(r.y)}`;
    return d;
}
/** Point at parameter t on the (possibly curved) line — handy for edge labels. */
export function pointOnArrow(a, b, bend, t) {
    const c = bendControl(a, b, bend);
    const u = 1 - t;
    return V2(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y);
}
