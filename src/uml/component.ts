/**
 * UML component diagrams: components (a box with the little two-tab icon)
 * that offer and need interfaces.
 *
 *   notation             drawn as                     read as
 *   provides  ──○        stub + ball (lollipop)       the component implements this interface
 *   requires  ──(        stub + half circle (socket)  the component needs somebody to implement it
 *   assembly  ──(○──     socket around the ball       `from` (the requirer) is plugged into `to` (the provider)
 *   dependency  - - ->   dashed open arrow            from uses to
 *   delegate    ────>    solid open arrow             from forwards to to (a port to the inside)
 *
 * A `port` is a small square on a component's edge: a named place where
 * connections attach. A component with a `parent` is drawn inside it, and the
 * parent becomes a frame around its children (its size comes from them).
 *
 * You place the components (x, y = centre), or leave x/y out and the layered
 * layout (layout/layered.ts) places them left to right, requirers before the
 * providers they plug into; a parent's children are laid out inside it first,
 * and connections between nested components pull their parents together.
 *
 * Geometry of a plug (an assembly), left to right with the requirer on the left:
 *
 *   requirer ──────(○──── provider
 *            stub  ^ ^  stub
 *                  | ball (r 6) on the provider's stub
 *                  socket (r 10) on the requirer's stub, cupping the ball
 *
 * The plug sits halfway across the gap between the two boxes, on the line that
 * leaves the provider at a right angle; the requirer's stub elbows to it when
 * the two anchors are not aligned. An interface goes on the side of its box
 * that faces its partner (or `side`; by default provides faces the flow,
 * requires leaves in the flow's direction), and several on one side are
 * spread so that no two touch.
 *
 * Layouts never know about styling: boxes are `card`, frames `component-frame`,
 * the icon `comp-icon`, stubs `iface-line`, balls `iface`, sockets `socket`,
 * ports `port`, names `iface-label`; the stylesheet decides the looks.
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, circle, connector, estimateTextWidth, path, rect, text } from '../core';
import { layered } from '../layout';

export type Side = 'top' | 'right' | 'bottom' | 'left';
/** An interface by name, or with the side of the box it sits on. */
export type UmlInterface = string | { name: string; side?: Side };

export interface UmlPort {
  /** Unique among components and ports: connections can name it. */
  id: string;
  name?: string;
  /** Default 'left'. */
  side?: Side;
  /** Position along that side, 0..1. Default: ports on a side are spread evenly. */
  at?: number;
  /** Or an exact scene coordinate along the side: `x` for top/bottom, `y` for left/right (wins over `at`). */
  x?: number;
  y?: number;
}

export interface UmlComponent {
  id: string;
  name: string;
  /** Centre. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
  /** Shown above the name in guillemets, e.g. 'subsystem'. */
  stereotype?: string;
  provides?: readonly UmlInterface[];
  requires?: readonly UmlInterface[];
  ports?: readonly UmlPort[];
  /** Id of the component this one is drawn inside. */
  parent?: string;
  tone?: Tone;
  /** Minimum width. */
  width?: number;
}

export type ConnectionKind = 'assembly' | 'dependency' | 'delegate';

export interface Connection {
  /** A component id or a port id. For an assembly: the requirer (the socket side). */
  from: string;
  /** For an assembly: the provider (the ball side). */
  to: string;
  kind: ConnectionKind;
  /**
   * Assembly: which interface (default: the first one `from` requires that `to` provides).
   * Delegate / dependency: a provided interface of `to` to point at (its lollipop) instead of the box.
   */
  interface?: string;
  label?: string;
  tone?: Tone;
}

export interface ComponentOptions {
  id?: string;
  /** 'right' (default): requirers on the left. 'down': requirers on top. */
  direction?: 'right' | 'down';
  /** Components emit clicks with `{ component: id }`. */
  interactive?: boolean;
  draggable?: boolean;
  /** Components to fade; connections and interfaces on them fade too. */
  dim?: ReadonlySet<string>;
  /** Dependency and delegate routes: 'elbow' (default) or 'straight'. */
  route?: 'elbow' | 'straight';
  /** For components without x/y: space between layers and between neighbours. Defaults 90 and 40. */
  rankGap?: number;
  nodeGap?: number;
}

