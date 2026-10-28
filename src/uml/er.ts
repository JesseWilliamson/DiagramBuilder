/**
 * Entity–relationship diagrams in crow's-foot notation.
 *
 * Entities are cards: the name in a shaded header band, then one row per
 * attribute `[PK] name  type`. A primary key is semibold with a PK tag, a
 * foreign key has an FK tag, a nullable attribute is in italics. A WEAK entity
 * (one that cannot be identified without its owner) gets a double outline.
 *
 * Each end of a relationship line says how many of THAT entity can take part,
 * per one of the other. Read the marker nearest the box, outer symbol first:
 * a bar means one, a ring means zero, a crow's foot means many.
 *
 *   card         marker at the box        reads
 *   one          ||   two bars            exactly one
 *   zero-one     o|   ring + bar          zero or one
 *   many         <    crow's foot         many
 *   zero-many    o<   ring + foot         zero or more
 *   one-many     |<   bar + foot          one or more
 *
 * `fromCard` is the marker at the `from` entity, `toCard` at the `to` entity:
 * customer(one) ──< order(zero-many) says one customer has zero or more orders.
 * `identifying: false` draws the line dashed (a non-identifying relationship:
 * the child has a key of its own).
 *
 * Place the entities (x, y = centre), or leave x/y out and the layered layout
 * (layout/layered.ts) places them top to bottom, the "one" side above the
 * "many" side; a relationship that skips a layer is routed round the boxes
 * in between.
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, circle, estimateTextWidth, path, rect, text } from '../core';
import { layered } from '../layout';

export interface ErAttribute {
  name: string;
  /** The data type, shown right-aligned: 'int', 'varchar(80)'. */
  type?: string;
  key?: 'primary' | 'foreign';
  nullable?: boolean;
}

export interface ErEntity {
  id: string;
  name: string;
  /** Centre. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
  attributes?: readonly ErAttribute[];
  /** A weak entity: it is identified through its owner. Double outline. */
  weak?: boolean;
  tone?: Tone;
  width?: number;
}

export type Cardinality = 'one' | 'many' | 'zero-one' | 'zero-many' | 'one-many';

export interface ErRelationship {
  /** Names the relationship in ids; default `from-to`. */
  id?: string;
  from: string;
  to: string;
  /** The marker at the `from` end. Default 'one'. */
  fromCard?: Cardinality;
  /** The marker at the `to` end. Default 'one'. */
  toCard?: Cardinality;
  /** Text beside the line: 'places'. */
  label?: string;
  /** `false` draws the line dashed (non-identifying: the child has its own key). Default: solid. */
  identifying?: boolean;
  tone?: Tone;
}

export interface ErOptions {
  id?: string;
  /** Hide the attribute rows (just names). */
  collapsed?: boolean;
  /** Entities emit clicks with `{ entity: id }`. */
  interactive?: boolean;
  /** Entities can be dragged; drag data is `{ entity: id }`. */
  draggable?: boolean;
  /** Entities to fade; so are the relationships that touch them. */
  dim?: ReadonlySet<string>;
  /** For entities without x/y: space between layers and between neighbours. Defaults 90 and 50. */
  rankGap?: number;
  nodeGap?: number;
}

export interface ErDiagram extends Scene {
  /** The box drawn for an entity (centre + size). */
  box(id: string): Frame;
  /** The id each relationship was given (explicit, or `from-to`, made unique), in input order. */
  relationshipIds: string[];
}

/** Entity name 13 semibold in a 26px band; attribute rows 20px: 11px mono tag, 12px name, 11px mono type. */
export const ER_HEAD = 26;
const NAME = 13, ATTR = 12, SMALL = 11, ROW = 20, PAD = 10, KEYW = 26, BODY_PAD = 4, RX = 6;
/** How far the markers reach along the line from the box edge, at the 12px marker scale. */
export const MARKER_LENGTH = 22;
const manyish = (c: Cardinality) => c === 'many' || c === 'zero-many' || c === 'one-many';

