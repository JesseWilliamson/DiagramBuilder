/**
 * UML class diagrams: boxes with name / attributes / methods compartments,
 * joined by the six standard relationships.
 *
 *   kind            line     end marker                read as
 *   inherits        solid    hollow triangle at `to`   from IS-A to
 *   implements      dashed   hollow triangle at `to`   from realises the interface to
 *   composition     solid    filled diamond at `from`  from OWNS to (to dies with it)
 *   aggregation     solid    hollow diamond at `from`  from HAS to (to can outlive it)
 *   association     solid    open arrow at `to`        from knows about to
 *   dependency      dashed   open arrow at `to`        from uses to (e.g. a parameter)
 *
 * You place the classes (x, y = centre), or leave x/y out and the layered
 * layout (layout/layered.ts) places them: parents above children, owners above
 * their parts. Box sizes come from the text.
 */
import { ConnectorEnd, Frame, connector } from '../connector';
import { layered } from '../layout/layered';
import { Scene, SceneNode, Tone, estimateTextWidth, path, rect, text } from '../scene';

export interface UmlClass {
  id: string;
  name: string;
  /** Centre. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
  /** Shown above the name in guillemets: 'interface' → «interface». */
  stereotype?: string;
  /** Abstract classes are named in italics. */
  abstract?: boolean;
  /** One line each, e.g. '- radius: number'. The first character is the visibility (+ - # ~). */
  attributes?: readonly string[];
  methods?: readonly string[];
  tone?: Tone;
  /** Minimum width. */
  width?: number;
}

export type RelationKind = 'inherits' | 'implements' | 'composition' | 'aggregation' | 'association' | 'dependency';

export interface Relation {
  from: string;
  to: string;
  kind: RelationKind;
  label?: string;
  fromLabel?: string;
  toLabel?: string;
  tone?: Tone;
}

export interface ClassDiagramOptions {
  id?: string;
  /** Hide the attribute and method compartments (just names). */
  collapsed?: boolean;
  /** Boxes emit clicks with `{ class: id }`. */
  interactive?: boolean;
  /** Boxes can be dragged; drag data is `{ class: id }`. */
  draggable?: boolean;
  /** 'elbow' (default) for right-angled lines, or 'straight'. */
  route?: 'elbow' | 'straight';
  /** Classes to fade (e.g. everything not related to a selected class). */
  dim?: ReadonlySet<string>;
  /** For classes without x/y: space between layers and between neighbours. Defaults 64 and 40. */
  rankGap?: number;
  nodeGap?: number;
}

/**
 * Which way a relation points in the layout. UML draws a parent above its
 * subclasses, but the arrow goes from the subclass up to the parent, so
 * inheritance and realisation are flipped; everything else flows from → to.
 */
const flowsUp = (k: RelationKind) => k === 'inherits' || k === 'implements';

export interface ClassDiagram extends Scene {
  /** The box drawn for a class (centre + size). */
  box(id: string): Frame;
}

/** Line style and markers for each relationship kind: the table in the header comment, as data. */
export const RELATION_STYLE: Record<RelationKind, { dashed: boolean; start: ConnectorEnd; end: ConnectorEnd }> = {
  inherits: { dashed: false, start: 'none', end: 'triangle' },
  implements: { dashed: true, start: 'none', end: 'triangle' },
  composition: { dashed: false, start: 'diamond-filled', end: 'none' },
  aggregation: { dashed: false, start: 'diamond', end: 'none' },
  association: { dashed: false, start: 'none', end: 'open' },
  dependency: { dashed: true, start: 'none', end: 'open' },
};

const NAME = 14, MEMBER = 12, ROW = 18, PAD = 10, STEREO = 11;

/** Size of a class box: the widest line wins. Pure, so it's testable. */
export function classSize(c: UmlClass, collapsed = false): { w: number; h: number; head: number } {
  const members = collapsed ? [] : [...(c.attributes ?? []), ...(c.methods ?? [])];
  const widths = [
    estimateTextWidth(c.name, NAME) * 0.95,
    c.stereotype ? estimateTextWidth(`«${c.stereotype}»`, STEREO) : 0,
    ...members.map((m) => estimateTextWidth(m, MEMBER)),
  ];
  const w = Math.max(c.width ?? 110, Math.ceil(Math.max(...widths) + 2 * PAD));
  const head = (c.stereotype ? STEREO + 4 : 0) + NAME + 16;
  const body = collapsed ? 0 : ((c.attributes?.length ?? 0) + (c.methods?.length ?? 0)) * ROW + 2 * 8;
  return { w, h: head + body, head };
}