export interface ComponentDiagram extends Scene {
  /** Frame of a component or port. */
  frame(id: string): Frame;
  box(id: string): Frame;
  frames: Record<string, Frame>;
}

const NORMAL: Record<Side, Vec> = { top: V2(0, -1), right: V2(1, 0), bottom: V2(0, 1), left: V2(-1, 0) };
/** Sizes of the notation, in scene units. Exported so tests and callers can reason about the geometry. */
export const COMPONENT = {
  name: 13, stereo: 11, label: 12,
  /** Stub length, ball radius, socket radius. */
  stub: 16, ball: 6, socket: 10,
  /** Port square. */
  port: 10,
  /** Icon: a rect with two tabs on its left edge, at the top-right of a box. */
  icon: { w: 14, h: 16 },
  /** Frame title band and the padding a frame keeps round its children. */
  title: 32, framePad: 20,
  /** Spacing between interfaces on one side; box padding. */
  spread: 32, pad: 12,
} as const;
const { stub: STUB, ball: BALL, socket: SOCK, port: PORT } = COMPONENT;

interface Def { name: string; kind: 'provides' | 'requires'; side?: Side }
interface Ifc extends Def { comp: string; side: Side; a: Vec; n: Vec; key: string }

const norm = (i: UmlInterface) => (typeof i === 'string' ? { name: i } : i);
/** The side of `a` that faces `b`. */
const facing = (a: Frame, b: Frame): Side => (Math.abs(b.x - a.x) * a.h >= Math.abs(b.y - a.y) * a.w ? (b.x > a.x ? 'right' : 'left') : b.y > a.y ? 'bottom' : 'top');
/** A point on a side of a frame, a fraction t of the way along it. */
const onSide = (f: Frame, s: Side, t: number): Vec =>
  s === 'left' ? V2(f.x - f.w / 2, f.y - f.h / 2 + t * f.h) : s === 'right' ? V2(f.x + f.w / 2, f.y - f.h / 2 + t * f.h)
  : s === 'top' ? V2(f.x - f.w / 2 + t * f.w, f.y - f.h / 2) : V2(f.x - f.w / 2 + t * f.w, f.y + f.h / 2);
const horizontal = (s: Side) => s === 'left' || s === 'right';
const along = (p: Vec, n: Vec, d: number) => V2(p.x + n.x * d, p.y + n.y * d);
const P = (v: Vec): [number, number] => [v.x, v.y];

/** Half circle of radius r around c, bulging toward `d` (a unit vector). */
function arc(c: Vec, d: Vec, r: number): [number, number][] {
  const t0 = Math.atan2(d.y, d.x);
  return Array.from({ length: 9 }, (_, i) => {
    const t = t0 - Math.PI / 2 + (i / 8) * Math.PI;
    return [c.x + r * Math.cos(t), c.y + r * Math.sin(t)];
  });
}

/** Size of a leaf component box: the name (with room for the icon beside it) and its interfaces. */
export function componentSize(c: UmlComponent, sides: { leftRight: number; topBottom: number } = { leftRight: 0, topBottom: 0 }): { w: number; h: number } {
  const tw = Math.max(estimateTextWidth(c.name, COMPONENT.name), c.stereotype ? estimateTextWidth(`«${c.stereotype}»`, COMPONENT.stereo) : 0);
  return {
    w: Math.max(c.width ?? 110, Math.ceil(tw + 2 * COMPONENT.pad + 2 * (COMPONENT.icon.w + 2)), sides.topBottom * 96 + 2 * COMPONENT.pad),
    h: Math.max(c.stereotype ? 64 : 56, sides.leftRight * COMPONENT.spread + 24),
  };
}