/** Size of an entity box. Pure, so it's testable. */
export function erSize(e: ErEntity, collapsed = false): { w: number; h: number; head: number } {
  const rows = collapsed ? [] : e.attributes ?? [];
  const hasKey = rows.some((a) => a.key);
  const nameW = Math.max(0, ...rows.map((a) => estimateTextWidth(a.name, ATTR)));
  const typeW = Math.max(0, ...rows.map((a) => estimateTextWidth(a.type ?? '', SMALL)));
  const body = (hasKey ? KEYW : 0) + nameW + (typeW ? typeW + 16 : 0);
  const w = Math.max(e.width ?? 110, Math.ceil(Math.max(body, estimateTextWidth(e.name, NAME) * 0.95 + 12) + 2 * PAD));
  return { w, h: ER_HEAD + (rows.length ? rows.length * ROW + 2 * BODY_PAD : 0), head: ER_HEAD };
}

/** Ids for relationships: `from-to`, with `-2`, `-3`… added to repeats. */
export function relationshipIds(rels: readonly ErRelationship[]): string[] {
  const seen = new Map<string, number>();
  return rels.map((r) => {
    const base = r.id ?? `${r.from}-${r.to}`, n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

/**
 * The marker for one end, 12px across. `p` is on the entity's edge, `v` the
 * unit vector from there along the line toward the other end. The symbol
 * nearest the box is the maximum (bar = one, foot = many); the one beyond it
 * the minimum (ring = zero, bar = one). Every part starts at the edge and
 * none reaches past MARKER_LENGTH.
 */
export function cardinalityMarker(card: Cardinality, p: Vec, v: Vec, k: string, extra: { tone?: Tone; opacity?: number } = {}): SceneNode[] {
  const at = (d: number, s = 0) => V2(p.x + v.x * d + -v.y * s, p.y + v.y * d + v.x * s);
  const role = `er-card-${card}`;
  const pt = (q: Vec) => [q.x, q.y] as const;
  const bar = (n: string, d: number) => path({ id: `${k}:${n}`, points: [pt(at(d, 6)), pt(at(d, -6))], role, ...extra });
  const foot = () => path({ id: `${k}:foot`, points: [pt(at(0, 6)), pt(at(12)), pt(at(0, -6))], role, ...extra });
  const ring = (d: number) => circle({ id: `${k}:ring`, x: at(d).x, y: at(d).y, r: 4.5, role, ...extra });
  switch (card) {
    case 'one': return [bar('bar0', 6), bar('bar1', 12)];
    case 'many': return [foot()];
    case 'zero-one': return [bar('bar0', 6), ring(17)];
    case 'zero-many': return [foot(), ring(17.5)];
    case 'one-many': return [foot(), bar('bar0', 17)];
  }
}

/**
 * Where a relationship meets a box: on the edge that faces `toward`, level with
 * it where the box is wide enough (so two lines into one box land apart, and a
 * line between stacked boxes runs straight) and 14px in from the corners.
 */
export function erPort(f: Frame, toward: Vec): Vec {
  const M = 14, dx = toward.x - f.x, dy = toward.y - f.y;
  if (dx === 0 && dy === 0) return V2(f.x, f.y);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return Math.abs(dy) * f.w >= Math.abs(dx) * f.h
    ? V2(clamp(toward.x, f.x - f.w / 2 + M, f.x + f.w / 2 - M), f.y + Math.sign(dy) * f.h / 2)
    : V2(f.x + Math.sign(dx) * f.w / 2, clamp(toward.y, f.y - f.h / 2 + M, f.y + f.h / 2 - M));
}

const unit = (a: Vec, b: Vec): Vec => {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return V2((b.x - a.x) / d, (b.y - a.y) / d);
};

/** The midpoint of a polyline (by length) and the unit direction of the segment it is on. */
function midpoint(pts: readonly Vec[]): { p: Vec; v: Vec } {
  const lens = pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i].x, q.y - pts[i].y));
  let d = lens.reduce((s, l) => s + l, 0) / 2;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? d / lens[i] : 0;
      return { p: V2(pts[i].x + (pts[i + 1].x - pts[i].x) * k, pts[i].y + (pts[i + 1].y - pts[i].y) * k), v: unit(pts[i], pts[i + 1]) };
    }
    d -= lens[i];
  }
  return { p: pts[0], v: V2(1, 0) };
}

/** A card's header band: the top corners rounded like the card, the bottom ones only when the band is the whole card. */
function bandPoints(left: number, top: number, w: number, h: number, r: number, bottomR: number): Array<readonly [number, number]> {
  const arc = (cx: number, cy: number, rad: number, a0: number, a1: number) =>
    [0, 0.5, 1].map((t) => [cx + rad * Math.cos(a0 + (a1 - a0) * t), cy + rad * Math.sin(a0 + (a1 - a0) * t)] as const);
  const right = left + w, bottom = top + h;
  return [
    ...arc(left + r, top + r, r, Math.PI, Math.PI * 1.5),
    ...arc(right - r, top + r, r, Math.PI * 1.5, Math.PI * 2),
    ...arc(right - bottomR, bottom - bottomR, bottomR, 0, Math.PI * 0.5),
    ...arc(left + bottomR, bottom - bottomR, bottomR, Math.PI * 0.5, Math.PI),
  ];
}

