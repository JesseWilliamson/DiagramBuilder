/**
 * Geometry figure parts. These work directly in PIXELS (y down), the way a
 * compass-and-ruler figure is drawn, so a polygon's vertices are just your state.
 */
import { Scene, SceneNode, Tone, V2, Vec, circle as circleNode, handle, path, text, vadd, vnorm, vscale, vsub } from '../core';
import { angleAt, arcPoints, centroid, toDegrees } from './math';

const pt = (v: Vec): [number, number] => [v.x, v.y];

export interface PolygonOptions {
  id?: string;
  tone?: Tone;
  /** Vertex names (A, B, C …) placed just outside each corner. */
  labels?: string[];
  /** Give every vertex a drag handle; drag events carry `{ id, index }`. */
  draggable?: boolean;
  /** Fill the inside lightly. Default true. */
  fill?: boolean;
  width?: number;
  /** Pulse the drag handles until the learner touches one. */
  hint?: boolean;
}

/** A closed polygon with optional vertex labels and drag handles. */
export function polygon(points: readonly Vec[], o: PolygonOptions = {}): Scene {
  const id = o.id ?? 'poly';
  const nodes: SceneNode[] = [
    path({ id: `${id}:shape`, points: points.map(pt), closed: true, role: o.fill === false ? 'outline' : 'region', tone: o.tone, width: o.width ?? 1.75 }),
    path({ id: `${id}:edge`, points: points.map(pt), closed: true, role: 'curve', tone: o.tone, width: o.width ?? 1.75 }),
  ];
  const c = centroid(points);
  points.forEach((p, i) => {
    if (o.labels?.[i]) {
      const out = vadd(p, vscale(vnorm(vsub(p, c)), 16));
      nodes.push(text({ id: `${id}:label:${i}`, x: out.x, y: out.y, text: o.labels[i], size: 15, role: 'math' }));
    }
    nodes.push(...handle({ id: `${id}:v:${i}`, x: p.x, y: p.y, r: 5, draggable: !!o.draggable, hint: o.hint, tone: o.tone, data: { id, index: i } }));
  });
  return { nodes };
}

export interface SegmentOptions {
  id: string;
  tone?: Tone;
  dashed?: boolean;
  width?: number;
  /** Equal-length tick marks (1, 2 or 3) across the middle. */
  ticks?: number;
  label?: string;
}

/** A segment, optionally with equal-length tick marks and a label beside its midpoint. */
export function segment(a: Vec, b: Vec, o: SegmentOptions): Scene {
  const nodes: SceneNode[] = [path({ id: o.id, points: [pt(a), pt(b)], role: 'curve', tone: o.tone, dashed: o.dashed, width: o.width ?? 1.75 })];
  if (o.ticks) nodes.push(...tickMarks(a, b, o.ticks, { id: `${o.id}:ticks`, tone: o.tone }).nodes);
  if (o.label) {
    const m = vscale(vadd(a, b), 0.5);
    const n = vnorm(V2(-(b.y - a.y), b.x - a.x));
    nodes.push(text({ id: `${o.id}:label`, x: m.x + n.x * 14, y: m.y + n.y * 14, text: o.label, size: 13, role: 'math', tone: o.tone }));
  }
  return { nodes };
}

/** The little hash marks that say "these sides are equal". */
export function tickMarks(a: Vec, b: Vec, count: number, o: { id: string; tone?: Tone; size?: number }): Scene {
  const m = vscale(vadd(a, b), 0.5);
  const d = vnorm(vsub(b, a));
  const n = V2(-d.y, d.x);
  const s = o.size ?? 6, gap = 4;
  return {
    nodes: Array.from({ length: count }, (_, i) => {
      const c = vadd(m, vscale(d, (i - (count - 1) / 2) * gap));
      return path({ id: `${o.id}:${i}`, points: [pt(vadd(c, vscale(n, -s))), pt(vadd(c, vscale(n, s)))], role: 'curve', tone: o.tone, width: 1.5 });
    }),
  };
}

