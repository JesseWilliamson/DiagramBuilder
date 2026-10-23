/**
 * System design diagrams: components (client, load balancer, service, cache,
 * database, queue, CDN, file…), links between them, zones around groups of
 * them, and packets travelling along links.
 *
 * Each kind has its own silhouette (a database is a cylinder, a queue has
 * slots) and its own role, `sys-<kind>`. Colour lives in the stylesheet, so
 * a host app can restyle every database with one CSS rule.
 *
 * Animation idea: a packet is just a small circle with a stable id. Put it at
 * one end of a link, render, put it at the other end, render again; the tween
 * engine slides it along. `along(from, to, t)` gives you the points.
 *
 * Components without x/y are placed by the layered layout (layout/layered.ts),
 * following the links: give every component a position, or none.
 */
import { Box, Frame, Scene, SceneNode, Tone, Vec, circle, connector, estimateTextWidth, path, pointAlong, rect, rectEdge, text } from '@dsviz/core';
import { layered } from '@dsviz/layout';

export type ComponentKind = 'client' | 'user' | 'lb' | 'gateway' | 'service' | 'cache' | 'db' | 'queue' | 'cdn' | 'storage' | 'file';

export interface Component {
  id: string;
  kind: ComponentKind;
  label: string;
  /** Small caption under the label, e.g. 'Postgres' or 'x3'. */
  sub?: string;
  /** Centre. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
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
  /** Points to pass through on the way, to route around something. The ends still meet the boxes' edges. */
  via?: readonly Vec[];
}

/**
 * A dashed boundary around a group of components: a machine, a network, a
 * cloud account, a trust boundary. Zones are drawn first, under everything,
 * and size themselves to the components they hold, so moving a component
 * moves its zone's edge with it.
 */
export interface Zone {
  id: string;
  label: string;
  /** The components inside it. */
  around: readonly string[];
  /** Space between the components and the edge. Default 18. */
  padding?: number;
  tone?: Tone;
}

export interface ArchitectureOptions {
  id?: string;
  /** Boundaries around groups of components. List an outer zone before the zones inside it. */
  zones?: readonly Zone[];
  /** Components emit clicks with `{ component: id }`. */
  interactive?: boolean;
  /** Components can be dragged; data is `{ component: id }`. */
  draggable?: boolean;
  route?: 'straight' | 'elbow';
  /** For components without x/y: the flow's direction, 'right' (default) or 'down'. */
  direction?: 'down' | 'right';
  /** For components without x/y: space between layers and between neighbours. Defaults 72 and 36. */
  rankGap?: number;
  nodeGap?: number;
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
  cache: [110, 50], db: [100, 68], queue: [124, 46], cdn: [124, 64], storage: [100, 60], file: [96, 56],
};

