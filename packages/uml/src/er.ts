/**
 * Entity–relationship diagrams, in crow's-foot notation (default) or Chen's.
 *
 * Entities are boxes: a name, then one row per attribute `[PK] name  type`. A
 * primary key is bold with a PK tag, a foreign key has an FK tag, a nullable
 * attribute is in italics. A WEAK entity (one that cannot be identified without
 * its owner) gets a double outline.
 *
 * Crow's foot. Each end of a relationship line says how many of THAT entity can
 * take part, per one of the other. Read the marker nearest the box:
 *
 *   card         marker at the box        reads
 *   one          ||   two bars            exactly one
 *   zero-one     o|   ring + bar          zero or one
 *   many         crow's foot              many
 *   zero-many    o<   ring + foot         zero or more
 *   one-many     |<   bar + foot          one or more
 *
 * `fromCard` is the marker at the `from` entity, `toCard` at the `to` entity:
 * customer(one) ──< order(zero-many) says one customer has zero or more orders.
 * `identifying: false` draws the line dashed (a non-identifying relationship).
 *
 * Chen. Entities are plain named rectangles and every relationship is a diamond
 * between its two entities, with 1 or N written at each entity end (attributes are
 * left to the crow's-foot form; Chen's ovals would need a layout of their own). An
 * `identifying` relationship gets a double diamond.
 *
 * Place the entities (x, y = centre), or leave x/y out and the layered layout
 * (layout/layered.ts) places them, the "one" side above the "many" side.
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, circle, estimateTextWidth, path, pointAlong, rect, rectEdge, text } from '@figurae/core';
import { layered } from '@figurae/layout';

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
  /** Text on the line (crow's foot) or inside the diamond (Chen): 'places'. */
  label?: string;
  /** `false` draws the crow's-foot line dashed (the child has its own key); `true` draws Chen's diamond double. Default: solid, single. */
  identifying?: boolean;
  tone?: Tone;
}

export interface ErOptions {
  id?: string;
  notation?: 'crows-foot' | 'chen';
  /** Hide the attribute rows (just names). */
  collapsed?: boolean;
  /** Entities emit clicks with `{ entity: id }`. */
  interactive?: boolean;
  /** Entities can be dragged; drag data is `{ entity: id }`. */
  draggable?: boolean;
  /** Entities to fade; so are the relationships that touch them. */
  dim?: ReadonlySet<string>;
  rankGap?: number;
  nodeGap?: number;
}

export interface ErDiagram extends Scene {
  /** The box drawn for an entity (centre + size). */
  box(id: string): Frame;
  /** The id each relationship was given (explicit, or `from-to`, made unique), in input order. */
  relationshipIds: string[];
}

const NAME = 14, ATTR = 12, ROW = 20, HEAD = 30, PAD = 10, KEYW = 28;
const manyish = (c: Cardinality) => c === 'many' || c === 'zero-many' || c === 'one-many';

