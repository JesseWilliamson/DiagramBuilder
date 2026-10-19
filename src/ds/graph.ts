/**
 * General graphs: nodes as circles, edges as (optionally curved, optionally
 * directed, optionally weighted) lines.
 *
 * Positions are YOUR state. Give nodes x/y (e.g. updated from drag events) or
 * let the layout place the unpositioned ones: on a circle (the default), or in
 * layers with `layout: 'layered'` (layout/layered.ts), which suits anything
 * that flows one way: dependencies, call graphs, pipelines. Force-directed
 * layout is out of scope, but positions are just data, so you can plug one in
 * (d3-force, or your own) and feed the results back in.
 */
import { connector } from '../connector';
import { bendControl, pointOnArrow } from '../describe';
import { layered } from '../layout/layered';
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
  /**
   * Where nodes without x/y go. 'circle' (default): evenly round a circle.
   * 'layered': in layers along the edges' direction, edges routed between them.
   */
  layout?: 'circle' | 'layered';
  /** Layered only: 'down' (default) or 'right'. */
  direction?: 'down' | 'right';
  /** Layered only: space between layers and between nodes in a layer. */
  rankGap?: number;
  nodeGap?: number;
  /** Layered only: 'straight' (default) lines through the layers, or right-angled 'elbow' ones. */
  route?: 'straight' | 'elbow';
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
  const placed = (n: GraphNodeSpec) => n.x != null && n.y != null;
  const pos = new Map<string, Vec>();
  // edges whose ends were both placed by the layered layout follow its routes
  let routeOf: ((e: GraphEdgeSpec) => Vec[] | null) | null = null;
  if (o.layout === 'layered') {
    const free = nodes.filter((n) => !placed(n));
    const auto = new Set(free.map((n) => String(n.id)));
    const L = layered(
      free.map((n) => ({ id: String(n.id), w: 2 * r, h: 2 * r })),
      edges.map((e) => ({ from: String(e.from), to: String(e.to) })),
      { direction: o.direction, rankGap: o.rankGap, nodeGap: o.nodeGap, x: o.cx, y: o.cy },
    );
    for (const n of nodes) pos.set(String(n.id), placed(n) ? V2(n.x!, n.y!) : L.pos(String(n.id)));
    routeOf = (e) => {
      if (!auto.has(String(e.from)) || !auto.has(String(e.to)) || e.bend) return null;
      const pts = L.route(String(e.from), String(e.to), o.route);
      return pts.length >= 2 ? pts : null;
    };
  } else {
    const ring = circularPositions(nodes.length, o.cx ?? 0, o.cy ?? 0, o.radius ?? Math.max(90, nodes.length * 22));
    nodes.forEach((n, i) => pos.set(String(n.id), placed(n) ? V2(n.x!, n.y!) : ring[i]));
  }
  const P = (k: Key) => pos.get(String(k)) ?? V2(0, 0);

  const pairs = new Set(edges.map((e) => `${e.from}→${e.to}`));
  const out: SceneNode[] = [];
  const labels: SceneNode[] = [];

  for (const e of edges) {
    const directed = e.directed ?? o.directed ?? false;
    const eid = `${id}:edge:${e.from}-${e.to}`;
    const routed = routeOf?.(e);
    if (routed) {
      // The layout was told each node is a 2r box, so the route already starts
      // and ends at the middle of a side, which is on the circle.
      const c = connector({ id: eid, from: routed[0], to: routed[routed.length - 1], via: routed.slice(1, -1), end: directed ? 'arrow' : 'none', tone: e.tone, label: e.label != null ? show(e.label) : undefined });
      out.push(...c.nodes.filter((n) => !n.id.endsWith(':label')));
      labels.push(...c.nodes.filter((n) => n.id.endsWith(':label')));
      continue;
    }
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
    out.push(text({ id: `${id}:label:${n.id}`, x: p.x, y: p.y, text: show(n.label ?? n.id), size: 15, weight: 600, role: 'value', tone: n.tone }));
  }
  return {
    nodes: [...out, ...labels],
    pos: P,
    top: (k) => V2(P(k).x, P(k).y - r),
    bottom: (k) => V2(P(k).x, P(k).y + r),
  };
}

