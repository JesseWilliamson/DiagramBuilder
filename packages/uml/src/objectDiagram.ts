/**
 * UML object diagrams: a snapshot of a running program. Where a class diagram
 * says what CAN exist, an object diagram shows what DOES, at one moment.
 *
 *   thing        drawn as                                  read as
 *   instance     box, UNDERLINED title `name : Class`      an object of that class
 *   anonymous    box, underlined `: Class`                 an object nobody named
 *   slots        `attr = value` lines under a divider      the attribute values right now
 *   link         plain line, role names at the ends        two objects are connected
 *
 * It is the runtime twin of classDiagram: the same box, the same compartments,
 * the same spacing (sizes come from classDiagram's own `classSize`). Give an
 * object the same id as its class and the boxes morph between the two views.
 * The underline is what says "instance" rather than "class".
 *
 * You place the objects (x, y = centre), or leave x/y out and the layered
 * layout (layout/layered.ts) places them along the links.
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, connector, estimateTextWidth, path, rect, text, vadd, vnorm, vperp, vscale, vsub } from '@dsviz/core';
import { layered } from '@dsviz/layout';
import { classSize } from './classDiagram';

export type SlotValue = string | number | boolean;

export interface UmlObject {
  id: string;
  /** The instance name: `name : Class`. Ignored (and may be left out) when `anonymous`. */
  name?: string;
  /** The class it is an instance of. */
  class?: string;
  /** Draw `: Class` with no name. */
  anonymous?: boolean;
  /** Attribute values, one line each: { radius: 5 } → `radius = 5`. */
  slots?: Readonly<Record<string, SlotValue>>;
  /** Centre. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
  tone?: Tone;
  /** Minimum width. */
  width?: number;
}

export interface ObjectLink {
  from: string;
  to: string;
  /** Role names at each end, e.g. 'owner' / 'items'. */
  fromRole?: string;
  toRole?: string;
  /** Text at the middle of the line. */
  label?: string;
  tone?: Tone;
}

export interface ObjectDiagramOptions {
  id?: string;
  /** Hide the slots compartment (just the titles). */
  collapsed?: boolean;
  /** Boxes emit clicks with `{ object: id }`. */
  interactive?: boolean;
  /** Boxes can be dragged; drag data is `{ object: id }`. */
  draggable?: boolean;
  /** 'elbow' (default) for right-angled lines with one bend, like classDiagram, or 'straight'. Links sharing a side of a box spread along it. */
  route?: 'elbow' | 'straight';
  /** Objects to fade. */
  dim?: ReadonlySet<string>;
  /** For objects without x/y: space between layers and between neighbours. Defaults 64 and 40. */
  rankGap?: number;
  nodeGap?: number;
}

export interface ObjectDiagram extends Scene {
  /** The box drawn for an object (centre + size). */
  box(id: string): Frame;
}

const NAME = 14, MEMBER = 12, ROW = 18, PAD = 10;

/** `name : Class`, `: Class` or just the name. */
export const objectTitle = (u: UmlObject): string =>
  u.anonymous ? `: ${u.class ?? ''}` : u.class ? `${u.name ?? u.id} : ${u.class}` : (u.name ?? u.id);

/** The slot lines: `attr = value`. */
export const slotLines = (u: UmlObject): string[] => Object.entries(u.slots ?? {}).map(([k, v]) => `${k} = ${v}`);

/** Size of an instance box: exactly the class box that would hold the same lines. */
export const objectSize = (u: UmlObject, collapsed = false) =>
  classSize({ id: u.id, name: objectTitle(u), attributes: slotLines(u), width: u.width }, collapsed);

