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
 * and connections between nested components pull their parents together. An
 * interface goes on the side of its box that faces the component it is
 * connected to (or `side`; by default provides faces the flow, requires leaves
 * in the flow's direction).
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, circle, connector, estimateTextWidth, path, rect, text } from '@figurae/core';
import { layered } from '@figurae/layout';

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
  /** Assembly only: which interface. Default: the first one `from` requires that `to` provides. */
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
const STUB = 16, BALL = 6, SOCK_STUB = 10, SOCK_R = 9, ASM_R = 11, TITLE = 36, PAD = 24, PORT = 12;

interface Def { name: string; kind: 'provides' | 'requires'; side?: Side }
interface Ifc extends Def { comp: string; side: Side; a: Vec; n: Vec; key: string }

const norm = (i: UmlInterface) => (typeof i === 'string' ? { name: i } : i);
/** The side of `a` that faces `b`. */
const facing = (a: Frame, b: Frame): Side => (Math.abs(b.x - a.x) * a.h >= Math.abs(b.y - a.y) * a.w ? (b.x > a.x ? 'right' : 'left') : b.y > a.y ? 'bottom' : 'top');
/** A point on a side of a frame, a fraction t of the way along it. */
const onSide = (f: Frame, s: Side, t: number): Vec =>
  s === 'left' ? V2(f.x - f.w / 2, f.y - f.h / 2 + t * f.h) : s === 'right' ? V2(f.x + f.w / 2, f.y - f.h / 2 + t * f.h)
  : s === 'top' ? V2(f.x - f.w / 2 + t * f.w, f.y - f.h / 2) : V2(f.x - f.w / 2 + t * f.w, f.y + f.h / 2);

/** Half circle of radius r around c, bulging toward `d` (a unit vector). */
function arc(c: Vec, d: Vec, r: number): [number, number][] {
  const t0 = Math.atan2(d.y, d.x);
  return Array.from({ length: 9 }, (_, i) => {
    const t = t0 - Math.PI / 2 + (i / 8) * Math.PI;
    return [c.x + r * Math.cos(t), c.y + r * Math.sin(t)];
  });
}