/** Size of an entity box. `chen` boxes show only the name. Pure, so it's testable. */
export function erSize(e: ErEntity, collapsed = false, chen = false): { w: number; h: number; head: number } {
  const rows = collapsed || chen ? [] : e.attributes ?? [];
  const hasKey = rows.some((a) => a.key);
  const nameW = Math.max(0, ...rows.map((a) => estimateTextWidth(a.name, ATTR)));
  const typeW = Math.max(0, ...rows.map((a) => estimateTextWidth(a.type ?? '', ATTR)));
  const body = (hasKey ? KEYW : 0) + nameW + (typeW ? typeW + 16 : 0);
  const w = Math.max(e.width ?? 110, Math.ceil(Math.max(body, estimateTextWidth(e.name, NAME) * 0.95 + 12) + 2 * PAD));
  const head = chen ? 40 : HEAD;
  return { w, h: head + (rows.length ? rows.length * ROW + 8 : 0), head };
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
 * The marker for one end. `p` is on the entity's edge, `v` the unit vector from
 * there along the line toward the other end, `n` its perpendicular.
 */
export function cardinalityMarker(card: Cardinality, p: Vec, v: Vec, k: string, extra: { tone?: Tone; opacity?: number } = {}): SceneNode[] {
  const at = (d: number, s = 0) => V2(p.x + v.x * d + -v.y * s, p.y + v.y * d + v.x * s);
  const role = `er-card-${card}`;
  const pt = (q: Vec) => [q.x, q.y] as const;
  const bar = (n: string, d: number) => path({ id: `${k}:${n}`, points: [pt(at(d, 7)), pt(at(d, -7))], role, ...extra });
  const foot = () => path({ id: `${k}:foot`, points: [pt(at(0, 8)), pt(at(13)), pt(at(0, -8))], role, ...extra });
  const ring = (d: number) => circle({ id: `${k}:ring`, x: at(d).x, y: at(d).y, r: 5, role, ...extra });
  switch (card) {
    case 'one': return [bar('bar0', 8), bar('bar1', 14)];
    case 'many': return [foot()];
    case 'zero-one': return [bar('bar0', 8), ring(18)];
    case 'zero-many': return [foot(), ring(19)];
    case 'one-many': return [foot(), bar('bar0', 18)];
  }
}

/** Where a ray from a diamond's centre toward `toward` leaves it: |dx|/hw + |dy|/hh = 1. */
function diamondEdge(c: Vec, w: number, h: number, toward: Vec): Vec {
  const dx = toward.x - c.x, dy = toward.y - c.y;
  const t = 1 / (Math.abs(dx) / (w / 2) + Math.abs(dy) / (h / 2) || Infinity);
  return V2(c.x + dx * t, c.y + dy * t);
}

const unit = (a: Vec, b: Vec): Vec => {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return V2((b.x - a.x) / d, (b.y - a.y) / d);
};

export function er(input: readonly ErEntity[], relationships: readonly ErRelationship[] = [], o: ErOptions = {}): ErDiagram {
  const id = o.id ?? 'er';
  const chen = o.notation === 'chen';
  const rids = relationshipIds(relationships);
  const sizes = new Map(input.map((e) => [e.id, erSize(e, o.collapsed, chen)]));
  const DIA_H = 50;
  const diaW = (r: ErRelationship) => Math.max(84, estimateTextWidth(r.label ?? '', 12) + 44);

  // ---- placement
  const isFree = (e: ErEntity) => e.x == null || e.y == null;
  const free = input.filter(isFree);
  const centre = new Map<string, Vec>(input.filter((e) => !isFree(e)).map((e) => [e.id, V2(e.x!, e.y!)]));
  const diamondAt = new Map<string, Vec>();
  // a relationship that skips layers bends around the boxes in between (waypoints from the layered layout)
  const detour = new Map<number, Vec[]>();
  if (free.length) {
    const ids = new Set(free.map((e) => e.id));
    const nodes: Array<{ id: string; w: number; h: number }> = free.map((e) => ({ id: e.id, w: sizes.get(e.id)!.w, h: sizes.get(e.id)!.h }));
    const edges: Array<{ from: string; to: string }> = [];
    const detourOf: Array<[number, string, string, boolean]> = [];
    relationships.forEach((r, i) => {
      if (!ids.has(r.from) || !ids.has(r.to) || r.from === r.to) return;
      // the "one" side goes above the "many" side
      const flip = manyish(r.fromCard ?? 'one') && !manyish(r.toCard ?? 'one');
      const [a, b] = flip ? [r.to, r.from] : [r.from, r.to];
      if (chen) {
        nodes.push({ id: `rel:${rids[i]}`, w: diaW(r), h: DIA_H });
        edges.push({ from: a, to: `rel:${rids[i]}` }, { from: `rel:${rids[i]}`, to: b });
      } else {
        edges.push({ from: a, to: b });
        detourOf.push([i, a, b, a !== r.from]);
      }
    });
    const L = layered(nodes, edges, { rankGap: o.rankGap ?? (chen ? 36 : 70), nodeGap: o.nodeGap ?? 50 });
    for (const e of free) centre.set(e.id, L.pos(e.id));
    for (const [i, a, b, flipped] of detourOf) {
      const mid = L.path(a, b).slice(1, -1);
      if (mid.length) detour.set(i, flipped ? mid.reverse() : mid);
    }
    nodes.filter((n) => n.id.startsWith('rel:')).forEach((n) => diamondAt.set(n.id.slice(4), L.pos(n.id)));
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
    const off = (k - (K - 1) / 2) * (chen ? 90 : 26);

    if (chen) {
      const w = diaW(r), h = DIA_H;
      const mid = V2((ca.x + cb.x) / 2 + n.x * off, (ca.y + cb.y) / 2 + n.y * off);
      const d = self ? V2(fa.x + fa.w / 2 + 70, fa.y) : diamondAt.get(rids[i]) && free.some((e) => e.id === r.from) && free.some((e) => e.id === r.to) ? diamondAt.get(rids[i])! : mid;
      const dpts: Vec[] = [V2(d.x, d.y - h / 2), V2(d.x + w / 2, d.y), V2(d.x, d.y + h / 2), V2(d.x - w / 2, d.y)];
      lines.push(path({ id: `${rk}:diamond`, points: dpts.map(pt), closed: true, role: 'er-diamond', interactive: o.interactive, data: { relationship: rids[i] }, ...common }));
      if (r.identifying) {
        const s = (q: Vec) => V2(d.x + (q.x - d.x) * 0.82, d.y + (q.y - d.y) * 0.72);
        lines.push(path({ id: `${rk}:diamond2`, points: dpts.map((q) => pt(s(q))), closed: true, role: 'er-diamond-inner', ...common }));
      }
      if (r.label) lines.push(text({ id: `${rk}:label`, x: d.x, y: d.y, text: r.label, size: 12, role: 'er-rel-name', ...common }));
      ([['from', fa, fromC, -1], ['to', fb, toC, 1]] as const).forEach(([end, f, card, s]) => {
        const a = rectEdge(f, self ? V2(d.x, d.y + s * 12) : d);
        const b = diamondEdge(d, w, h, a);
        lines.push(path({ id: `${rk}:${end}:line`, points: [pt(a), pt(b)], role: 'connector', width: 1.5, ...common }));
        const v = unit(a, b), nn = V2(-v.y, v.x);
        lines.push(text({ id: `${rk}:${end}:card`, x: a.x + v.x * 16 + nn.x * 11, y: a.y + v.y * 16 + nn.y * 11, text: manyish(card) ? 'N' : '1', size: 12, role: 'er-card-label', ...common }));
      });
      return;
    }

    let A: Vec, B: Vec, line: Vec[], vA: Vec, vB: Vec;
    if (self) {
      A = V2(fa.x + fa.w / 2, fa.y - fa.h / 4); B = V2(fa.x + fa.w / 2, fa.y + fa.h / 4);
      line = [A, V2(A.x + 44, A.y), V2(B.x + 44, B.y), B];
      vA = vB = V2(1, 0);
    } else if (detour.has(i)) {
      const via = detour.get(i)!;
      A = rectEdge(fa, via[0]); B = rectEdge(fb, via[via.length - 1]);
      line = [A, ...via, B];
      vA = unit(A, line[1]); vB = unit(B, line[line.length - 2]);
    } else {
      A = rectEdge(fa, V2(cb.x + n.x * off, cb.y + n.y * off));
      B = rectEdge(fb, V2(ca.x + n.x * off, ca.y + n.y * off));
      line = [A, B];
      vA = unit(A, B); vB = unit(B, A);
    }
    lines.push(path({ id: `${rk}:line`, points: line.map(pt), role: 'connector', width: 1.5, dashed: r.identifying === false, ...common }));
    lines.push(...cardinalityMarker(fromC, A, vA, `${rk}:from`, common), ...cardinalityMarker(toC, B, vB, `${rk}:to`, common));
    if (r.label) {
      const m = self ? V2(A.x + 44, (A.y + B.y) / 2) : pointAlong(line, 0.5);
      lines.push(text({ id: `${rk}:label`, x: self ? m.x + 6 : m.x, y: m.y, text: r.label, size: 12, anchor: self ? 'start' : 'middle', role: 'edge-label', ...common }));
    }
  });

  // ---- entity boxes
  const boxes: SceneNode[] = [];
  for (const e of input) {
    const f = frames.get(e.id)!, { head } = sizes.get(e.id)!;
    const k = `${id}:${e.id}`, top = f.y - f.h / 2, left = f.x - f.w / 2;
    const opacity = o.dim?.has(e.id) ? 0.3 : 1;
    boxes.push(rect({ id: `${k}:box`, x: f.x, y: f.y, w: f.w, h: f.h, rx: chen ? 2 : 6, role: 'card', tone: e.tone, opacity, interactive: o.interactive, draggable: o.draggable, data: { entity: e.id } }));
    if (e.weak) boxes.push(rect({ id: `${k}:weak`, x: f.x, y: f.y, w: f.w - 8, h: f.h - 8, rx: chen ? 1 : 3, role: 'er-weak', opacity }));
    const rows = o.collapsed || chen ? [] : e.attributes ?? [];
    boxes.push(text({ id: `${k}:name`, x: f.x, y: top + head / 2, text: e.name, size: NAME, role: 'er-entity-name', opacity }));
    if (!rows.length) continue;
    boxes.push(path({ id: `${k}:div`, points: [[left, top + head], [left + f.w, top + head]], role: 'divider', opacity }));
    const keyW = rows.some((a) => a.key) ? KEYW : 0;
    rows.forEach((a, i) => {
      const y = top + head + 4 + i * ROW + ROW / 2;
      const rk = `${k}:attr:${i}`;
      if (a.key) boxes.push(text({ id: `${rk}:key`, x: left + PAD, y, text: a.key === 'primary' ? 'PK' : 'FK', size: 10, anchor: 'start', role: 'er-key', opacity }));
      boxes.push(text({ id: `${rk}:name`, x: left + PAD + keyW, y, text: a.name, size: ATTR, anchor: 'start', role: a.key === 'primary' ? 'er-attr-key' : a.nullable ? 'er-attr-null' : 'er-attr', opacity }));
      if (a.type) boxes.push(text({ id: `${rk}:type`, x: left + f.w - PAD, y, text: a.type, size: ATTR, anchor: 'end', role: 'er-type', opacity }));
    });
  }

  return { nodes: [...lines, ...boxes], box: (k) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 }, relationshipIds: rids };
}
