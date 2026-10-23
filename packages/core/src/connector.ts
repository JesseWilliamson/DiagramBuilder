/**
 * Connectors: a line between two boxes (or points) with a decoration at either
 * end. This is what UML relationships and architecture links are made of.
 *
 *   ─────▷   'triangle'        hollow triangle (inheritance, realisation)
 *   ─────▶   'arrow'           solid triangle  (a message, a request)
 *   ─────>   'open'            open chevron    (association, dependency, async)
 *   ◇─────   'diamond'         hollow diamond  (aggregation, at the owner)
 *   ◆─────   'diamond-filled'  solid diamond   (composition, at the owner)
 *
 * Each end marker is its own small closed path with a role (`end-solid`,
 * `end-hollow`, `end-open`), so the stylesheet decides how it looks. The line
 * stops where the marker begins, so it never shows through a hollow head.
 */
import { Box, Scene, SceneNode, Tone, path, text } from './scene';
import { V2, Vec, vadd, vdist, vnorm, vperp, vscale, vsub } from './vec';

export type ConnectorEnd = 'none' | 'arrow' | 'open' | 'triangle' | 'diamond' | 'diamond-filled';

/** A box given by its CENTRE and size, like a rect node. */
export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const isFrame = (v: Vec | Frame): v is Frame => 'w' in v && 'h' in v;

/**
 * Where the ray from a box's centre toward `toward` leaves the box.
 * The ray is centre + t·d. It hits the vertical sides at t = (w/2)/|dx| and the
 * horizontal sides at t = (h/2)/|dy|; whichever comes first is the exit.
 */
export function rectEdge(f: Frame, toward: Vec): Vec {
  const dx = toward.x - f.x, dy = toward.y - f.y;
  if (dx === 0 && dy === 0) return V2(f.x, f.y);
  const tx = dx === 0 ? Infinity : f.w / 2 / Math.abs(dx);
  const ty = dy === 0 ? Infinity : f.h / 2 / Math.abs(dy);
  const t = Math.min(tx, ty);
  return V2(f.x + dx * t, f.y + dy * t);
}

/** A centred Frame from a top-left Box. */
export const frameOf = (b: Box): Frame => ({ x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h });

export interface ConnectorOptions {
  id: string;
  from: Vec | Frame;
  to: Vec | Frame;
  /** 'straight' (default) or 'elbow': right-angled, leaving and entering through the facing sides. */
  route?: 'straight' | 'elbow';
  start?: ConnectorEnd;
  end?: ConnectorEnd;
  dashed?: boolean;
  tone?: Tone;
  width?: number;
  /** Text at the middle of the line. */
  label?: string;
  /** Small text near each end (UML multiplicities like '1' and '0..*'). */
  startLabel?: string;
  endLabel?: string;
  /** Points to pass through on the way (overrides `route`), e.g. a self-message loop. */
  via?: readonly Vec[];
  /** Gap left between the line and a point endpoint (boxes already stop at their edge). */
  gap?: number;
  opacity?: number;
}

export interface ConnectorScene extends Scene {
  /** The route actually drawn, before trimming for the end markers. */
  points: Vec[];
  /** A point a fraction t (0..1) of the way along the route, by length. */
  along(t: number): Vec;
}

/** Marker length (how far back along the line it reaches) and half-width. */
const MARKERS: Record<Exclude<ConnectorEnd, 'none'>, { len: number; half: number; trim: number }> = {
  arrow: { len: 11, half: 5, trim: 9 },
  open: { len: 10, half: 6, trim: 0 },
  triangle: { len: 14, half: 8, trim: 14 },
  diamond: { len: 22, half: 7, trim: 22 },
  'diamond-filled': { len: 22, half: 7, trim: 22 },
};

/** The route between the two ends, as a polyline. */
export function route(from: Vec | Frame, to: Vec | Frame, kind: 'straight' | 'elbow' = 'straight', gap = 0): Vec[] {
  const c0 = V2(from.x, from.y), c1 = V2(to.x, to.y);
  if (kind === 'elbow' && isFrame(from) && isFrame(to)) {
    const dx = c1.x - c0.x, dy = c1.y - c0.y;
    // Leave through the sides that face each other. Mostly-vertical pairs (a
    // class and its parent) go top/bottom, so inheritance trees read top-down.
    if (Math.abs(dy) * 1.2 >= Math.abs(dx)) {
      const s = Math.sign(dy) || 1;
      const a = V2(c0.x, c0.y + (s * from.h) / 2), b = V2(c1.x, c1.y - (s * to.h) / 2);
      if (Math.abs(a.x - b.x) < 1) return [a, b];
      const my = (a.y + b.y) / 2;
      return [a, V2(a.x, my), V2(b.x, my), b];
    }
    const s = Math.sign(dx) || 1;
    const a = V2(c0.x + (s * from.w) / 2, c0.y), b = V2(c1.x - (s * to.w) / 2, c1.y);
    if (Math.abs(a.y - b.y) < 1) return [a, b];
    const mx = (a.x + b.x) / 2;
    return [a, V2(mx, a.y), V2(mx, b.y), b];
  }
  const a = isFrame(from) ? rectEdge(from, c1) : vadd(c0, vscale(vnorm(vsub(c1, c0)), gap));
  const b = isFrame(to) ? rectEdge(to, c0) : vadd(c1, vscale(vnorm(vsub(c0, c1)), gap));
  return [a, b];
}

