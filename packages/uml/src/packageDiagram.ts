/**
 * UML package diagrams: how code is grouped, and which groups lean on which.
 *
 *   thing          drawn as                                        read as
 *   package        a folder: a tab on the top-left of a body        a namespace / module / folder
 *   with children  name in the tab, children inside the body        a package that contains packages
 *   without        name centred in the body                         a leaf package
 *
 *   relation    line                         read as
 *   import      dashed open arrow «import»   from brings the public names of to into view
 *   access      dashed open arrow «access»   the same, but the names stay private
 *   merge       dashed open arrow «merge»    from takes in the contents of to
 *   dependency  dashed open arrow            from needs something of to
 *
 * Packages nest to any depth (`children`), and a relation can join packages at
 * any depth: the line leaves the body of one and enters the body of the other.
 * Sizes are measured from the inside out: a package grows around its children,
 * which the layered layout (layout/layered.ts) places along the relations
 * between them, ACROSS the flow of the level outside (top-level rows hold
 * packages whose children sit side by side, so the figure stays compact).
 * Top-level packages are yours to place (x, y = centre of the body) or, left
 * out, placed by the same layout.
 *
 * Routing: a relation between two packages leaves along the flow of the level
 * where their ancestors are siblings (down, for the default rows), runs along a
 * LANE in the gap between the two ranks, and enters the other package through
 * its facing side. Relations sharing a gap get their own lanes (ordered to
 * cross each other least); relations sharing a side get their own ports. So a
 * line never runs through a package it does not join, only through the
 * borders of the packages that contain its ends.
 */
import { Box, Frame, Scene, SceneNode, Tone, V2, Vec, connector, estimateTextWidth, path, text } from '@dsviz/core';
import { LayeredLayout, layered } from '@dsviz/layout';

export interface UmlPackage {
  id: string;
  name: string;
  /** Packages inside this one (any depth). */
  children?: readonly UmlPackage[];
  /** Centre of the body; top-level packages only. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
  tone?: Tone;
}

export type PackageRelationKind = 'import' | 'access' | 'merge' | 'dependency';

export interface PackageRelation {
  /** Package ids, at any depth. */
  from: string;
  to: string;
  kind: PackageRelationKind;
  label?: string;
  tone?: Tone;
}

export interface PackageDiagramOptions {
  id?: string;
  /** Packages emit clicks with `{ package: id }`. */
  interactive?: boolean;
  /** Top-level packages can be dragged; drag data is `{ package: id }`. Their contents go along. */
  draggable?: boolean;
  /** 'elbow' (default): right-angled lines in lanes between the ranks; 'straight': centre to centre. */
  route?: 'elbow' | 'straight';
  /** Packages to fade. */
  dim?: ReadonlySet<string>;
  /** Flow of the top-level layout: 'down' (default, rows) or 'right' (columns). Children flow the other way. */
  direction?: 'down' | 'right';
  /** Space between top-level ranks and between neighbours in a rank. Defaults 110 and 40. */
  rankGap?: number;
  nodeGap?: number;
}

export interface PackageDiagram extends Scene {
  /** The body of a package, tab excluded (centre + size). */
  box(id: string): Frame;
}

/** Line style, marker and default label for each relation: the table in the header comment, as data. */
export const PACKAGE_RELATION: Record<PackageRelationKind, { dashed: boolean; end: 'open'; stereotype?: string }> = {
  import: { dashed: true, end: 'open', stereotype: 'import' },
  access: { dashed: true, end: 'open', stereotype: 'access' },
  merge: { dashed: true, end: 'open', stereotype: 'merge' },
  dependency: { dashed: true, end: 'open' },
};

/** Height of the folder tab above a package body. */
export const TAB_H = 18;
const NAME = 13, TAB_NAME = 12, LABEL = 11;
/** Leaf size, inset of children inside a body, gaps between children (unrelated / related), port spacing. */
const LEAF_W = 84, LEAF_H = 36, INSET = 12, KID_GAP = 16, KID_RANK = 72, PORT = 20, LABEL_OFF = 9;

type Dir = 'down' | 'right';
type Side = 'top' | 'bottom' | 'left' | 'right';

