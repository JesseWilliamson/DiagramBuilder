/**
 * Turning a node into SVG, split into two halves:
 *
 *  - numericProps(node): the numbers that can be tweened (x, y, r, opacity…)
 *  - describe(node, props): which SVG tag + attributes to draw for those numbers
 *
 * The DOM renderer calls describe() every animation frame with interpolated
 * props; the string renderer calls it once with the final props. Sharing this
 * one function means both renderers can never disagree about what a node looks like.
 */
import { NumericProps, SceneNode } from './scene';
import { Geometry, geometry } from './themes';
import { pathData } from './path';
import { mathTspans, parseMath } from './mathtext';
import { V2, Vec, vadd, vnorm, vperp, vscale, vsub } from './vec';

/** Path points live in the flat numeric bag as p0, p1, … (x0 y0 x1 y1 …) so the tween engine needs no special case. */

export function numericProps(n: SceneNode): NumericProps {
  const opacity = n.opacity ?? 1;
  switch (n.kind) {
    case 'path': {
      const o: NumericProps = { width: n.width ?? 1.5, opacity };
      n.points.forEach(([x, y], i) => ((o[`p${2 * i}`] = x), (o[`p${2 * i + 1}`] = y)));
      return o;
    }
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

export type SvgTag = 'circle' | 'rect' | 'text' | 'path';

export interface Description {
  tag: SvgTag;
  attrs: Record<string, string>;
  text?: string;
  /** Inner SVG markup instead of plain text (maths labels become <tspan>s). */
  html?: string;
}

export const tagFor = (kind: SceneNode['kind']): SvgTag => (kind === 'arrow' ? 'path' : kind);

/** Read the flat bag back into points. */
export function pointsOf(p: NumericProps, count: number): Array<[number, number]> {
  return Array.from({ length: count }, (_, i) => [p[`p${2 * i}`], p[`p${2 * i + 1}`]] as [number, number]);
}

export function classFor(n: SceneNode): string {
  const c = ['dv', `dv-${n.kind}`, `dv-tone-${n.tone ?? 'default'}`];
  if (n.role) c.push(`dv-role-${n.role}`);
  if (n.kind === 'path' && !n.closed) c.push('dv-open');
  if (n.dashed) c.push('dv-dashed');
  if (n.draggable) c.push('dv-draggable');
  if (n.interactive || n.draggable) c.push('dv-interactive');
  return c.join(' ');
}

/** Round to 2 decimals so the DOM / SVG strings stay readable. */
const f = (v: number) => String(Math.round(v * 100) / 100);

export function describe(n: SceneNode, p: NumericProps, g: Geometry = geometry): Description {
  const solidHead = n.kind === 'arrow' && (n.head ?? true) && g.head === 'triangle';
  const attrs: Record<string, string> = {
    class: classFor(n) + (solidHead ? ' dv-head-solid' : ''),
    'data-id': n.id,
    opacity: f(p.opacity),
    // draggable things are reachable with Tab and movable with the arrow keys
    ...(n.draggable ? { tabindex: '0' } : {}),
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
        // role 'math' is typeset: italic variables, upright numbers, real superscripts
        ...(n.role === 'math' ? { html: mathTspans(parseMath(n.text), p.size) } : { text: n.text }),
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
    case 'path':
      return {
        tag: 'path',
        attrs: { ...attrs, d: pathData(pointsOf(p, n.points.length), !!n.closed, !!n.smooth), 'stroke-width': f(p.width) },
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
export function bendControl(a: Vec, b: Vec, bend: number): Vec {
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
export function arrowPath(
  a: Vec,
  b: Vec,
  bend: number,
  head: boolean,
  width: number,
  style: 'chevron' | 'triangle' = 'chevron',
  headScale = 1,
): string {
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
  if (solid && c) d += `Q${f(c.x)} ${f(c.y)} ${f(a.x)} ${f(a.y)}`; // retrace: zero fill area
  if (!hasHead) return d;

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
export function pointOnArrow(a: Vec, b: Vec, bend: number, t: number): Vec {
  const c = bendControl(a, b, bend);
  const u = 1 - t;
  return V2(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y);
}
