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
import { Frame, Scene, SceneNode, Tone, Vec, connector, estimateTextWidth, path, rect, text, vadd, vnorm, vperp, vscale, vsub } from '@figurae/core';
import { layered } from '@figurae/layout';
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
  /** 'elbow' (default) for right-angled lines, or 'straight'. */
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
    const half = (estimateTextWidth(title, NAME) * 0.95) / 2, uy = ty + NAME / 2 + 1;
    boxes.push(
      rect({ id: `${k}:box`, x: cx, y: cy, w, h, rx: 6, role: 'card', tone: u.tone, opacity: dim, interactive: o.interactive, draggable: o.draggable, data: { object: u.id } }),
      text({ id: `${k}:name`, x: cx, y: ty, text: title, size: NAME, role: 'object-name', opacity: dim }),
      // the underline is what makes it an instance: as wide as the title is estimated to be
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

  for (const l of links) {
    const a = frames.get(l.from), b = frames.get(l.to);
    if (!a || !b) continue;
    const dim = o.dim?.has(l.from) || o.dim?.has(l.to) ? 0.25 : 1;
    const c = connector({
      id: `${id}:link:${l.from}-${l.to}`,
      from: a, to: b, route: o.route ?? 'elbow', end: 'none', label: l.label, tone: l.tone, opacity: dim,
    });
    lines.push(...c.nodes);
    // role names sit beside the line near each end, on whichever side the text can grow away from it
    const n = c.points.length;
    const role = (k: string, s: string | undefined, tip: Vec, from: Vec) => {
      if (!s) return;
      const dir = vnorm(vsub(tip, from)), side = vperp(dir);
      const at = vadd(vsub(tip, vscale(dir, 14)), vscale(side, 8));
      const anchor = Math.abs(side.x) < 0.3 ? 'middle' : side.x > 0 ? 'start' : 'end';
      lines.push(text({ id: `${id}:link:${l.from}-${l.to}:${k}-label`, x: at.x, y: at.y + (Math.abs(side.x) < 0.3 ? side.y * 4 : 0), text: s, size: 11, role: 'end-label', anchor, tone: l.tone, opacity: dim }));
    };
    role('start', l.fromRole, c.points[0], c.points[1]);
    role('end', l.toRole, c.points[n - 1], c.points[n - 2]);
  }
  return { nodes: [...lines, ...boxes], box: (k) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 } };
}