export function component(input: readonly UmlComponent[], connections: readonly Connection[] = [], o: ComponentOptions = {}): ComponentDiagram {
  const id = o.id ?? 'comp';
  const right = o.direction !== 'down';
  const byId = new Map(input.map((c) => [c.id, c]));
  const owner = new Map(input.flatMap((c) => (c.ports ?? []).map((p) => [p.id, c.id] as const)));
  const dimOf = (k: string) => (o.dim?.has(k) ? 0.3 : 1);

  // 1. interfaces per component, plus the ones an assembly names but nobody declared
  const defs = new Map<string, Def[]>(input.map((c) => [c.id, [...(c.provides ?? []).map((i) => ({ ...norm(i), kind: 'provides' as const })), ...(c.requires ?? []).map((i) => ({ ...norm(i), kind: 'requires' as const }))]]));
  const names = (k: string, kind: Def['kind']) => (defs.get(k) ?? []).filter((d) => d.kind === kind).map((d) => d.name);
  const assemblies = connections.flatMap((c, i) => {
    if (c.kind !== 'assembly' || !defs.has(c.from) || !defs.has(c.to)) return [];
    const name = c.interface ?? names(c.from, 'requires').find((n) => names(c.to, 'provides').includes(n)) ?? names(c.to, 'provides')[0] ?? names(c.from, 'requires')[0] ?? 'interface';
    for (const [k, kind] of [[c.from, 'requires'], [c.to, 'provides']] as const) if (!names(k, kind).includes(name)) defs.get(k)!.push({ name, kind });
    return [{ i, req: c.from, prov: c.to, name, tone: c.tone }];
  });
  const key = (comp: string, kind: Def['kind'], name: string) => `${comp}|${kind}|${name}`;
  const partner = new Map<string, string>();
  for (const a of assemblies) (partner.set(key(a.req, 'requires', a.name), a.prov), partner.set(key(a.prov, 'provides', a.name), a.req));
  const nominal = (d: Def): Side => d.side ?? (right ? (d.kind === 'provides' ? 'left' : 'right') : d.kind === 'provides' ? 'top' : 'bottom');

  // 2. sizes: leaves from their text and interfaces, parents from their children
  const kids = (p?: string) => input.filter((c) => (c.parent ?? undefined) === p);
  const fixed = (c: UmlComponent): boolean => (kids(c.id).length ? kids(c.id).every(fixed) : c.x != null && c.y != null);
  const auto = (c: UmlComponent) => !fixed(c) && (c.x == null || c.y == null);
  const sizes = new Map<string, { w: number; h: number }>();
  const local = new Map<string, Vec>();
  const lift = (k: string, level?: string): string | undefined => {
    let cur: string | undefined = owner.get(k) ?? k;
    while (cur) {
      const c = byId.get(cur);
      if (!c) return undefined;
      if ((c.parent ?? undefined) === level) return cur;
      cur = c.parent;
    }
  };
  const { title: TITLE, framePad: FPAD } = COMPONENT;
  const lay = (level?: string) => {
    const ks = kids(level).filter(auto), ids = new Set(ks.map((k) => k.id));
    const edges = connections.map((c) => ({ from: lift(c.from, level), to: lift(c.to, level) }))
      .filter((e): e is { from: string; to: string } => !!e.from && !!e.to && e.from !== e.to && ids.has(e.from) && ids.has(e.to));
    return layered(ks.map((k) => ({ id: k.id, ...sizes.get(k.id)! })), edges, { direction: o.direction ?? 'right', rankGap: o.rankGap ?? 90, nodeGap: o.nodeGap ?? 40 });
  };
  const build = (c: UmlComponent) => {
    const ks = kids(c.id);
    ks.forEach(build);
    if (!ks.length) {
      const count = (s: Side) => (defs.get(c.id) ?? []).filter((d) => nominal(d) === s).length;
      sizes.set(c.id, componentSize(c, { leftRight: Math.max(count('left'), count('right')), topBottom: Math.max(count('top'), count('bottom')) }));
    } else if (!fixed(c)) {
      const L = lay(c.id), b = L.box;
      sizes.set(c.id, { w: Math.max(b.w + 2 * FPAD, estimateTextWidth(c.name, COMPONENT.name) + 80), h: b.h + TITLE + FPAD + FPAD });
      for (const k of ks.filter(auto)) local.set(k.id, V2(L.pos(k.id).x - (b.x + b.w / 2), L.pos(k.id).y - (b.y + b.h / 2) + TITLE / 2));
    }
  };
  const tops = kids(undefined);
  tops.forEach(build);

  // 3. positions
  const frames = new Map<string, Frame>();
  const place = (c: UmlComponent, cx?: number, cy?: number): void => {
    const ks = kids(c.id);
    if (ks.length && fixed(c)) {
      ks.forEach((k) => place(k));
      const fs = ks.map((k) => frames.get(k.id)!);
      const x0 = Math.min(...fs.map((f) => f.x - f.w / 2)) - FPAD, x1 = Math.max(...fs.map((f) => f.x + f.w / 2)) + FPAD;
      const y0 = Math.min(...fs.map((f) => f.y - f.h / 2)) - TITLE - FPAD, y1 = Math.max(...fs.map((f) => f.y + f.h / 2)) + FPAD;
      frames.set(c.id, { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 });
      return;
    }
    const x = cx ?? c.x ?? 0, y = cy ?? c.y ?? 0;
    frames.set(c.id, { x, y, ...sizes.get(c.id)! });
    for (const k of ks) {
      const l = local.get(k.id);
      if (l) place(k, x + l.x, y + l.y);
      else place(k);
    }
  };
  const top = tops.some(auto) ? lay(undefined) : undefined;
  for (const c of tops) place(c, auto(c) ? top!.pos(c.id).x : undefined, auto(c) ? top!.pos(c.id).y : undefined);
  const F = (k: string) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 };

  // ports sit on their component's edge
  for (const c of input) {
    const ps = c.ports ?? [];
    for (const p of ps) {
      const s = p.side ?? 'left', same = ps.filter((q) => (q.side ?? 'left') === s && q.at == null);
      const f = F(c.id), t = p.at ?? (same.indexOf(p) + 1) / (same.length + 1);
      const a = onSide(f, s, t);
      if (horizontal(s) && p.y != null) a.y = p.y;
      if (!horizontal(s) && p.x != null) a.x = p.x;
      frames.set(p.id, { x: a.x, y: a.y, w: PORT, h: PORT });
    }
  }

  // 4. interface anchors: the side facing the partner, spread along each side in the partners' order
  const ifcs: Ifc[] = [];
  for (const c of input) {
    const f = F(c.id), ds = defs.get(c.id) ?? [];
    const sideOf = (d: Def) => {
      const p = partner.get(key(c.id, d.kind, d.name));
      return d.side ?? (p ? facing(f, F(p)) : nominal(d));
    };
    // where the partner is along this side, so lines leaving one side never cross each other
    const order = (d: Def, s: Side) => {
      const p = partner.get(key(c.id, d.kind, d.name));
      return p ? (horizontal(s) ? F(p).y : F(p).x) : Infinity;
    };
    const sided = ds.map((d) => ({ d, s: sideOf(d) }));
    for (const s of ['top', 'right', 'bottom', 'left'] as const) {
      const same = sided.filter((x) => x.s === s).sort((p, q) => order(p.d, s) - order(q.d, s));
      same.forEach(({ d }, i) => ifcs.push({ ...d, comp: c.id, side: s, a: onSide(f, s, (i + 1) / (same.length + 1)), n: NORMAL[s], key: key(c.id, d.kind, d.name) }));
    }
  }
  const ifc = (comp: string, kind: Def['kind'], name: string) => ifcs.find((i) => i.key === key(comp, kind, name))!;
  const asmReq = new Set(assemblies.map((a) => key(a.req, 'requires', a.name)));
  const asmProv = new Map(assemblies.map((a) => [key(a.prov, 'provides', a.name), a] as const));

  // the centre of a provided interface's ball: on the lollipop, or halfway across the gap when plugged in
  const ballOf = (p: Ifc): Vec => {
    const a = asmProv.get(p.key);
    if (!a) return along(p.a, p.n, STUB + BALL);
    const r = ifc(a.req, 'requires', a.name);
    const gap = (r.a.x - p.a.x) * p.n.x + (r.a.y - p.a.y) * p.n.y; // from the provider's edge to the requirer's anchor, along the stub
    const d = Math.max(STUB + BALL, Math.min(gap / 2, gap - SOCK - STUB - 10));
    return along(p.a, p.n, d);
  };

  // 5. paint
  const depth = (c: UmlComponent): number => (c.parent && byId.get(c.parent) ? 1 + depth(byId.get(c.parent)!) : 0);
  const ordered = [...input].sort((p, q) => depth(p) - depth(q));
  const parents = ordered.filter((c) => kids(c.id).length), leaves = ordered.filter((c) => !kids(c.id).length);
  const nodes: (SceneNode | null)[] = [];
  const ev = (c: UmlComponent) => ({ interactive: o.interactive, draggable: o.draggable, data: { component: c.id } });
  const icon = (k: string, f: Frame, opacity: number, tone?: Tone) => {
    const { w, h } = COMPONENT.icon;
    const ix = f.x + f.w / 2 - COMPONENT.pad - w, iy = f.y - f.h / 2 + 8;
    const box = (x: number, y: number, bw: number, bh: number) => [[x, y], [x + bw, y], [x + bw, y + bh], [x, y + bh]] as [number, number][];
    return [
      path({ id: `${k}:icon`, points: box(ix, iy, w, h), closed: true, role: 'comp-icon', tone, opacity }),
      path({ id: `${k}:tab1`, points: box(ix - 3, iy + 3, 7, 3.5), closed: true, role: 'comp-icon', tone, opacity }),
      path({ id: `${k}:tab2`, points: box(ix - 3, iy + 9.5, 7, 3.5), closed: true, role: 'comp-icon', tone, opacity }),
    ];
  };
  for (const c of parents) {
    const f = F(c.id), k = `${id}:c:${c.id}`, opacity = dimOf(c.id);
    nodes.push(
      rect({ id: k, ...f, rx: 6, role: 'component-frame', tone: c.tone, opacity, ...ev(c) }),
      text({ id: `${k}:name`, x: f.x - f.w / 2 + COMPONENT.pad, y: f.y - f.h / 2 + TITLE / 2 + 1, text: c.name, size: COMPONENT.name, role: 'class-name', anchor: 'start', opacity }),
      ...icon(k, f, opacity, c.tone),
    );
  }
  for (const c of leaves) {
    const f = F(c.id), k = `${id}:c:${c.id}`, opacity = dimOf(c.id), s = c.stereotype ? 8 : 0;
    nodes.push(
      rect({ id: k, ...f, rx: 6, role: 'card', tone: c.tone, opacity, ...ev(c) }),
      c.stereotype ? text({ id: `${k}:stereo`, x: f.x, y: f.y - 9, text: `«${c.stereotype}»`, size: COMPONENT.stereo, role: 'stereotype', opacity }) : null,
      text({ id: `${k}:name`, x: f.x, y: f.y + s, text: c.name, size: COMPONENT.name, role: 'class-name', opacity }),
      ...icon(k, f, opacity, c.tone),
    );
  }
  // dependencies and delegates: box to box, or to a provided interface's ball when one is named
  const target = (c: Connection): Frame => {
    const p = c.interface ? ifcs.find((i) => i.comp === c.to && i.kind === 'provides' && i.name === c.interface) : undefined;
    if (!p) return F(c.to);
    const b = ballOf(p);
    return { x: b.x, y: b.y, w: 2 * BALL, h: 2 * BALL };
  };
  connections.forEach((c, i) => {
    if (c.kind === 'assembly' || !frames.has(c.from) || !frames.has(c.to)) return;
    const opacity = o.dim?.has(lift(c.from) ?? c.from) || o.dim?.has(lift(c.to) ?? c.to) ? 0.25 : 1;
    const k = `${id}:conn:${i}`;
    const line = connector({ id: k, from: F(c.from), to: target(c), route: o.route ?? 'elbow', end: 'open', dashed: c.kind === 'dependency', tone: c.tone, opacity });
    nodes.push(...line.nodes);
    if (c.label) nodes.push(text({ id: `${k}:label`, ...beside(line.points), text: c.label, size: COMPONENT.label, role: 'edge-label', tone: c.tone, opacity }));
  });
  // lollipops, sockets and plugs. A name sits clear of its stub: above a horizontal one, beside a vertical one.
  const label = (k: string, at: Vec, n: Vec, r: number, opacity: number, name: string) =>
    text({
      id: `${k}:label`, text: name, size: COMPONENT.label, role: 'iface-label', opacity,
      ...(n.x !== 0 ? { x: at.x, y: at.y - r - 8 } : { x: at.x + r + 6, y: at.y, anchor: 'start' as const }),
    });
  for (const i of ifcs) {
    const k = `${id}:i:${i.comp}:${i.kind === 'provides' ? 'p' : 'r'}:${i.name}`, opacity = dimOf(i.comp), a = i.a, n = i.n;
    const own = byId.get(i.comp)?.tone;
    if (i.kind === 'provides') {
      const asm = asmProv.get(i.key), tone = asm?.tone ?? own, c = ballOf(i);
      nodes.push(
        path({ id: `${k}:stub`, points: [P(a), P(along(c, n, -BALL))], role: 'iface-line', tone, opacity }),
        circle({ id: `${k}:ball`, x: c.x, y: c.y, r: BALL, role: 'iface', tone, opacity }),
        label(k, c, n, asm ? SOCK : BALL, asm ? Math.min(opacity, dimOf(asm.req)) : opacity, i.name),
      );
    } else if (!asmReq.has(i.key)) {
      // a socket nobody is plugged into: stub, then a half circle bulging back toward the box
      const c = along(a, n, STUB + SOCK);
      nodes.push(
        path({ id: `${k}:stub`, points: [P(a), P(along(a, n, STUB))], role: 'iface-line', tone: own, opacity }),
        path({ id: `${k}:arc`, points: arc(c, V2(-n.x, -n.y), SOCK), role: 'socket', tone: own, opacity }),
        label(k, c, n, SOCK, opacity, i.name),
      );
    }
  }
  // ball and socket: the requirer's half circle closes around the provider's ball, its stub elbows back to its box
  for (const a of assemblies) {
    const r = ifc(a.req, 'requires', a.name), p = ifc(a.prov, 'provides', a.name);
    const k = `${id}:asm:${a.i}`, opacity = o.dim?.has(a.req) || o.dim?.has(a.prov) ? 0.25 : 1;
    const ball = ballOf(p);
    const back = along(ball, p.n, SOCK), end = along(ball, p.n, SOCK + STUB);
    const corner = horizontal(p.side) ? V2(end.x, r.a.y) : V2(r.a.x, end.y);
    const bend = Math.hypot(corner.x - end.x, corner.y - end.y) > 1;
    nodes.push(
      path({ id: `${k}:socket`, points: arc(ball, p.n, SOCK), role: 'socket', tone: a.tone, opacity }),
      path({ id: `${k}:stub`, points: [P(r.a), ...(bend ? [P(corner)] : []), P(end), P(back)], role: 'iface-line', tone: a.tone, opacity }),
    );
  }
  for (const c of input) for (const p of c.ports ?? []) {
    const f = F(p.id), k = `${id}:port:${p.id}`, s = p.side ?? 'left', n = NORMAL[s];
    nodes.push(rect({ id: k, ...f, role: 'port', tone: c.tone, opacity: dimOf(c.id) }));
    if (p.name) nodes.push(text({
      id: `${k}:label`, text: p.name, size: COMPONENT.stereo, role: 'iface-label', opacity: dimOf(c.id),
      ...(n.x !== 0 ? { x: f.x, y: f.y - PORT / 2 - 7 } : { x: f.x + PORT / 2 + 5, y: f.y, anchor: 'start' as const }),
    }));
  }
  const frame = (k: string) => F(k);
  return { nodes: nodes.filter((n): n is SceneNode => n !== null), frame, box: frame, frames: Object.fromEntries(frames) };
}

/** A label position just off the middle of a polyline: above a horizontal run, to the right of a vertical one. */
function beside(pts: readonly Vec[]): { x: number; y: number; anchor?: 'start' } {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  let d = lens.reduce((s, l) => s + l, 0) / 2, i = 0;
  while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
  const a = pts[i], b = pts[i + 1], t = lens[i] ? d / lens[i] : 0;
  const m = V2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  return Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? { x: m.x, y: m.y - 9 } : { x: m.x + 8, y: m.y, anchor: 'start' };
}
