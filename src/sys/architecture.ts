/**
 * System design diagrams: components (client, load balancer, service, cache,
 * database, queue, CDN…), links between them, and packets travelling along links.
 *
 * Each kind has its own silhouette (a database is a cylinder, a queue has
 * slots) and its own role, `sys-<kind>`. Colour lives in the stylesheet, so
 * a host app can restyle every database with one CSS rule.
 *
 * Animation idea: a packet is just a small circle with a stable id. Put it at
 * one end of a link, render, put it at the other end, render again; the tween
 * engine slides it along. `along(from, to, t)` gives you the points.
 */
import { Frame, connector, pointAlong } from '../connector';
import { Scene, SceneNode, Tone, circle, path, rect, text } from '../scene';
import { Vec } from '../vec';

export type ComponentKind = 'client' | 'user' | 'lb' | 'gateway' | 'service' | 'cache' | 'db' | 'queue' | 'cdn' | 'storage';

export interface Component {
  id: string;
  kind: ComponentKind;
  label: string;
  /** Small caption under the label, e.g. 'Postgres' or 'x3'. */
  sub?: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  tone?: Tone;
  opacity?: number;
}

export interface Link {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  tone?: Tone;
  /** Arrowheads at both ends (a two-way connection). */
  both?: boolean;
  /** No arrowheads at all. */
  plain?: boolean;
}

export interface ArchitectureOptions {
  id?: string;
  /** Components emit clicks with `{ component: id }`. */
  interactive?: boolean;
  /** Components can be dragged; data is `{ component: id }`. */
  draggable?: boolean;
  route?: 'straight' | 'elbow';
}

export interface Architecture extends Scene {
  frame(id: string): Frame;
  /**
   * A point a fraction t of the way along the link between two components,
   * from `from`'s edge (t = 0) to `to`'s edge (t = 1). Works in either direction.
   */
  along(from: string, to: string, t: number): Vec;
}

const SIZE: Record<ComponentKind, [number, number]> = {
  client: [96, 60], user: [60, 64], lb: [124, 44], gateway: [124, 48], service: [120, 52],
  cache: [110, 50], db: [100, 68], queue: [124, 46], cdn: [124, 64], storage: [100, 60],
};

export const componentFrame = (c: Component): Frame => {
  const [w, h] = SIZE[c.kind];
  return { x: c.x, y: c.y, w: c.w ?? w, h: c.h ?? h };
};

type P = readonly [number, number];
/** Points on an ellipse arc, from angle a0 to a1 (radians, y down). */
const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 12): P[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as const;
  });

/** The silhouette (and any inner detail lines) for one component. */
function shape(c: Component, f: Frame, k: string, extra: Partial<SceneNode>): SceneNode[] {
  const role = `sys-${c.kind}`;
  const { x, y, w, h } = f;
  const l = x - w / 2, r = x + w / 2, t = y - h / 2, b = y + h / 2;
  const base = { role, tone: c.tone, opacity: c.opacity, ...extra } as const;
  const detail = (id: string, points: P[]) => path({ id: `${k}:${id}`, points, role, tone: c.tone, opacity: c.opacity });
  switch (c.kind) {
    case 'db': {
      // a cylinder: left side down, front of the bottom rim, right side up, back of the top rim
      const e = 9;
      const outline = [...arc(x, t + e, w / 2, e, Math.PI, 2 * Math.PI), ...arc(x, b - e, w / 2, e, 0, Math.PI)];
      return [path({ id: k, points: outline, closed: true, ...base }), detail('rim', arc(x, t + e, w / 2, e, 0, Math.PI))];
    }
    case 'queue': {
      // a box with message slots at the back end
      return [rect({ id: k, x, y, w, h, rx: 6, ...base }), ...[0, 1, 2].map((i) => detail(`slot${i}`, [[r - 14 - i * 12, t + 8], [r - 14 - i * 12, b - 8]]))];
    }
    case 'lb':
      return [rect({ id: k, x, y, w, h, rx: h / 2, ...base })];
    case 'gateway':
      return [path({ id: k, points: [[l + 14, t], [r - 14, t], [r, y], [r - 14, b], [l + 14, b], [l, y]], closed: true, ...base })];
    case 'cdn': {
      // a cloud: a smooth closed curve through a bumpy outline with a flat-ish bottom
      const pts: P[] = [[-0.46, 0.38], [-0.5, 0.05], [-0.36, -0.18], [-0.18, -0.46], [0.08, -0.48], [0.24, -0.26], [0.42, -0.22], [0.5, 0.1], [0.44, 0.38], [0, 0.42]];
      return [path({ id: k, points: pts.map(([px, py]) => [x + px * w, y + py * h] as const), closed: true, smooth: true, ...base })];
    }
    case 'storage':
      return [path({ id: k, points: [[l, t], [r, t], [r - 10, b], [l + 10, b]], closed: true, ...base }), detail('rim', [[l + 4, t + 8], [r - 4, t + 8]])];
    case 'client': {
      // a monitor: the screen, then the stand
      const sh = h - 14;
      return [rect({ id: k, x, y: t + sh / 2, w, h: sh, rx: 5, ...base }), detail('stand', [[x - 14, b], [x + 14, b], [x, b], [x, t + sh]])];
    }
    case 'user':
      return [
        circle({ id: k, x, y: t + 10, r: 9, ...base }),
        detail('body', arc(x, b - 4, 18, 22, Math.PI, 2 * Math.PI, 10)),
      ];
    default:
      return [rect({ id: k, x, y, w, h, rx: 8, ...base })];
  }
}