interface Measured {
  pkg: UmlPackage;
  /** Body size. */
  w: number;
  h: number;
  tabW: number;
  kids: Measured[];
  /** Flow of the children's layout. */
  inner: Dir;
  L?: LayeredLayout;
  /** Child body centres relative to this body's top-left corner. */
  at: Map<string, Vec>;
}

interface Placed {
  pkg: UmlPackage;
  frame: Frame;
  /** The whole symbol, tab included, as a top-left box. */
  outer: Box;
  tabW: number;
  parent: string | null;
}

/** One layout level: the top level, or the inside of a package. */
interface Level {
  dir: Dir;
  L?: LayeredLayout;
  /** Adds to a layout position to give the absolute centre of the symbol. */
  offset: Vec;
  members: string[];
  /** Extent of each rank along the flow, in absolute coordinates. */
  bands: { lo: number; hi: number }[];
}

/** Package ancestors of an id, outermost first, ending with the id itself. */
function chains(pkgs: readonly UmlPackage[], trail: readonly string[] = [], out = new Map<string, string[]>()) {
  for (const p of pkgs) {
    const t = [...trail, p.id];
    out.set(p.id, t);
    chains(p.children ?? [], t, out);
  }
  return out;
}

/** The folder outline: tab flush with the top-left, then the body. */
export function packageOutline(l: number, t: number, w: number, h: number, tabW: number): [number, number][] {
  return [[l, t], [l, t - TAB_H], [l + tabW, t - TAB_H], [l + tabW, t], [l + w, t], [l + w, t + h], [l, t + h]];
}

/**
 * Lane order in one gap that crosses least. Each line enters the gap at `a`,
 * runs along its lane, and leaves at `b`; a line's two verticals cross the
 * lanes it passes on its way in and out. Small groups are tried exhaustively,
 * larger ones are ordered by where they come in.
 */
function laneOrder(lines: { a: number; b: number; fromLo: boolean }[]): number[] {
  const n = lines.length;
  const idx = lines.map((_, i) => i);
  if (n > 6) return idx.sort((i, j) => lines[i].a - lines[j].a);
  const inSpan = (x: number, l: { a: number; b: number }) => x > Math.min(l.a, l.b) + 0.5 && x < Math.max(l.a, l.b) - 0.5;
  const cost = (order: number[]) => {
    const lane = new Map(order.map((i, k) => [i, k]));
    let c = 0;
    for (const i of idx) for (const j of idx) {
      if (i === j) continue;
      const li = lane.get(i)!, lj = lane.get(j)!, L = lines[i];
      // the way in covers the lanes before i's (from the side it comes in), the way out the lanes after
      if ((L.fromLo ? lj < li : lj > li) && inSpan(L.a, lines[j])) c++;
      if ((L.fromLo ? lj > li : lj < li) && inSpan(L.b, lines[j])) c++;
    }
    return c;
  };
  let best = idx.slice(), bestCost = Infinity;
  const perm = (rest: number[], acc: number[]) => {
    if (!rest.length) { const c = cost(acc); if (c < bestCost) (bestCost = c), (best = acc.slice()); return; }
    for (let i = 0; i < rest.length; i++) perm([...rest.slice(0, i), ...rest.slice(i + 1)], [...acc, rest[i]]);
  };
  perm(idx, []);
  return best;
}

/**
 * Layered centres the boxes of a rank on one line; packages of different
 * heights look tidier with their tops (or, in columns, their left edges)
 * flush, like folders on a shelf. Returns the moved centres and their bounds.
 */
function aligned(L: LayeredLayout, items: readonly { id: string; w: number; h: number }[], dir: Dir): { pos: Map<string, Vec>; box: Box } {
  const size = new Map(items.map((it) => [it.id, it]));
  const right = dir === 'right';
  const pos = new Map<string, Vec>();
  for (const layer of L.layers) {
    const start = Math.min(...layer.map((k) => (right ? L.pos(k).x - size.get(k)!.w / 2 : L.pos(k).y - size.get(k)!.h / 2)));
    for (const k of layer) { const c = L.pos(k), it = size.get(k)!; pos.set(k, right ? V2(start + it.w / 2, c.y) : V2(c.x, start + it.h / 2)); }
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [k, c] of pos) { const it = size.get(k)!; x0 = Math.min(x0, c.x - it.w / 2); y0 = Math.min(y0, c.y - it.h / 2); x1 = Math.max(x1, c.x + it.w / 2); y1 = Math.max(y1, c.y + it.h / 2); }
  return { pos, box: pos.size ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 } };
}