export function classDiagram(input: readonly UmlClass[], relations: readonly Relation[] = [], o: ClassDiagramOptions = {}): ClassDiagram {
  const id = o.id ?? 'uml';
  const free = input.filter((c) => c.x == null || c.y == null);
  let classes = input;
  if (free.length) {
    const L = layered(
      free.map((c) => ({ id: c.id, ...classSize(c, o.collapsed) })),
      relations.map((r) => (flowsUp(r.kind) ? { from: r.to, to: r.from } : r)),
      { rankGap: o.rankGap ?? 64, nodeGap: o.nodeGap ?? 40 },
    );
    const auto = new Set(free.map((c) => c.id));
    classes = input.map((c) => (auto.has(c.id) ? { ...c, ...L.pos(c.id) } : c));
  }
  const frames = new Map<string, Frame>();
  const nodes: SceneNode[] = [];
  const boxes: SceneNode[] = [];

  for (const c of classes) {
    const { w, h, head } = classSize(c, o.collapsed);
    const cx = c.x ?? 0, cy = c.y ?? 0;
    const f: Frame = { x: cx, y: cy, w, h };
    frames.set(c.id, f);
    const top = cy - h / 2, left = cx - w / 2;
    const k = `${id}:${c.id}`;
    const dim = o.dim?.has(c.id) ? 0.3 : 1;
    const data = { class: c.id };
    // the box first, the name right after it (a label always follows its shape)
    boxes.push(rect({ id: `${k}:box`, x: cx, y: cy, w, h, rx: 6, role: 'card', tone: c.tone, opacity: dim, interactive: o.interactive, draggable: o.draggable, data }));
    let y = top + 8;
    if (c.stereotype) {
      y += STEREO / 2;
      boxes.push(text({ id: `${k}:stereo`, x: cx, y, text: `«${c.stereotype}»`, size: STEREO, role: 'stereotype', opacity: dim }));
      y += STEREO / 2 + 4;
    }
    boxes.push(text({ id: `${k}:name`, x: cx, y: y + NAME / 2 + 1, text: c.name, size: NAME, role: c.abstract ? 'class-name-abstract' : 'class-name', opacity: dim }));
    if (o.collapsed) continue;
    const rows = (list: readonly string[] | undefined, startY: number, kind: string) =>
      (list ?? []).forEach((m, i) =>
        boxes.push(text({ id: `${k}:${kind}:${i}`, x: left + PAD, y: startY + i * ROW + ROW / 2, text: m, size: MEMBER, role: 'member', anchor: 'start', opacity: dim })),
      );
    const divider = (yy: number, n: string) => boxes.push(path({ id: `${k}:${n}`, points: [[left, yy], [left + w, yy]], role: 'divider', opacity: dim }));
    const attrTop = top + head;
    divider(attrTop, 'div1');
    rows(c.attributes, attrTop + 8, 'attr');
    const methTop = attrTop + 8 + (c.attributes?.length ?? 0) * ROW + 4;
    if (c.methods?.length) divider(methTop, 'div2');
    rows(c.methods, methTop + 4, 'meth');
  }

  // relationships underneath the boxes
  for (const r of relations) {
    const a = frames.get(r.from), b = frames.get(r.to);
    if (!a || !b) continue;
    const s = RELATION_STYLE[r.kind];
    const dim = o.dim?.has(r.from) || o.dim?.has(r.to) ? 0.25 : 1;
    nodes.push(
      ...connector({
        id: `${id}:rel:${r.from}-${r.kind}-${r.to}`,
        from: a, to: b, route: o.route ?? 'elbow', ...s,
        label: r.label, startLabel: r.fromLabel, endLabel: r.toLabel, tone: r.tone, opacity: dim,
      }).nodes,
    );
  }

  return { nodes: [...nodes, ...boxes], box: (k) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 } };
}