/** Point a fraction t along a polyline, measured by length. */
export function pointAlong(pts: readonly Vec[], t: number): Vec {
  const lens = pts.slice(1).map((p, i) => vdist(pts[i], p));
  let d = Math.max(0, Math.min(1, t)) * lens.reduce((s, l) => s + l, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? d / lens[i] : 0;
      return V2(pts[i].x + (pts[i + 1].x - pts[i].x) * k, pts[i].y + (pts[i + 1].y - pts[i].y) * k);
    }
    d -= lens[i];
  }
  return pts[0];
}

/**
 * The marker at `tip`, pointing along `dir` (unit vector, pointing OUT of the line).
 * Returns the outline and how much of the line it covers.
 */
function marker(kind: Exclude<ConnectorEnd, 'none'>, tip: Vec, dir: Vec): { pts: Vec[]; closed: boolean; role: string } {
  const { len, half } = MARKERS[kind];
  const back = (k: number) => vsub(tip, vscale(dir, k));
  const side = vperp(dir);
  const at = (k: number, s: number) => vadd(back(k), vscale(side, s));
  switch (kind) {
    case 'arrow':
      return { pts: [tip, at(len, half), at(len, -half)], closed: true, role: 'end-solid' };
    case 'open':
      return { pts: [at(len, half), tip, at(len, -half)], closed: false, role: 'end-open' };
    case 'triangle':
      return { pts: [tip, at(len, half), at(len, -half)], closed: true, role: 'end-hollow' };
    case 'diamond':
    case 'diamond-filled':
      return { pts: [tip, at(len / 2, half), back(len), at(len / 2, -half)], closed: true, role: kind === 'diamond' ? 'end-hollow' : 'end-solid' };
  }
}

export function connector(o: ConnectorOptions): ConnectorScene {
  const pts = o.via?.length
    ? [V2(o.from.x, o.from.y), ...o.via.map((p) => V2(p.x, p.y)), V2(o.to.x, o.to.y)]
    : route(o.from, o.to, o.route, o.gap ?? 0);
  const start = o.start ?? 'none', end = o.end ?? 'arrow';
  const n = pts.length;
  const dirEnd = vnorm(vsub(pts[n - 1], pts[n - 2]));
  const dirStart = vnorm(vsub(pts[0], pts[1]));
  // trim the line so it stops where each marker begins
  const line = pts.map((p) => V2(p.x, p.y));
  if (end !== 'none') line[n - 1] = vsub(pts[n - 1], vscale(dirEnd, MARKERS[end].trim));
  if (start !== 'none') line[0] = vsub(pts[0], vscale(dirStart, MARKERS[start].trim));

  const common = { tone: o.tone, opacity: o.opacity };
  const nodes: SceneNode[] = [
    path({ id: `${o.id}:line`, points: line.map((p) => [p.x, p.y] as const), role: 'connector', dashed: o.dashed, width: o.width ?? 1.5, ...common }),
  ];
  for (const [k, kind, tip, dir] of [['start', start, pts[0], dirStart], ['end', end, pts[n - 1], dirEnd]] as const) {
    if (kind === 'none') continue;
    const m = marker(kind, tip, dir);
    nodes.push(path({ id: `${o.id}:${k}`, points: m.pts.map((p) => [p.x, p.y] as const), closed: m.closed, role: m.role, width: o.width ?? 1.5, ...common }));
  }
  if (o.label) {
    const m = pointAlong(pts, 0.5);
    nodes.push(text({ id: `${o.id}:label`, x: m.x, y: m.y, text: o.label, size: 12, role: 'edge-label', ...common }));
  }
  // multiplicities sit just off the line, a little way in from each end
  const endLabel = (k: string, s: string | undefined, tip: Vec, dir: Vec) => {
    if (!s) return;
    const p = vadd(vsub(tip, vscale(dir, 20)), vscale(vperp(dir), 11));
    nodes.push(text({ id: `${o.id}:${k}-label`, x: p.x, y: p.y, text: s, size: 11, role: 'end-label', ...common }));
  };
  endLabel('start', o.startLabel, pts[0], dirStart);
  endLabel('end', o.endLabel, pts[n - 1], dirEnd);
  return { nodes, points: pts, along: (t) => pointAlong(pts, t) };
}