export interface AngleMarkOptions {
  id: string;
  r?: number;
  tone?: Tone;
  /** Text at the arc, e.g. 'α', or true to show the measure in degrees. */
  label?: string | boolean;
  /** Draw a square for (near) right angles. Default true. */
  rightSquare?: boolean;
  /** How many arcs (1–3) to mark equal angles. Default 1. */
  arcs?: number;
}

/**
 * Mark the angle ABC at vertex B: an arc between rays BA and BC (always the
 * smaller side), or a little square when the angle is 90°. The arc and the
 * square have the same number of points so they morph into each other as you
 * drag through 90°.
 */
export function angleMark(a: Vec, b: Vec, c: Vec, o: AngleMarkOptions): Scene {
  const r = o.r ?? 22;
  const ang = angleAt(a, b, c);
  const a0 = Math.atan2(a.y - b.y, a.x - b.x);
  let a1 = Math.atan2(c.y - b.y, c.x - b.x);
  // sweep the short way round
  let delta = a1 - a0;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  a1 = a0 + delta;
  const right = (o.rightSquare ?? true) && Math.abs(toDegrees(ang) - 90) < 0.5;
  const nodes: SceneNode[] = [];
  const N = 24;
  const arcs = o.arcs ?? 1;
  for (let k = 0; k < arcs; k++) {
    const rr = r + k * 4;
    let pts: Array<[number, number]>;
    if (right) {
      const s = rr * 0.7;
      const u = V2(Math.cos(a0), Math.sin(a0)), v = V2(Math.cos(a1), Math.sin(a1));
      const p1 = vadd(b, vscale(u, s)), p2 = vadd(b, vadd(vscale(u, s), vscale(v, s))), p3 = vadd(b, vscale(v, s));
      // 3 straight legs resampled to N points so it tweens with the arc
      pts = Array.from({ length: N }, (_, i) => {
        const t = (i / (N - 1)) * 2;
        const q = t < 1 ? vadd(p1, vscale(vsub(p2, p1), t)) : vadd(p2, vscale(vsub(p3, p2), t - 1));
        return pt(q);
      });
    } else pts = arcPoints(b, rr, a0, a1, N);
    nodes.push(path({ id: `${o.id}:arc:${k}`, points: pts, role: 'curve', tone: o.tone, width: 1.5 }));
  }
  // a light wedge fill behind the arc
  nodes.unshift(path({ id: `${o.id}:wedge`, points: [pt(b), ...arcPoints(b, r, a0, a1, N)], closed: true, role: 'region', tone: o.tone }));
  if (o.label) {
    const mid = (a0 + a1) / 2;
    const lr = r + 12 + (arcs - 1) * 4;
    const s = o.label === true ? `${Math.round(toDegrees(ang))}°` : o.label;
    nodes.push(text({ id: `${o.id}:label`, x: b.x + lr * Math.cos(mid), y: b.y + lr * Math.sin(mid), text: s, size: 14, role: 'math', tone: o.tone }));
  }
  return { nodes };
}

/** A circle outline (and light fill) with an optional centre dot. */
export function circle(center: Vec, r: number, o: { id: string; tone?: Tone; dashed?: boolean; fill?: boolean; showCenter?: boolean }): Scene {
  const nodes: SceneNode[] = [
    circleNode({ id: o.id, x: center.x, y: center.y, r, tone: o.tone ?? 'ghost', dashed: o.dashed, role: o.fill ? undefined : 'outline' }),
  ];
  if (o.showCenter) nodes.push(circleNode({ id: `${o.id}:c`, x: center.x, y: center.y, r: 2.5, role: 'dot', tone: o.tone }));
  return { nodes };
}

/** A labelled point. */
export function pointLabel(p: Vec, s: string, o: { id: string; tone?: Tone; offset?: Vec; draggable?: boolean; hint?: boolean; data?: unknown }): Scene {
  const off = o.offset ?? V2(10, -12);
  return {
    nodes: [
      ...handle({ id: o.id, x: p.x, y: p.y, r: 4.5, tone: o.tone, draggable: !!o.draggable, hint: o.hint, data: o.data ?? { id: o.id } }),
      text({ id: `${o.id}:label`, x: p.x + off.x, y: p.y + off.y, text: s, size: 14, role: 'math', tone: o.tone }),
    ],
  };
}