export function objectDiagram(input: readonly UmlObject[], links: readonly ObjectLink[] = [], o: ObjectDiagramOptions = {}): ObjectDiagram {
  const id = o.id ?? 'obj';
  const free = input.filter((u) => u.x == null || u.y == null);
  let objects = input;
  if (free.length) {
    const L = layered(free.map((u) => ({ id: u.id, ...objectSize(u, o.collapsed) })), links, { rankGap: o.rankGap ?? 64, nodeGap: o.nodeGap ?? 40 });
    const auto = new Set(free.map((u) => u.id));
    objects = input.map((u) => (auto.has(u.id) ? { ...u, ...L.pos(u.id) } : u));
  }
  const frames = new Map<string, Frame>();
  const lines: SceneNode[] = [];
  const boxes: SceneNode[] = [];

  for (const u of objects) {
    const { w, h, head } = objectSize(u, o.collapsed);
    const cx = u.x ?? 0, cy = u.y ?? 0;
    frames.set(u.id, { x: cx, y: cy, w, h });
    const top = cy - h / 2, left = cx - w / 2;
    const k = `${id}:${u.id}`;
    const dim = o.dim?.has(u.id) ? 0.3 : 1;
    const title = objectTitle(u);
    const ty = top + 8 + NAME / 2 + 1;
    // text is centred on `ty`, so its baseline sits about 0.35em below; the underline goes 2px under that
    const half = (estimateTextWidth(title, NAME) * 0.92) / 2, uy = ty + NAME * 0.35 + 2;
    boxes.push(
      rect({ id: `${k}:box`, x: cx, y: cy, w, h, rx: 6, role: 'card', tone: u.tone, opacity: dim, interactive: o.interactive, draggable: o.draggable, data: { object: u.id } }),
      text({ id: `${k}:name`, x: cx, y: ty, text: title, size: NAME, role: 'object-name', opacity: dim }),
      // the underline is what makes it an instance: as wide as the title is estimated to be (bold, so a touch narrower per char)
      path({ id: `${k}:underline`, points: [[cx - half, uy], [cx + half, uy]], role: 'object-name-underline', opacity: dim }),
    );
    if (o.collapsed) continue;
    const slots = slotLines(u);
    if (!slots.length) continue;
    const slotTop = top + head;
    boxes.push(path({ id: `${k}:div1`, points: [[left, slotTop], [left + w, slotTop]], role: 'divider', opacity: dim }));
    slots.forEach((s, i) =>
      boxes.push(text({ id: `${k}:slot:${i}`, x: left + PAD, y: slotTop + 8 + i * ROW + ROW / 2, text: s, size: MEMBER, role: 'member', anchor: 'start', opacity: dim })),
    );
  }

  // Ports: each link leaves and enters through the sides that face each other:
  // top/bottom when the boxes sit on different rows (so a link from a box on the
  // row above drops down into its target instead of cutting across the row),
  // left/right when they are level. Several links on one side of a box spread
  // along it, in the order of their far ends, so they never converge on one point.
  const M = 14, SPREAD = 24;
  const sideOf = (a: Frame, b: Frame): 'v' | 'h' => (Math.abs(b.y - a.y) >= (a.h + b.h) / 2 || Math.abs(b.y - a.y) * 1.2 >= Math.abs(b.x - a.x) ? 'v' : 'h');
  type Stub = { li: number; end: 'from' | 'to'; far: Frame };
  const stubs = new Map<string, Stub[]>();
  const live = links.map((l, li) => ({ l, li, a: frames.get(l.from), b: frames.get(l.to) })).filter((x): x is typeof x & { a: Frame; b: Frame } => !!x.a && !!x.b);
  for (const { l, li, a, b } of live) {
    const v = sideOf(a, b) === 'v';
    const key = (f: Frame, other: Frame) => `${f === a ? l.from : l.to}:${v ? (other.y >= f.y ? 'bottom' : 'top') : other.x >= f.x ? 'right' : 'left'}`;
    (stubs.get(key(a, b)) ?? stubs.set(key(a, b), []).get(key(a, b))!).push({ li, end: 'from', far: b });
    (stubs.get(key(b, a)) ?? stubs.set(key(b, a), []).get(key(b, a))!).push({ li, end: 'to', far: a });
  }
  const ports = new Map<string, Vec>(); // `${li}:from` / `${li}:to`
  for (const [key, list] of stubs) {
    const [id, side] = key.split(':') as [string, 'top' | 'bottom' | 'left' | 'right'];
    const f = frames.get(id)!, v = side === 'top' || side === 'bottom';
    list.sort((p, q) => (v ? p.far.x - q.far.x : p.far.y - q.far.y));
    const span = v ? f.w : f.h, step = Math.min(SPREAD, (span - 2 * M) / Math.max(1, list.length - 1));
    list.forEach((st, i) => {
      const along = (i - (list.length - 1) / 2) * step;
      ports.set(`${st.li}:${st.end}`, v
        ? V2(f.x + along, f.y + (side === 'bottom' ? f.h / 2 : -f.h / 2))
        : V2(f.x + (side === 'right' ? f.w / 2 : -f.w / 2), f.y + along));
    });
  }

  for (const { l, li, a, b } of live) {
    const dim = o.dim?.has(l.from) || o.dim?.has(l.to) ? 0.25 : 1;
    const p0 = ports.get(`${li}:from`)!, p1 = ports.get(`${li}:to`)!;
    const elbow = (o.route ?? 'elbow') === 'elbow';
    let via: Vec[] = [];
    if (elbow) {
      if (sideOf(a, b) === 'v') { const my = (p0.y + p1.y) / 2; if (Math.abs(p0.x - p1.x) >= 1) via = [V2(p0.x, my), V2(p1.x, my)]; }
      else { const mx = (p0.x + p1.x) / 2; if (Math.abs(p0.y - p1.y) >= 1) via = [V2(mx, p0.y), V2(mx, p1.y)]; }
    }
    const c = connector({
      id: `${id}:link:${l.from}-${l.to}`,
      from: p0, to: p1, via, route: 'straight', end: 'none', label: l.label, tone: l.tone, opacity: dim,
    });
    lines.push(...c.nodes);
    // role names sit just outside the box, beside the line end: 12px out along the line, 6px to its right (or above it)
    const n = c.points.length;
    const role = (k: string, s: string | undefined, tip: Vec, from: Vec) => {
      if (!s) return;
      const dir = vnorm(vsub(tip, from));
      let side = vperp(dir);
      if (side.x < -1e-6 || (Math.abs(side.x) <= 1e-6 && side.y > 0)) side = vscale(side, -1);
      const at = vadd(vsub(tip, vscale(dir, 12)), vscale(side, 6));
      const anchor = Math.abs(side.x) < 0.3 ? 'middle' : side.x > 0 ? 'start' : 'end';
      lines.push(text({ id: `${id}:link:${l.from}-${l.to}:${k}-label`, x: at.x, y: at.y, text: s, size: 11, role: 'link-role', anchor, tone: l.tone, opacity: dim }));
    };
    role('start', l.fromRole, c.points[0], c.points[1]);
    role('end', l.toRole, c.points[n - 1], c.points[n - 2]);
  }
  return { nodes: [...lines, ...boxes], box: (k) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 } };
}