export function er(input: readonly ErEntity[], relationships: readonly ErRelationship[] = [], o: ErOptions = {}): ErDiagram {
  const id = o.id ?? 'er';
  const rids = relationshipIds(relationships);
  const sizes = new Map(input.map((e) => [e.id, erSize(e, o.collapsed)]));

  // ---- placement
  const isFree = (e: ErEntity) => e.x == null || e.y == null;
  const free = input.filter(isFree);
  const centre = new Map<string, Vec>(input.filter((e) => !isFree(e)).map((e) => [e.id, V2(e.x!, e.y!)]));
  // a relationship that skips layers bends around the boxes in between (waypoints from the layered layout)
  const detour = new Map<number, Vec[]>();
  if (free.length) {
    const ids = new Set(free.map((e) => e.id));
    const nodes = free.map((e) => ({ id: e.id, w: sizes.get(e.id)!.w, h: sizes.get(e.id)!.h }));
    const edges: Array<{ from: string; to: string }> = [];
    const detourOf: Array<[number, string, string, boolean]> = [];
    relationships.forEach((r, i) => {
      if (!ids.has(r.from) || !ids.has(r.to) || r.from === r.to) return;
      // the "one" side goes above the "many" side
      const flip = manyish(r.fromCard ?? 'one') && !manyish(r.toCard ?? 'one');
      const [a, b] = flip ? [r.to, r.from] : [r.from, r.to];
      edges.push({ from: a, to: b });
      detourOf.push([i, a, b, flip]);
    });
    const L = layered(nodes, edges, { rankGap: o.rankGap ?? 90, nodeGap: o.nodeGap ?? 50 });
    for (const e of free) centre.set(e.id, L.pos(e.id));
    for (const [i, a, b, flipped] of detourOf) {
      const mid = L.path(a, b).slice(1, -1);
      if (mid.length) detour.set(i, flipped ? mid.reverse() : mid);
    }
  }

  const frames = new Map<string, Frame>();
  for (const e of input) {
    const c = centre.get(e.id) ?? V2(0, 0), s = sizes.get(e.id)!;
    frames.set(e.id, { x: c.x, y: c.y, w: s.w, h: s.h });
  }

  // ---- relationships (under the boxes)
  const lines: SceneNode[] = [];
  const pairCount = new Map<string, number>(), pairSeen = new Map<string, number>();
  const pairKey = (r: ErRelationship) => [r.from, r.to].sort().join('|');
  for (const r of relationships) pairCount.set(pairKey(r), (pairCount.get(pairKey(r)) ?? 0) + 1);
  relationships.forEach((r, i) => {
    const fa = frames.get(r.from), fb = frames.get(r.to);
    if (!fa || !fb) return;
    const rk = `${id}:rel:${rids[i]}`;
    const opacity = o.dim?.has(r.from) || o.dim?.has(r.to) ? 0.25 : 1;
    const common = { tone: r.tone, opacity };
    const fromC = r.fromCard ?? 'one', toC = r.toCard ?? 'one';
    const pk = pairKey(r), k = pairSeen.get(pk) ?? 0, K = pairCount.get(pk)!;
    pairSeen.set(pk, k + 1);
    const self = r.from === r.to;
    const pt = (q: Vec) => [q.x, q.y] as const;
    // a stable normal for this pair, so parallel relationships fan out the same way
    const ca = V2(fa.x, fa.y), cb = V2(fb.x, fb.y);
    const u = self ? V2(1, 0) : unit(ca, cb), n = V2(-u.y, u.x);
    const off = (k - (K - 1) / 2) * 26;

    let A: Vec, B: Vec, line: Vec[], vA: Vec, vB: Vec;
    if (self) {
      A = V2(fa.x + fa.w / 2, fa.y - fa.h / 4); B = V2(fa.x + fa.w / 2, fa.y + fa.h / 4);
      line = [A, V2(A.x + 44, A.y), V2(B.x + 44, B.y), B];
      vA = vB = V2(1, 0);
    } else if (detour.has(i)) {
      const via = detour.get(i)!;
      A = erPort(fa, via[0]); B = erPort(fb, via[via.length - 1]);
      line = [A, ...via, B];
      vA = unit(A, line[1]); vB = unit(B, line[line.length - 2]);
    } else {
      A = erPort(fa, V2(cb.x + n.x * off, cb.y + n.y * off));
      B = erPort(fb, V2(ca.x + n.x * off, ca.y + n.y * off));
      line = [A, B];
      vA = unit(A, B); vB = unit(B, A);
    }
    lines.push(path({ id: `${rk}:line`, points: line.map(pt), role: 'connector', width: 1.5, dashed: r.identifying === false, ...common }));
    lines.push(...cardinalityMarker(fromC, A, vA, `${rk}:from`, common), ...cardinalityMarker(toC, B, vB, `${rk}:to`, common));
    if (r.label) {
      if (self) {
        lines.push(text({ id: `${rk}:label`, x: A.x + 50, y: (A.y + B.y) / 2, text: r.label, size: 12, anchor: 'start', role: 'edge-label', ...common }));
      } else {
        // beside the line, not on it: 9px off the midpoint, to the right of (or above) the line
        const { p, v } = midpoint(line);
        let nn = V2(-v.y, v.x);
        if (nn.x < -1e-6 || (Math.abs(nn.x) <= 1e-6 && nn.y > 0)) nn = V2(-nn.x, -nn.y);
        const anchor = Math.abs(nn.x) < 0.3 ? 'middle' : nn.x > 0 ? 'start' : 'end';
        lines.push(text({ id: `${rk}:label`, x: p.x + nn.x * 9, y: p.y + nn.y * 9, text: r.label, size: 12, anchor, role: 'edge-label', ...common }));
      }
    }
  });

  // ---- entity boxes
  const boxes: SceneNode[] = [];
  for (const e of input) {
    const f = frames.get(e.id)!, { head } = sizes.get(e.id)!;
    const k = `${id}:${e.id}`, top = f.y - f.h / 2, left = f.x - f.w / 2;
    const opacity = o.dim?.has(e.id) ? 0.3 : 1;
    const rows = o.collapsed ? [] : e.attributes ?? [];
    boxes.push(rect({ id: `${k}:box`, x: f.x, y: f.y, w: f.w, h: f.h, rx: RX, role: 'card', tone: e.tone, opacity, interactive: o.interactive, draggable: o.draggable, data: { entity: e.id } }));
    // the header band: shaded, rounded with the card; it is the whole card when there are no rows
    boxes.push(path({ id: `${k}:head`, points: bandPoints(left, top, f.w, head, RX, rows.length ? 0 : RX), closed: true, role: 'er-head', tone: e.tone, opacity }));
    if (e.weak) boxes.push(rect({ id: `${k}:weak`, x: f.x, y: f.y, w: f.w - 7, h: f.h - 7, rx: RX - 3, role: 'er-weak', tone: e.tone, opacity }));
    boxes.push(text({ id: `${k}:name`, x: f.x, y: top + head / 2, text: e.name, size: NAME, role: 'er-entity-name', opacity }));
    if (!rows.length) continue;
    boxes.push(path({ id: `${k}:div`, points: [[left, top + head], [left + f.w, top + head]], role: 'divider', opacity }));
    const keyW = rows.some((a) => a.key) ? KEYW : 0;
    rows.forEach((a, i) => {
      const y = top + head + BODY_PAD + i * ROW + ROW / 2;
      const rk = `${k}:attr:${i}`;
      if (a.key) boxes.push(text({ id: `${rk}:key`, x: left + PAD, y, text: a.key === 'primary' ? 'PK' : 'FK', size: SMALL, anchor: 'start', role: 'er-key', opacity }));
      boxes.push(text({ id: `${rk}:name`, x: left + PAD + keyW, y, text: a.name, size: ATTR, anchor: 'start', role: a.key === 'primary' ? 'er-attr-key' : a.nullable ? 'er-attr-null' : 'er-attr', opacity }));
      if (a.type) boxes.push(text({ id: `${rk}:type`, x: left + f.w - PAD, y, text: a.type, size: SMALL, anchor: 'end', role: 'er-type', opacity }));
    });
  }

  return { nodes: [...lines, ...boxes], box: (k) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 }, relationshipIds: rids };
}
