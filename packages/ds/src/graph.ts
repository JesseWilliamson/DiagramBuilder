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
import { Frame, Scene, SceneNode, Tone, V2, Vec, arrow, bendControl, circle, connector, estimateTextWidth, pointOnArrow, rect, rectEdge, text, vnorm, vsub } from '@figurae/core';
import { layered } from '@figurae/layout';
import { Key, show } from './common';

export interface GraphNodeSpec {
  id: Key;
  label?: string | number;
  x?: number;
  y?: number;
  tone?: Tone;
  /**
   * What the node IS, for the stylesheet: becomes `role: 'node-<kind>'`.
   * The default stylesheet colours 'changed', 'upstream', 'downstream' and
   * 'test' (a change and its blast radius); any other kind is yours to style.
   */
  kind?: string;
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
  /** Circle radius; for rects, half the height is about 0.75·r. Default 22. */
  r?: number;
  /** 'circle' (default), or 'rect' sized to its label: for names longer than a letter or two. */
  shape?: 'circle' | 'rect';
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

/** The size a node is drawn at: a circle's bounding square, or a rect fitted to its label. */
export function graphNodeSize(n: GraphNodeSpec, o: Pick<GraphOptions, 'r' | 'shape'> = {}): { w: number; h: number } {
  const r = o.r ?? 22;
  if (o.shape !== 'rect') return { w: 2 * r, h: 2 * r };
  return { w: Math.max(2 * r, Math.ceil(estimateTextWidth(show(n.label ?? n.id), 14) + 24)), h: Math.round(1.5 * r) };
}

export function graph(nodes: readonly GraphNodeSpec[], edges: readonly GraphEdgeSpec[], o: GraphOptions = {}): GraphDiagram {
  const id = o.id ?? 'graph';
  const r = o.r ?? 22;
  const rects = o.shape === 'rect';
  const size = new Map(nodes.map((n) => [String(n.id), graphNodeSize(n, o)]));
  const S = (k: Key) => size.get(String(k)) ?? { w: 2 * r, h: 2 * r };
  const placed = (n: GraphNodeSpec) => n.x != null && n.y != null;
  const pos = new Map<string, Vec>();
  // edges whose ends were both placed by the layered layout follow its routes
  let routeOf: ((e: GraphEdgeSpec) => Vec[] | null) | null = null;
  if (o.layout === 'layered') {
    const free = nodes.filter((n) => !placed(n));
    const auto = new Set(free.map((n) => String(n.id)));
    const L = layered(
      free.map((n) => ({ id: String(n.id), ...S(n.id) })),
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
  const frame = (k: Key): Frame => ({ ...P(k), ...S(k) });
  // where a line leaving the node's centre in direction d crosses its outline
  const rim = (k: Key, d: Vec, pad = 0): Vec => {
    const c = P(k);
    const e = rects ? rectEdge(frame(k), V2(c.x + d.x * 1000, c.y + d.y * 1000)) : V2(c.x + d.x * r, c.y + d.y * r);
    return V2(e.x + d.x * pad, e.y + d.y * pad);
  };

  const pairs = new Set(edges.map((e) => `${e.from}→${e.to}`));
  const out: SceneNode[] = [];
  const labels: SceneNode[] = [];

  for (const e of edges) {
    const directed = e.directed ?? o.directed ?? false;
    const eid = `${id}:edge:${e.from}-${e.to}`;
    const routed = routeOf?.(e);
    if (routed) {
      // The layout knows each node's box, so the route already starts and ends
      // at the middle of a side: on the rect, and on the circle too.
      const c = connector({ id: eid, from: routed[0], to: routed[routed.length - 1], via: routed.slice(1, -1), end: directed ? 'arrow' : 'none', tone: e.tone, label: e.label != null ? show(e.label) : undefined });
      out.push(...c.nodes.filter((n) => !n.id.endsWith(':label')));
      labels.push(...c.nodes.filter((n) => n.id.endsWith(':label')));
      continue;
    }
    const a = P(e.from), b = P(e.to);
    const antiparallel = directed && pairs.has(`${e.to}→${e.from}`);
    const bend = e.bend ?? (antiparallel ? 22 : 0);
    // Trim both ends to the node's outline, along the curve's actual tangent.
    const c = bendControl(a, b, bend);
    const da = vnorm(vsub(Math.abs(bend) > 0.5 ? c : b, a));
    const db = vnorm(vsub(Math.abs(bend) > 0.5 ? c : a, b));
    const s = rim(e.from, da);
    const t = rim(e.to, db, directed ? 3 : 0);
    out.push(arrow({ id: eid, x1: s.x, y1: s.y, x2: t.x, y2: t.y, bend, head: directed, tone: e.tone, data: e }));
    if (e.label != null) {
      const m = pointOnArrow(s, t, bend, 0.5);
      labels.push(text({ id: `${eid}:label`, x: m.x, y: m.y, text: show(e.label), size: 13, role: 'edge-label', tone: e.tone }));
    }
  }
  for (const n of nodes) {
    const p = P(n.id);
    const common = { id: `${id}:node:${n.id}`, x: p.x, y: p.y, tone: n.tone, role: n.kind ? `node-${n.kind}` : undefined, draggable: o.draggable, interactive: o.interactive, data: n };
    out.push(rects ? rect({ ...common, ...S(n.id), rx: 8 }) : circle({ ...common, r }));
    out.push(text({ id: `${id}:label:${n.id}`, x: p.x, y: p.y, text: show(n.label ?? n.id), size: rects ? 14 : 15, weight: 600, role: 'value', tone: n.tone }));
  }
  return {
    nodes: [...out, ...labels],
    pos: P,
    top: (k) => V2(P(k).x, P(k).y - S(k).h / 2),
    bottom: (k) => V2(P(k).x, P(k).y + S(k).h / 2),
  };
}