export const componentFrame = (c: Component): Frame => {
  const [w, h] = SIZE[c.kind];
  return { x: c.x ?? 0, y: c.y ?? 0, w: c.w ?? w, h: c.h ?? h };
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
    case 'file': {
      // a page with its top-right corner folded down
      const d = 12;
      return [
        path({ id: k, points: [[l, t], [r - d, t], [r, t + d], [r, b], [l, b]], closed: true, ...base }),
        detail('fold', [[r - d, t], [r - d, t + d], [r, t + d]]),
      ];
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
  if (c.sub) nodes.push(text({ id: `${k}:sub`, x: f.x, y: cy + dy + 14, text: c.sub, size: 10.5, role: 'caption', tone: c.tone, opacity: c.opacity }));
  return { nodes };
}

/** The box a component occupies, its label included (a user's label hangs below it). */
function footprint(c: Component, f: Frame): Box {
  const below = c.kind === 'user' ? 22 : 0;
  const w = Math.max(f.w, c.kind === 'user' ? estimateTextWidth(c.label, 13) : 0);
  return { x: f.x - w / 2, y: f.y - f.h / 2, w, h: f.h + below };
}

/**
 * A zone as a rectangle around a box, with its label inside the top-left
 * corner. The label gets room of its own above the contents.
 */
export function zone(o: { id: string; label: string; box: Box; padding?: number; tone?: Tone }): Scene {
  const p = o.padding ?? 18, top = 18;
  const x0 = o.box.x - p, y0 = o.box.y - p - top, w = o.box.w + 2 * p, h = o.box.h + 2 * p + top;
  return {
    nodes: [
      rect({ id: o.id, x: x0 + w / 2, y: y0 + h / 2, w, h, rx: 10, role: 'zone', tone: o.tone, dashed: true }),
      text({ id: `${o.id}:label`, x: x0 + 12, y: y0 + 15, text: o.label, size: 11.5, anchor: 'start', role: 'zone-label', tone: o.tone }),
    ],
  };
}

/** The union of boxes. */
const union = (boxes: Box[]): Box => {
  const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.w)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

export function architecture(input: readonly Component[], links: readonly Link[] = [], o: ArchitectureOptions = {}): Architecture {
  const id = o.id ?? 'sys';
  // Unplaced components go where the layered layout puts them; their links follow its routes.
  const free = input.filter((c) => c.x == null || c.y == null);
  const auto = new Set(free.map((c) => c.id));
  const L = free.length
    ? layered(
        free.map((c) => {
          const f = componentFrame(c);
          return { id: c.id, w: f.w, h: f.h + (c.kind === 'user' ? 22 : 0) };
        }),
        links,
        { direction: o.direction ?? 'right', rankGap: o.rankGap ?? 72, nodeGap: o.nodeGap ?? 36 },
      )
    : null;
  const components = input.map((c) => (L && auto.has(c.id) ? { ...c, ...L.pos(c.id) } : c));
  const frames = new Map(components.map((c) => [c.id, componentFrame(c)]));
  const F = (k: string) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 };
  const routes = new Map<string, Vec[]>();
  const lines: SceneNode[] = [];
  for (const l of links) {
    if (!frames.has(l.from) || !frames.has(l.to)) continue;
    // With waypoints the connector draws exactly the points it is given, so
    // the ends are moved out to where the line leaves and enters the boxes.
    const laid = !l.via?.length && L && auto.has(l.from) && auto.has(l.to) ? L.route(l.from, l.to, o.route) : [];
    const via = l.via?.length ? l.via : laid.length > 2 ? laid.slice(1, -1) : undefined;
    const from = laid.length ? laid[0] : via ? rectEdge(F(l.from), via[0]) : F(l.from);
    const to = laid.length ? laid[laid.length - 1] : via ? rectEdge(F(l.to), via[via.length - 1]) : F(l.to);
    const c = connector({
      id: `${id}:link:${l.from}-${l.to}`, from, to, via, route: o.route,
      start: l.both ? 'arrow' : 'none', end: l.plain ? 'none' : 'arrow', dashed: l.dashed, tone: l.tone, label: l.label,
    });
    routes.set(`${l.from}>${l.to}`, c.points);
    lines.push(...c.nodes);
  }
  const shapes = components.flatMap((c) => component(c, { id, interactive: o.interactive, draggable: o.draggable }).nodes);
  // Zones are sized from the inside out: a zone that holds another zone's
  // components grows around that zone's box, label strip included, so
  // nested zones never overlap. That is why outer zones come first in the
  // list but are measured last.
  const byId = new Map(components.map((c) => [c.id, c]));
  const zoneBoxes = new Map<string, Box>();
  const zones: SceneNode[][] = [];
  for (const z of [...(o.zones ?? [])].reverse()) {
    const inner = z.around.filter((k) => byId.has(k)).map((k) => footprint(byId.get(k)!, F(k)));
    // any zone already measured whose components are all inside this one
    for (const other of o.zones ?? []) {
      const box = zoneBoxes.get(other.id);
      if (box && other !== z && other.around.every((k) => z.around.includes(k))) inner.push(box);
    }
    if (!inner.length) continue;
    const scene = zone({ id: `${id}:zone:${z.id}`, label: z.label, box: union(inner), padding: z.padding, tone: z.tone });
    const r = scene.nodes[0] as { x: number; y: number; w: number; h: number };
    zoneBoxes.set(z.id, { x: r.x - r.w / 2, y: r.y - r.h / 2, w: r.w, h: r.h });
    zones.unshift(scene.nodes);
  }
  return {
    nodes: [...zones.flat(), ...lines, ...shapes],
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