/** Drop repeated and collinear points from a right-angled route. */
function tidy(pts: Vec[]): Vec[] {
  const out: Vec[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (q && Math.abs(q.x - p.x) < 0.01 && Math.abs(q.y - p.y) < 0.01) continue;
    const o = out[out.length - 2];
    if (q && o && ((Math.abs(o.x - q.x) < 0.01 && Math.abs(q.x - p.x) < 0.01) || (Math.abs(o.y - q.y) < 0.01 && Math.abs(q.y - p.y) < 0.01))) out.pop();
    out.push(p);
  }
  return out;
}

export function packageDiagram(packages: readonly UmlPackage[], relations: readonly PackageRelation[] = [], o: PackageDiagramOptions = {}): PackageDiagram {
  const id = o.id ?? 'pkg';
  const topDir: Dir = o.direction ?? 'down';
  const rankGap = o.rankGap ?? 110, nodeGap = o.nodeGap ?? 40;
  const chain = chains(packages);
  /** The relations as edges between two different siblings under `parent`, if they cross between them. */
  const edgesUnder = (parent: string | null, sibs: readonly UmlPackage[]) => {
    const ids = new Set(sibs.map((s) => s.id)), seen = new Set<string>();
    return relations.flatMap((r) => {
      const a = chain.get(r.from), b = chain.get(r.to);
      if (!a || !b) return [];
      const d = parent == null ? 0 : a.indexOf(parent) + 1;
      if (parent != null && (a.indexOf(parent) < 0 || b.indexOf(parent) < 0)) return [];
      const x = a[d], y = b[d];
      if (!x || !y || x === y || !ids.has(x) || !ids.has(y) || seen.has(`${x}>${y}`)) return [];
      seen.add(`${x}>${y}`);
      return [{ from: x, to: y }];
    });
  };

  // inside out: a package is as big as its children's layout plus an inset
  const measure = (p: UmlPackage, outer: Dir): Measured => {
    const inner: Dir = outer === 'down' ? 'right' : 'down';
    const kids = (p.children ?? []).map((k) => measure(k, inner));
    const at = new Map<string, Vec>();
    if (!kids.length) {
      const w = Math.max(LEAF_W, Math.ceil(estimateTextWidth(p.name, NAME) * 0.95 + 24));
      return { pkg: p, w, h: LEAF_H, tabW: Math.round(w / 3), kids, inner, at };
    }
    const edges = edgesUnder(p.id, p.children ?? []);
    let box: Box, L: LayeredLayout | undefined;
    if (edges.length || kids.length <= 4) {
      // unrelated children line up along the inner flow: one rank of the OUTER direction is exactly that line
      const dir = edges.length ? inner : outer, items = kids.map((k) => ({ id: k.pkg.id, w: k.w, h: k.h + TAB_H }));
      L = layered(items, edges, { direction: dir, rankGap: KID_RANK, nodeGap: KID_GAP });
      const A = aligned(L, items, dir);
      box = A.box;
      // layered centres each kid's whole symbol (body + tab); the body centre sits TAB_H / 2 lower
      for (const k of kids) { const c = A.pos.get(k.pkg.id)!; at.set(k.pkg.id, V2(c.x - box.x + INSET, c.y - box.y + INSET + TAB_H / 2)); }
    } else {
      // unrelated children: a near-square grid
      const cols = Math.ceil(Math.sqrt(kids.length));
      const cw = Math.max(...kids.map((k) => k.w)), ch = Math.max(...kids.map((k) => k.h + TAB_H));
      kids.forEach((k, i) => at.set(k.pkg.id, V2(INSET + (i % cols) * (cw + KID_GAP) + cw / 2, INSET + Math.floor(i / cols) * (ch + KID_GAP) + ch / 2 + TAB_H / 2)));
      const rows = Math.ceil(kids.length / cols);
      box = { x: 0, y: 0, w: cols * cw + (cols - 1) * KID_GAP, h: rows * ch + (rows - 1) * KID_GAP };
    }
    const w = Math.ceil(box.w + 2 * INSET), h = Math.ceil(box.h + 2 * INSET);
    const tabW = Math.min(w - 16, Math.max(Math.round(w / 3), Math.ceil(estimateTextWidth(p.name, TAB_NAME) * 0.95 + 16)));
    return { pkg: p, w, h, tabW, kids, inner, L, at };
  };
  const tops = packages.map((p) => measure(p, topDir));

  // top level: given centres win; the rest go through the same layered layout
  const topAt = new Map<string, Vec>();
  for (const m of tops) if (m.pkg.x != null && m.pkg.y != null) topAt.set(m.pkg.id, V2(m.pkg.x, m.pkg.y));
  const free = tops.filter((m) => !topAt.has(m.pkg.id));
  let topL: LayeredLayout | undefined;
  if (free.length) {
    const items = free.map((m) => ({ id: m.pkg.id, w: m.w, h: m.h + TAB_H }));
    topL = layered(items, edgesUnder(null, free.map((m) => m.pkg)), { direction: topDir, rankGap, nodeGap });
    const A = aligned(topL, items, topDir);
    for (const m of free) { const c = A.pos.get(m.pkg.id)!; topAt.set(m.pkg.id, V2(c.x, c.y + TAB_H / 2)); }
  }

  // place everything, remembering each level's layout for the routing
  const placed = new Map<string, Placed>();
  const levels = new Map<string | null, Level>();
  levels.set(null, { dir: topDir, L: topL, offset: V2(0, 0), members: tops.map((m) => m.pkg.id), bands: [] });
  const shapes: SceneNode[] = [];
  const place = (m: Measured, cx: number, cy: number, parent: string | null) => {
    const p = m.pkg, k = `${id}:${p.id}`;
    const l = cx - m.w / 2, t = cy - m.h / 2;
    const dim = o.dim?.has(p.id) ? 0.3 : 1;
    placed.set(p.id, { pkg: p, frame: { x: cx, y: cy, w: m.w, h: m.h }, outer: { x: l, y: t - TAB_H, w: m.w, h: m.h + TAB_H }, tabW: m.tabW, parent });
    const top = parent == null;
    shapes.push(path({ id: k, points: packageOutline(l, t, m.w, m.h, m.tabW), closed: true, role: 'package', tone: p.tone, opacity: dim, interactive: o.interactive, draggable: o.draggable && top, data: { package: p.id } }));
    if (m.kids.length) {
      shapes.push(text({ id: `${k}:name`, x: l + m.tabW / 2, y: t - TAB_H / 2, text: p.name, size: TAB_NAME, role: 'package-name', opacity: dim }));
      levels.set(p.id, { dir: m.inner, L: m.L, offset: V2(l + INSET - (m.L?.box.x ?? 0), t + INSET - (m.L?.box.y ?? 0)), members: m.kids.map((c) => c.pkg.id), bands: [] });
      for (const c of m.kids) { const a = m.at.get(c.pkg.id)!; place(c, l + a.x, t + a.y, p.id); }
    } else shapes.push(text({ id: `${k}:name`, x: cx, y: cy, text: p.name, size: NAME, role: 'package-name', opacity: dim }));
  };
  for (const m of tops) { const c = topAt.get(m.pkg.id) ?? V2(0, 0); place(m, c.x, c.y, null); }

  const rankIn = (lv: Level, k: string) => (lv.L && lv.L.layers.some((l) => l.includes(k)) ? lv.L.rank(k) : undefined);
  for (const lv of levels.values()) {
    for (const k of lv.members) {
      const r = rankIn(lv, k);
      if (r == null) continue;
      const b = placed.get(k)!.outer;
      const lo = lv.dir === 'down' ? b.y : b.x, hi = lv.dir === 'down' ? b.y + b.h : b.x + b.w;
      const band = (lv.bands[r] ??= { lo: Infinity, hi: -Infinity });
      band.lo = Math.min(band.lo, lo);
      band.hi = Math.max(band.hi, hi);
    }
  }

  // --- routing ------------------------------------------------------------
  interface Plan {
    r: PackageRelation;
    key: string;
    a: Placed;
    b: Placed;
    /** The level whose lanes the line uses; absent → a plain connector between the two bodies. */
    lv?: Level;
    sideA: Side;
    sideB: Side;
    /** The siblings (ancestors of the ends, or the ends themselves) at that level, and which way the line flows. */
    X?: Placed;
    Y?: Placed;
    s: number;
    /** A detour: the line leaves (enters) sideways and runs past its sibling at this cross coordinate, when the straight way out is blocked. */
    escapeA?: number;
    escapeB?: number;
    /** Gap indices (between rank k and k + 1) the line crosses, in order, and the lane in each. */
    gaps: number[];
    lanes: number[];
    /** Where the line passes the ranks it skips (centres of the layout's dummy nodes). */
    dummies: Vec[];
    exit: Vec;
    enter: Vec;
  }
  const plans: Plan[] = [];
  for (const r of relations) {
    const a = placed.get(r.from), b = placed.get(r.to);
    if (!a || !b) continue;
    const plan: Plan = { r, key: `${id}:rel:${r.from}-${r.kind}-${r.to}`, a, b, sideA: 'bottom', sideB: 'top', s: 1, gaps: [], lanes: [], dummies: [], exit: V2(a.frame.x, a.frame.y), enter: V2(b.frame.x, b.frame.y) };
    plans.push(plan);
    if (o.route === 'straight') continue;
    // the level where the two have different ancestors (siblings X and Y)
    const ca = chain.get(r.from)!, cb = chain.get(r.to)!;
    let d = 0;
    while (d < ca.length && d < cb.length && ca[d] === cb[d]) d++;
    if (d >= ca.length || d >= cb.length) continue; // one contains the other
    const lv = levels.get(d ? ca[d - 1] : null);
    const X = ca[d], Y = cb[d];
    const rx = lv && rankIn(lv, X), ry = lv && rankIn(lv, Y);
    if (!lv || rx == null || ry == null || rx === ry) continue;
    const s = Math.sign(ry - rx);
    plan.lv = lv;
    plan.X = placed.get(X);
    plan.Y = placed.get(Y);
    plan.s = s;
    plan.sideA = lv.dir === 'down' ? (s > 0 ? 'bottom' : 'top') : s > 0 ? 'right' : 'left';
    plan.sideB = lv.dir === 'down' ? (s > 0 ? 'top' : 'bottom') : s > 0 ? 'left' : 'right';
    for (let k = rx; k !== ry; k += s) plan.gaps.push(Math.min(k, k + s));
    plan.dummies = lv.L!.path(X, Y).slice(1, -1).map((v) => V2(v.x + lv.offset.x, v.y + lv.offset.y));
  }

  // a straight way out may run through a sibling (children stacked in one rank); then the line
  // leaves sideways and runs down the outside of its top-level sibling instead
  const crosses = (x0: number, y0: number, x1: number, y1: number, skip: readonly string[]) => {
    const [ax, bx] = [Math.min(x0, x1), Math.max(x0, x1)], [ay, by] = [Math.min(y0, y1), Math.max(y0, y1)];
    for (const [k, p] of placed) {
      if (skip.includes(k)) continue;
      const b = p.outer;
      if (ax < b.x + b.w - 0.5 && bx > b.x + 0.5 && ay < b.y + b.h - 0.5 && by > b.y + 0.5) return true;
    }
    return false;
  };
  for (const p of plans) {
    if (!p.lv || !p.X || !p.Y) continue;
    const down = p.lv.dir === 'down';
    const detour = (pk: Placed, sib: Placed, side: Side, skip: readonly string[], gapEdge: number): number | undefined => {
      const f = pk.frame, b = sib.outer;
      // the straight way: from the facing side to the edge of the gap
      const clear = down ? !crosses(f.x, side === 'bottom' ? f.y + f.h / 2 : f.y - f.h / 2, f.x, gapEdge, skip) : !crosses(side === 'right' ? f.x + f.w / 2 : f.x - f.w / 2, f.y, gapEdge, f.y, skip);
      if (clear) return undefined;
      // sideways: past the near edge of the sibling, if the way there is clear; else the far one
      const lo = down ? b.x - 12 : b.y - 12, hi = down ? b.x + b.w + 12 : b.y + b.h + 12;
      const near = (down ? f.x - b.x < b.x + b.w - f.x : f.y - b.y < b.y + b.h - f.y) ? [lo, hi] : [hi, lo];
      for (const c of near) if (down ? !crosses(f.x, f.y, c, f.y, skip) : !crosses(f.x, f.y, f.x, c, skip)) return c;
      return near[0];
    };
    const bands = p.lv.bands;
    const rx = p.lv.L!.rank(p.X.pkg.id), ry = p.lv.L!.rank(p.Y.pkg.id);
    const edgeA = p.s > 0 ? bands[rx].hi : bands[rx].lo, edgeB = p.s > 0 ? bands[ry].lo : bands[ry].hi;
    p.escapeA = detour(p.a, p.X, p.sideA, chain.get(p.r.from)!, edgeA);
    p.escapeB = detour(p.b, p.Y, p.sideB, chain.get(p.r.to)!, edgeB);
    const sideways = (pk: Placed, c: number): Side => (down ? (c < pk.frame.x ? 'left' : 'right') : c < pk.frame.y ? 'top' : 'bottom');
    if (p.escapeA != null) p.sideA = sideways(p.a, p.escapeA);
    if (p.escapeB != null) p.sideB = sideways(p.b, p.escapeB);
  }

  // ports: lines leaving one side of a package spread out, ordered by where they go
  const bySide = new Map<string, { plan: Plan; end: 'exit' | 'enter'; toward: Vec }[]>();
  for (const p of plans) {
    if (!p.lv) continue;
    const push = (pk: Placed, side: Side, end: 'exit' | 'enter', toward: Vec) => {
      const k = `${pk.pkg.id}:${side}`;
      (bySide.get(k) ?? bySide.set(k, []).get(k)!).push({ plan: p, end, toward });
    };
    push(p.a, p.sideA, 'exit', p.dummies[0] ?? V2(p.b.frame.x, p.b.frame.y));
    push(p.b, p.sideB, 'enter', p.dummies[p.dummies.length - 1] ?? V2(p.a.frame.x, p.a.frame.y));
  }
  const onSide = (pk: Placed, side: Side, off: number): Vec => {
    const f = pk.frame, l = f.x - f.w / 2, t = f.y - f.h / 2;
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    switch (side) {
      case 'bottom': return V2(clamp(f.x + off, l + 8, l + f.w - 8), t + f.h);
      case 'top': return V2(clamp(f.x + off, l + pk.tabW + 8, l + f.w - 8), t);
      case 'right': return V2(l + f.w, clamp(f.y + off, t + 8, t + f.h - 8));
      case 'left': return V2(l, clamp(f.y + off, t + 8, t + f.h - 8));
    }
  };
  for (const [k, list] of bySide) {
    const side = k.slice(k.lastIndexOf(':') + 1) as Side;
    const horizontal = side === 'top' || side === 'bottom';
    list.sort((p, q) => (horizontal ? p.toward.x - q.toward.x : p.toward.y - q.toward.y));
    list.forEach((e, i) => {
      const pt = onSide(e.end === 'exit' ? e.plan.a : e.plan.b, side, (i - (list.length - 1) / 2) * PORT);
      if (e.end === 'exit') e.plan.exit = pt; else e.plan.enter = pt;
    });
  }

  // lanes: lines sharing a gap each get their own, in the order that crosses least
  const byGap = new Map<string, { plan: Plan; i: number }[]>();
  for (const p of plans) {
    if (!p.lv) continue;
    const lvKey = [...levels.entries()].find(([, v]) => v === p.lv)![0] ?? '';
    p.gaps.forEach((g, i) => { const k = `${lvKey}|${g}`; (byGap.get(k) ?? byGap.set(k, []).get(k)!).push({ plan: p, i }); });
  }
  for (const list of byGap.values()) {
    const lv = list[0].plan.lv!, down = lv.dir === 'down';
    const cross = (v: Vec) => (down ? v.x : v.y);
    const lines = list.map(({ plan, i }) => {
      const pts = [plan.exit, ...plan.dummies, plan.enter];
      const a = i === 0 && plan.escapeA != null ? plan.escapeA : cross(pts[i]);
      const b = i === plan.gaps.length - 1 && plan.escapeB != null ? plan.escapeB : cross(pts[i + 1]);
      return { a, b, fromLo: plan.s > 0 };
    });
    const order = laneOrder(lines);
    const band = lv.bands[list[0].plan.gaps[list[0].i]], next = lv.bands[list[0].plan.gaps[list[0].i] + 1];
    const lo = band.hi, hi = next.lo;
    order.forEach((li, k) => { const { plan, i } = list[li]; plan.lanes[i] = lo + ((hi - lo) * (k + 1)) / (order.length + 1); });
  }

  // relations on top, so a line crossing a package border is still seen
  const lines: SceneNode[] = [];
  for (const p of plans) {
    const { r } = p, s = PACKAGE_RELATION[r.kind];
    const dim = o.dim?.has(r.from) || o.dim?.has(r.to) ? 0.25 : 1;
    const label = r.label ?? (s.stereotype ? `«${s.stereotype}»` : undefined);
    let pts: Vec[];
    if (p.lv) {
      const down = p.lv.dir === 'down';
      const last = p.escapeB == null ? p.enter : down ? V2(p.escapeB, p.enter.y) : V2(p.enter.x, p.escapeB);
      const anchors = [...p.dummies, last];
      const route: Vec[] = [p.exit];
      let cur = p.exit;
      if (p.escapeA != null) { cur = down ? V2(p.escapeA, p.exit.y) : V2(p.exit.x, p.escapeA); route.push(cur); }
      p.lanes.forEach((lane, i) => {
        const n = anchors[i];
        route.push(down ? V2(cur.x, lane) : V2(lane, cur.y), down ? V2(n.x, lane) : V2(lane, n.y));
        cur = down ? V2(n.x, lane) : V2(lane, n.y);
      });
      route.push(last, p.enter);
      pts = tidy(route);
      lines.push(...connector({ id: p.key, from: pts[0], to: pts[pts.length - 1], via: pts.slice(1, -1), end: s.end, dashed: s.dashed, tone: r.tone, opacity: dim }).nodes);
    } else {
      const c = connector({ id: p.key, from: p.a.frame, to: p.b.frame, route: o.route ?? 'elbow', end: s.end, dashed: s.dashed, tone: r.tone, opacity: dim });
      lines.push(...c.nodes);
      pts = c.points;
    }
    if (!label) continue;
    // the label sits above the longest horizontal segment that fits it, else beside the longest segment
    const need = estimateTextWidth(label, LABEL) * 0.8 + 12;
    let best = 0, len = -1;
    for (let i = 1; i < pts.length; i++) {
      const dx = Math.abs(pts[i].x - pts[i - 1].x), dy = Math.abs(pts[i].y - pts[i - 1].y);
      const d = Math.hypot(dx, dy) + (dy < 0.01 && dx >= need ? 1e4 : 0);
      if (d > len) (len = d), (best = i);
    }
    const a = pts[best - 1], b = pts[best], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    if (Math.abs(dy) < 0.01) lines.push(text({ id: `${p.key}:label`, x: mx, y: my - LABEL_OFF, text: label, size: LABEL, role: 'package-rel-label', tone: r.tone, opacity: dim }));
    else if (Math.abs(dx) < 0.01) lines.push(text({ id: `${p.key}:label`, x: mx + 7, y: my, text: label, size: LABEL, anchor: 'start', role: 'package-rel-label', tone: r.tone, opacity: dim }));
    else {
      // a diagonal: step off along the normal that points up
      const n = Math.hypot(dx, dy), nx = dy / n, ny = -dx / n, sgn = ny < 0 ? 1 : -1;
      lines.push(text({ id: `${p.key}:label`, x: mx + sgn * nx * LABEL_OFF, y: my + sgn * ny * LABEL_OFF, text: label, size: LABEL, role: 'package-rel-label', tone: r.tone, opacity: dim }));
    }
  }
  return { nodes: [...shapes, ...lines], box: (k) => placed.get(k)?.frame ?? { x: 0, y: 0, w: 0, h: 0 } };
}