export function component(c: Component, o: { id?: string; interactive?: boolean; draggable?: boolean } = {}): Scene {
  const f = componentFrame(c);
  const k = `${o.id ?? 'sys'}:${c.id}`;
  const data = { component: c.id };
  const nodes = shape(c, f, k, { interactive: o.interactive, draggable: o.draggable, data });
  // labels: centred on the body (the screen for a client, under the figure for a user)
  const cy = c.kind === 'client' ? f.y - 7 : c.kind === 'db' ? f.y + 5 : c.kind === 'user' ? f.y + f.h / 2 + 12 : f.y;
  const dy = c.sub && c.kind !== 'user' ? -6 : 0;
  nodes.push(text({ id: `${k}:label`, x: f.x, y: cy + dy, text: c.label, size: 13, role: 'value', tone: c.tone, opacity: c.opacity }));
  if (c.sub) nodes.push(text({ id: `${k}:sub`, x: f.x, y: cy + dy + 14, text: c.sub, size: 10.5, role: 'caption', opacity: c.opacity }));
  return { nodes };
}

export function architecture(components: readonly Component[], links: readonly Link[] = [], o: ArchitectureOptions = {}): Architecture {
  const id = o.id ?? 'sys';
  const frames = new Map(components.map((c) => [c.id, componentFrame(c)]));
  const F = (k: string) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 };
  const routes = new Map<string, Vec[]>();
  const lines: SceneNode[] = [];
  for (const l of links) {
    if (!frames.has(l.from) || !frames.has(l.to)) continue;
    const c = connector({
      id: `${id}:link:${l.from}-${l.to}`, from: F(l.from), to: F(l.to), route: o.route,
      start: l.both ? 'arrow' : 'none', end: l.plain ? 'none' : 'arrow', dashed: l.dashed, tone: l.tone, label: l.label,
    });
    routes.set(`${l.from}>${l.to}`, c.points);
    lines.push(...c.nodes);
  }
  const shapes = components.flatMap((c) => component(c, { id, interactive: o.interactive, draggable: o.draggable }).nodes);
  return {
    nodes: [...lines, ...shapes],
    frame: F,
    along(from, to, t) {
      const fwd = routes.get(`${from}>${to}`);
      if (fwd) return pointAlong(fwd, t);
      const back = routes.get(`${to}>${from}`);
      if (back) return pointAlong(back, 1 - t);
      // no link drawn: straight between centres
      const a = F(from), b = F(to);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    },
  };
}

/** A request / message travelling through the system. Keep its id stable and it glides between renders. */
export function packet(o: { id: string; x: number; y: number; tone?: Tone; label?: string; r?: number; opacity?: number }): Scene {
  const nodes: SceneNode[] = [circle({ id: o.id, x: o.x, y: o.y, r: o.r ?? 6, role: 'packet', tone: o.tone, opacity: o.opacity })];
  if (o.label) nodes.push(text({ id: `${o.id}:label`, x: o.x, y: o.y - 14, text: o.label, size: 10.5, role: 'packet-label', tone: o.tone, opacity: o.opacity }));
  return { nodes };
}
