/**
 * General graphs: nodes as circles, edges as (optionally curved, optionally
 * directed, optionally weighted) lines.
 *
 * Positions are YOUR state. Give nodes x/y (e.g. updated from drag events) or
 * let the layout place unpositioned nodes on a circle. Real force-directed
 * layout is out of scope — but because positions are just data, you can plug
 * one in (d3-force, or your own) and feed the results back in.
 */
import { bendControl, pointOnArrow } from '../describe';
import { Scene, SceneNode, Tone, arrow, circle, text } from '../scene';
import { V2, Vec, vnorm, vsub } from '../vec';
import { Key, show } from './common';

export interface GraphNodeSpec {
  id: Key;
  label?: string | number;
  x?: number;
  y?: number;
  tone?: Tone;
}

export interface GraphEdgeSpec {
  from: Key;
  to: Key;
  label?: string | number;
  tone?: Tone;
  /** Override the graph-wide `directed` for this edge. */
  directed?: boolean;
  /** Force a curve. Antiparallel directed pairs (a→b, b→a) curve automatically. */
  bend?: number;
}

export interface GraphOptions {
  id?: string;
  r?: number;
  directed?: boolean;
  /** Centre + radius for the circular fallback layout. */
  cx?: number;
  cy?: number;
  radius?: number;
  draggable?: boolean;
  interactive?: boolean;
}

export interface GraphDiagram extends Scene {
  pos(id: Key): Vec;
  top(id: Key): Vec;
  bottom(id: Key): Vec;
}

/** Place n points evenly on a circle, starting at 12 o'clock. */
export function circularPositions(n: number, cx = 0, cy = 0, radius = 120): Vec[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
    return V2(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
  });
}

export function graph(nodes: readonly GraphNodeSpec[], edges: readonly GraphEdgeSpec[], o: GraphOptions = {}): GraphDiagram {
  const id = o.id ?? 'graph';
  const r = o.r ?? 22;
  const ring = circularPositions(nodes.length, o.cx ?? 0, o.cy ?? 0, o.radius ?? Math.max(90, nodes.length * 22));
  const pos = new Map<string, Vec>();
  nodes.forEach((n, i) => pos.set(String(n.id), n.x != null && n.y != null ? V2(n.x, n.y) : ring[i]));
  const P = (k: Key) => pos.get(String(k)) ?? V2(0, 0);

  const pairs = new Set(edges.map((e) => `${e.from}→${e.to}`));
  const out: SceneNode[] = [];
  const labels: SceneNode[] = [];

  for (const e of edges) {
    const directed = e.directed ?? o.directed ?? false;
    const a = P(e.from), b = P(e.to);
    const antiparallel = directed && pairs.has(`${e.to}→${e.from}`);
    const bend = e.bend ?? (antiparallel ? 22 : 0);
    // Trim both ends to the circle boundary, along the curve's actual tangent.
    const c = bendControl(a, b, bend);
    const da = vnorm(vsub(Math.abs(bend) > 0.5 ? c : b, a));
    const db = vnorm(vsub(Math.abs(bend) > 0.5 ? c : a, b));
    const pad = directed ? 3 : 0;
    const s = V2(a.x + da.x * r, a.y + da.y * r);
    const t = V2(b.x + db.x * (r + pad), b.y + db.y * (r + pad));
    const eid = `${id}:edge:${e.from}-${e.to}`;
    out.push(arrow({ id: eid, x1: s.x, y1: s.y, x2: t.x, y2: t.y, bend, head: directed, tone: e.tone, data: e }));
    if (e.label != null) {
      const m = pointOnArrow(s, t, bend, 0.5);
      labels.push(text({ id: `${eid}:label`, x: m.x, y: m.y, text: show(e.label), size: 13, role: 'edge-label', tone: e.tone }));
    }
  }
  for (const n of nodes) {
    const p = P(n.id);
    out.push(
      circle({ id: `${id}:node:${n.id}`, x: p.x, y: p.y, r, tone: n.tone, draggable: o.draggable, interactive: o.interactive, data: n }),
    );
    labels.push(text({ id: `${id}:label:${n.id}`, x: p.x, y: p.y, text: show(n.label ?? n.id), size: 15, weight: 600, role: 'value', tone: n.tone }));
  }
  return {
    nodes: [...out, ...labels],
    pos: P,
    top: (k) => V2(P(k).x, P(k).y - r),
    bottom: (k) => V2(P(k).x, P(k).y + r),
  };
}