/** A right-angled line from a to b that leaves a along `n` (axis-aligned). */
function elbow(a: Vec, b: Vec, n: Vec): [number, number][] {
  if (n.x !== 0 ? Math.abs(a.y - b.y) < 1 : Math.abs(a.x - b.x) < 1) return [[a.x, a.y], [b.x, b.y]];
  return n.x !== 0
    ? [[a.x, a.y], [(a.x + b.x) / 2, a.y], [(a.x + b.x) / 2, b.y], [b.x, b.y]]
    : [[a.x, a.y], [a.x, (a.y + b.y) / 2], [b.x, (a.y + b.y) / 2], [b.x, b.y]];
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
  const lay = (level?: string) => {
    const ks = kids(level).filter(auto), ids = new Set(ks.map((k) => k.id));
    const edges = connections.map((c) => ({ from: lift(c.from, level), to: lift(c.to, level) }))
      .filter((e): e is { from: string; to: string } => !!e.from && !!e.to && e.from !== e.to && ids.has(e.from) && ids.has(e.to));
    return layered(ks.map((k) => ({ id: k.id, ...sizes.get(k.id)! })), edges, { direction: o.direction ?? 'right', rankGap: o.rankGap ?? 120, nodeGap: o.nodeGap ?? 50 });
  };
  const build = (c: UmlComponent) => {
    const ks = kids(c.id);
    ks.forEach(build);
    if (!ks.length) {
      const count = (s: Side) => (defs.get(c.id) ?? []).filter((d) => nominal(d) === s).length;
      sizes.set(c.id, {
        w: Math.max(c.width ?? 150, Math.ceil(estimateTextWidth(c.name, 13) + 56), 120 * Math.max(count('top'), count('bottom'))),
        h: Math.max(c.stereotype ? 76 : 64, 40 * Math.max(count('left'), count('right')) + 16),
      });
    } else if (!fixed(c)) {
      const L = lay(c.id), b = L.box;
      sizes.set(c.id, { w: Math.max(b.w + 2 * PAD, estimateTextWidth(c.name, 13) + 80), h: b.h + TITLE + PAD });
      for (const k of ks.filter(auto)) local.set(k.id, V2(L.pos(k.id).x - (b.x + b.w / 2), L.pos(k.id).y - (b.y + b.h / 2) + (TITLE - PAD) / 2));
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
      const x0 = Math.min(...fs.map((f) => f.x - f.w / 2)) - PAD, x1 = Math.max(...fs.map((f) => f.x + f.w / 2)) + PAD;
      const y0 = Math.min(...fs.map((f) => f.y - f.h / 2)) - TITLE, y1 = Math.max(...fs.map((f) => f.y + f.h / 2)) + PAD;
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
      const t = p.at ?? (same.indexOf(p) + 1) / (same.length + 1);
      const a = onSide(F(c.id), s, t);
      frames.set(p.id, { x: a.x, y: a.y, w: PORT, h: PORT });
    }
  }

  // 4. interface anchors: the side facing the partner, spread along each side
  const ifcs: Ifc[] = [];
  for (const c of input) {
    const f = F(c.id), ds = defs.get(c.id) ?? [];
    const sideOf = (d: Def) => {
      const p = partner.get(key(c.id, d.kind, d.name));
      return d.side ?? (p ? facing(f, F(p)) : nominal(d));
    };
    const sides = ds.map(sideOf);
    ds.forEach((d, i) => {
      const s = sides[i], same = sides.filter((x) => x === s);
      ifcs.push({ ...d, comp: c.id, side: s, a: onSide(f, s, (sides.slice(0, i).filter((x) => x === s).length + 1) / (same.length + 1)), n: NORMAL[s], key: key(c.id, d.kind, d.name) });
    });
  }
  const ifc = (comp: string, kind: Def['kind'], name: string) => ifcs.find((i) => i.key === key(comp, kind, name))!;
  const asmReq = new Set(assemblies.map((a) => key(a.req, 'requires', a.name)));
  const asmTone = new Map(assemblies.map((a) => [key(a.prov, 'provides', a.name), a.tone] as const));

  // 5. paint
  const depth = (c: UmlComponent): number => (c.parent && byId.get(c.parent) ? 1 + depth(byId.get(c.parent)!) : 0);
  const ordered = [...input].sort((p, q) => depth(p) - depth(q));
  const parents = ordered.filter((c) => kids(c.id).length), leaves = ordered.filter((c) => !kids(c.id).length);
  const nodes: (SceneNode | null)[] = [];
  const ev = (c: UmlComponent) => ({ interactive: o.interactive, draggable: o.draggable, data: { component: c.id } });
  const icon = (k: string, f: Frame, opacity: number, tone?: Tone) => {
    const ix = f.x + f.w / 2 - 28, iy = f.y - f.h / 2 + 9, box = (x: number, y: number, w: number, h: number) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] as [number, number][];
    return [
      path({ id: `${k}:icon`, points: box(ix, iy, 18, 12), closed: true, role: 'comp-icon', tone, opacity }),
      path({ id: `${k}:tab1`, points: box(ix - 4, iy + 2, 8, 3.5), closed: true, role: 'comp-icon', tone, opacity }),
      path({ id: `${k}:tab2`, points: box(ix - 4, iy + 7, 8, 3.5), closed: true, role: 'comp-icon', tone, opacity }),
    ];
  };
  for (const c of parents) {
    const f = F(c.id), k = `${id}:c:${c.id}`, opacity = dimOf(c.id);
    nodes.push(
      rect({ id: k, ...f, rx: 6, role: 'component-frame', tone: c.tone, opacity, ...ev(c) }),
      text({ id: `${k}:name`, x: f.x - f.w / 2 + 14, y: f.y - f.h / 2 + 19, text: c.name, size: 13, role: 'class-name', anchor: 'start', opacity }),
      ...icon(k, f, opacity),
    );
  }
  connections.forEach((c, i) => {
    if (c.kind === 'assembly' || !frames.has(c.from) || !frames.has(c.to)) return;
    nodes.push(...connector({
      id: `${id}:conn:${i}`, from: F(c.from), to: F(c.to), route: o.route ?? 'elbow', end: 'open', dashed: c.kind === 'dependency',
      label: c.label, tone: c.tone, opacity: o.dim?.has(lift(c.from) ?? c.from) || o.dim?.has(lift(c.to) ?? c.to) ? 0.25 : 1,
    }).nodes);
  });
  for (const c of leaves) {
    const f = F(c.id), k = `${id}:c:${c.id}`, opacity = dimOf(c.id), s = c.stereotype ? 8 : 0;
    nodes.push(
      rect({ id: k, ...f, rx: 6, role: 'card', tone: c.tone, opacity, ...ev(c) }),
      c.stereotype ? text({ id: `${k}:stereo`, x: f.x, y: f.y - 9, text: `«${c.stereotype}»`, size: 11, role: 'stereotype', opacity }) : null,
      text({ id: `${k}:name`, x: f.x, y: f.y + s, text: c.name, size: 13, role: 'class-name', opacity }),
      ...icon(k, f, opacity),
    );
  }
  for (const i of ifcs) {
    const k = `${id}:i:${i.comp}:${i.kind === 'provides' ? 'p' : 'r'}:${i.name}`, opacity = dimOf(i.comp), a = i.a, n = i.n;
    const label = (at: Vec) => text({
      id: `${k}:label`, text: i.name, size: 11, role: 'iface-label', opacity,
      ...(n.x !== 0 ? { x: a.x + n.x * 4, y: a.y - 16, anchor: n.x > 0 ? 'start' as const : 'end' as const } : { x: a.x, y: at.y + n.y * 12 }),
    });
    if (i.kind === 'provides') {
      const tone = asmTone.get(i.key), c = V2(a.x + n.x * (STUB + BALL), a.y + n.y * (STUB + BALL));
      nodes.push(
        path({ id: `${k}:stub`, points: [[a.x, a.y], [a.x + n.x * STUB, a.y + n.y * STUB]], role: 'iface-line', tone, opacity }),
        circle({ id: `${k}:ball`, x: c.x, y: c.y, r: BALL, role: 'iface', tone, opacity }),
        label(c),
      );
    } else if (!asmReq.has(i.key)) {
      // a socket nobody is plugged into: stub, then a half circle bulging back toward the box
      const c = V2(a.x + n.x * (SOCK_STUB + SOCK_R), a.y + n.y * (SOCK_STUB + SOCK_R));
      nodes.push(
        path({ id: `${k}:stub`, points: [[a.x, a.y], [a.x + n.x * SOCK_STUB, a.y + n.y * SOCK_STUB]], role: 'iface-line', opacity }),
        path({ id: `${k}:arc`, points: arc(c, V2(-n.x, -n.y), SOCK_R), role: 'socket', opacity }),
        label(c),
      );
    }
  }
  // ball and socket: the requirer's half circle closes around the provider's ball
  for (const a of assemblies) {
    const r = ifc(a.req, 'requires', a.name), p = ifc(a.prov, 'provides', a.name);
    const k = `${id}:asm:${a.i}`, opacity = o.dim?.has(a.req) || o.dim?.has(a.prov) ? 0.25 : 1;
    const ball = V2(p.a.x + p.n.x * (STUB + BALL), p.a.y + p.n.y * (STUB + BALL));
    const back = V2(ball.x - r.n.x * ASM_R, ball.y - r.n.y * ASM_R);
    nodes.push(
      path({ id: `${k}:socket`, points: arc(ball, V2(-r.n.x, -r.n.y), ASM_R), role: 'socket', tone: a.tone, opacity }),
      path({ id: `${k}:stub`, points: elbow(r.a, back, r.n), role: 'iface-line', tone: a.tone, opacity }),
    );
  }
  for (const c of input) for (const p of c.ports ?? []) {
    const f = F(p.id), k = `${id}:port:${p.id}`, s = p.side ?? 'left', n = NORMAL[s];
    nodes.push(rect({ id: k, ...f, role: 'port', opacity: dimOf(c.id) }));
    if (p.name) nodes.push(text({ id: `${k}:label`, x: f.x + n.x * 12 + (n.x === 0 ? 0 : n.x * 2), y: f.y + n.y * 12 - (n.x === 0 ? 0 : 14), text: p.name, size: 11, role: 'iface-label', anchor: n.x === 0 ? 'middle' : n.x > 0 ? 'start' : 'end', opacity: dimOf(c.id) }));
  }
  const frame = (k: string) => F(k);
  return { nodes: nodes.filter((n): n is SceneNode => n !== null), frame, box: frame, frames: Object.fromEntries(frames) };
}
