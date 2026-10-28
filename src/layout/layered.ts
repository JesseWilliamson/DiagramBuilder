/**
 * Layered layout for directed graphs (a small Sugiyama). It answers "where do
 * the boxes go?" for anything that flows one way: call graphs, build steps,
 * request paths, class hierarchies, a change and what it touches.
 *
 * Four passes, each simple on its own:
 *
 *  1. CYCLES.  A layered drawing needs every edge to point "forward". A depth
 *     first search (in input order) finds the edges that close a cycle (they
 *     point at a node still on the search stack) and flips them for the rest
 *     of the layout. They are drawn the right way round at the end.
 *  2. LAYERS.  Longest path: sources sit in layer 0, every other node one
 *     layer below its deepest predecessor. Every edge now goes from a lower
 *     layer to a higher one. An edge that skips layers gets a chain of
 *     invisible "dummy" nodes, one per layer it crosses, so it can bend around
 *     the boxes in between (and so crossing counts see it).
 *  3. ORDER.   Inside each layer, sort nodes by the barycentre (the average
 *     position) of their neighbours in the layer above, then by the layer
 *     below, a few times. Nodes that pull towards the same place end up next
 *     to each other, which removes most crossings. Keep the best order seen.
 *  4. PLACE.   Layers are rows (or columns, `direction: 'right'`). Along a
 *     layer, each node wants to sit at the average of its neighbours; the
 *     nodes must keep their order and their gaps. "Closest to what you want,
 *     keeping order and gaps" is isotonic regression, solved exactly by
 *     pool-adjacent-violators: see `pack()`.
 *
 * Everything is a pure function of the input order, so the same graph always
 * lays out the same way and ids keep their positions across renders.
 *
 * Sizes are inputs: the layout never measures anything. Callers pass the box
 * size they will draw (estimated from the label, as everywhere in dsviz).
 */
import { Box, V2, Vec } from '../core';

export interface LayeredNode {
  id: string;
  /** Box size. Default 40 × 40. */
  w?: number;
  h?: number;
}

export interface LayeredEdge {
  from: string;
  to: string;
}

export interface LayeredOptions {
  /** 'down' (default): layers are rows, edges point down. 'right': layers are columns. */
  direction?: 'down' | 'right';
  /** Space between layers (between the boxes, not their centres). Default 56. */
  rankGap?: number;
  /** Space between neighbouring boxes in one layer. Default 28. */
  nodeGap?: number;
  /** Ordering passes (each one down then up). Default 6. */
  sweeps?: number;
  /** Centre of the first layer's row (or column). Default 0, 0. */
  x?: number;
  y?: number;
}

export interface LayeredLayout {
  /** Centre of a node. */
  pos(id: string): Vec;
  /** Layer index of a node (0 = first). */
  rank(id: string): number;
  /** Real node ids, layer by layer, in their final order. */
  layers: string[][];
  /** Edges flipped to break cycles, as "from>to". */
  reversed: Set<string>;
  /**
   * The points an edge passes through: the centre of `from`, one point per
   * layer it skips, the centre of `to`. Empty when the edge is unknown.
   */
  path(from: string, to: string): Vec[];
  /**
   * The same route ready to draw between boxes: it starts and ends on the box
   * edges that face along the flow. 'elbow' makes every bend a right angle.
   */
  route(from: string, to: string, style?: 'straight' | 'elbow'): Vec[];
  /** Bounding box of every node. */
  box: Box;
  /** Number of edge crossings in the final order (between adjacent layers). */
  crossings: number;
}

interface Item {
  id: string;
  /** Size along the layer (width for 'down') and across it. */
  along: number;
  across: number;
  dummy: boolean;
}

/** Edge key. Ids may contain anything except this separator in practice. */
const key = (a: string, b: string) => `${a}>${b}`;

/**
 * Closest positions to `want` that keep the order and at least `sep[i]`
 * between item i-1 and item i.
 *
 * The trick: subtract the minimum offsets (c[i] = sep[1] + … + sep[i]). Then
 * the constraint "x[i] ≥ x[i-1] + sep[i]" becomes "z[i] ≥ z[i-1]" for
 * z = x - c, i.e. z must be non-decreasing. The closest non-decreasing
 * sequence (least squares) comes from pool-adjacent-violators: walk left to
 * right, and whenever a value is smaller than the block before it, merge the
 * two blocks and give both their average. Add c back and you are done.
 */
export function pack(want: readonly number[], sep: readonly number[]): number[] {
  const c: number[] = [];
  want.forEach((_, i) => c.push(i === 0 ? 0 : c[i - 1] + sep[i]));
  const blocks: { sum: number; n: number }[] = [];
  for (let i = 0; i < want.length; i++) {
    blocks.push({ sum: want[i] - c[i], n: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
      if (a.sum / a.n <= b.sum / b.n) break;
      a.sum += b.sum;
      a.n += b.n;
      blocks.pop();
    }
  }
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.n; k++) out.push(b.sum / b.n + c[out.length]);
  return out;
}

/** Crossings between two adjacent layers, given the edges between them (as index pairs). */
function crossingsBetween(edges: readonly [number, number][]): number {
  let n = 0;
  for (let i = 0; i < edges.length; i++)
    for (let j = i + 1; j < edges.length; j++) {
      const [a, b] = edges[i], [c, d] = edges[j];
      if ((a - c) * (b - d) < 0) n++;
    }
  return n;
}

export function layered(nodes: readonly LayeredNode[], edges: readonly LayeredEdge[], o: LayeredOptions = {}): LayeredLayout {
  const right = o.direction === 'right';
  const rankGap = o.rankGap ?? 56, nodeGap = o.nodeGap ?? 28, sweeps = o.sweeps ?? 6;
  const items = new Map<string, Item>();
  for (const n of nodes) {
    if (items.has(n.id)) continue;
    const w = n.w ?? 40, h = n.h ?? 40;
    items.set(n.id, { id: n.id, along: right ? h : w, across: right ? w : h, dummy: false });
  }
  const ids = [...items.keys()];

  // Edges between known nodes, no self-loops, no duplicates.
  const seen = new Set<string>();
  const real: LayeredEdge[] = [];
  for (const e of edges) {
    const k = key(e.from, e.to);
    if (e.from === e.to || !items.has(e.from) || !items.has(e.to) || seen.has(k)) continue;
    seen.add(k);
    real.push(e);
  }

  // 1. Break cycles: an edge into a node that is still on the DFS stack closes a cycle.
  const out = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of real) out.get(e.from)!.push(e.to);
  const state = new Map<string, 1 | 2>(); // 1 = on the stack, 2 = finished
  const reversed = new Set<string>();
  for (const start of ids) {
    if (state.has(start)) continue;
    // iterative DFS, so a long chain can't overflow the call stack
    const stack: { id: string; next: number }[] = [{ id: start, next: 0 }];
    state.set(start, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const succ = out.get(top.id)!;
      if (top.next < succ.length) {
        const s = succ[top.next++];
        if (state.get(s) === 1) reversed.add(key(top.id, s));
        else if (!state.has(s)) (state.set(s, 1), stack.push({ id: s, next: 0 }));
      } else {
        state.set(top.id, 2);
        stack.pop();
      }
    }
  }
  // the acyclic edge list the rest of the layout works on
  const dag = real.map((e) => (reversed.has(key(e.from, e.to)) ? { from: e.to, to: e.from } : e));
  // an edge and its reverse may both exist (a ⇄ b): after flipping, keep one
  const dagSeen = new Set<string>();
  const forward = dag.filter((e) => !dagSeen.has(key(e.from, e.to)) && (dagSeen.add(key(e.from, e.to)), true));

  // 2. Longest-path layering, in topological order (Kahn's algorithm, input order breaks ties).
  const preds = new Map<string, string[]>(ids.map((id) => [id, []]));
  const succs = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of forward) (preds.get(e.to)!.push(e.from), succs.get(e.from)!.push(e.to));
  const indeg = new Map(ids.map((id) => [id, preds.get(id)!.length]));
  const rank = new Map<string, number>();
  const queue = ids.filter((id) => indeg.get(id) === 0);
  for (let qi = 0; qi < queue.length; qi++) {
    const id = queue[qi];
    rank.set(id, Math.max(0, ...preds.get(id)!.map((p) => rank.get(p)! + 1)));
    for (const s of succs.get(id)!) {
      indeg.set(s, indeg.get(s)! - 1);
      if (indeg.get(s) === 0) queue.push(s);
    }
  }

  // Long edges become chains through dummy nodes, one per skipped layer.
  const chains = new Map<string, string[]>(); // "from>to" (acyclic direction) → [from, d1, d2, …, to]
  const adjDown = new Map<string, string[]>(); // unit-length edges, top to bottom
  const adjUp = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    (adjDown.get(a) ?? adjDown.set(a, []).get(a)!).push(b);
    (adjUp.get(b) ?? adjUp.set(b, []).get(b)!).push(a);
  };
  for (const e of forward) {
    const chain = [e.from];
    for (let r = rank.get(e.from)! + 1; r < rank.get(e.to)!; r++) {
      const d = `\u0000${e.from}>${e.to}#${r}`;
      items.set(d, { id: d, along: 0, across: 0, dummy: true });
      rank.set(d, r);
      chain.push(d);
    }
    chain.push(e.to);
    for (let i = 1; i < chain.length; i++) link(chain[i - 1], chain[i]);
    chains.set(key(e.from, e.to), chain);
  }

  // Initial order: by first appearance (input order, then dummies in edge order).
  const depth = Math.max(-1, ...rank.values()) + 1;
  let layers: string[][] = Array.from({ length: depth }, () => []);
  for (const id of items.keys()) layers[rank.get(id)!].push(id);

  // 3. Barycentre ordering. A node with no neighbours on the reference side keeps its place.
  const indexIn = (layer: readonly string[]) => new Map(layer.map((id, i) => [id, i]));
  const reorder = (layer: string[], ref: string[], adj: Map<string, string[]>) => {
    const at = indexIn(ref);
    const score = layer.map((id, i) => {
      const ns = (adj.get(id) ?? []).map((n) => at.get(n)!).filter((v) => v !== undefined);
      return { id, i, b: ns.length ? ns.reduce((s, v) => s + v, 0) / ns.length : i * (ref.length / Math.max(1, layer.length)) };
    });
    score.sort((a, b) => a.b - b.b || a.i - b.i); // stable: ties keep their order
    return score.map((s) => s.id);
  };
  const countCrossings = (ls: string[][]) => {
    let n = 0;
    for (let r = 0; r + 1 < ls.length; r++) {
      const below = indexIn(ls[r + 1]);
      const pairs: [number, number][] = [];
      ls[r].forEach((id, i) => (adjDown.get(id) ?? []).forEach((s) => pairs.push([i, below.get(s)!])));
      n += crossingsBetween(pairs);
    }
    return n;
  };
  let best = layers.map((l) => [...l]);
  let bestCross = countCrossings(best);
  for (let s = 0; s < sweeps && bestCross > 0; s++) {
    for (let r = 1; r < depth; r++) layers[r] = reorder(layers[r], layers[r - 1], adjUp);
    for (let r = depth - 2; r >= 0; r--) layers[r] = reorder(layers[r], layers[r + 1], adjDown);
    const c = countCrossings(layers);
    if (c < bestCross) (best = layers.map((l) => [...l]), (bestCross = c));
  }
  layers = best;

  // 4. Coordinates. Across: layers stacked with rankGap between their thickest boxes.
  const thick = layers.map((l) => Math.max(0, ...l.map((id) => items.get(id)!.across)));
  const acrossAt: number[] = [];
  thick.forEach((t, r) => acrossAt.push(r === 0 ? 0 : acrossAt[r - 1] + thick[r - 1] / 2 + rankGap + t / 2));
  // Along: start packed and centred, then pull each node towards its neighbours.
  const along = new Map<string, number>();
  const sepOf = (l: readonly string[]) =>
    l.map((id, i) => {
      if (i === 0) return 0;
      const a = items.get(l[i - 1])!, b = items.get(id)!;
      // dummies need less room than boxes: they are only lines
      const gap = a.dummy && b.dummy ? nodeGap / 2 : nodeGap;
      return (a.along + b.along) / 2 + gap;
    });
  const place = (l: readonly string[], want: number[]) => pack(want, sepOf(l)).forEach((v, i) => along.set(l[i], v));
  for (const l of layers) place(l, l.map(() => 0));
  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const pull = (l: readonly string[], adj: Map<string, string[]>) =>
    place(l, l.map((id) => {
      const ns = adj.get(id) ?? [];
      return ns.length ? mean(ns.map((n) => along.get(n)!)) : along.get(id)!;
    }));
  for (let it = 0; it < 4; it++) {
    for (let r = 1; r < depth; r++) pull(layers[r], adjUp);
    for (let r = depth - 2; r >= 0; r--) pull(layers[r], adjDown);
  }
  // Centre the whole drawing on the first layer's middle, rounded so positions are exact in tests.
  const reals = [...items.values()].filter((it) => !it.dummy);
  const lo = Math.min(...reals.map((it) => along.get(it.id)! - it.along / 2));
  const hi = Math.max(...reals.map((it) => along.get(it.id)! + it.along / 2));
  const shift = reals.length ? -(lo + hi) / 2 : 0;
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const round = (v: number) => Math.round(v * 100) / 100;
  const P = new Map<string, Vec>();
  for (const id of items.keys()) {
    const a = round(along.get(id)! + shift), c = acrossAt[rank.get(id)!];
    P.set(id, right ? V2(x0 + c, y0 + a) : V2(x0 + a, y0 + c));
  }

  const path = (from: string, to: string): Vec[] => {
    const fwd = chains.get(key(from, to));
    if (fwd && !reversed.has(key(from, to))) return fwd.map((id) => P.get(id)!);
    const back = chains.get(key(to, from));
    if (back && (reversed.has(key(from, to)) || !fwd)) return back.map((id) => P.get(id)!).reverse();
    return [];
  };
  // where a route leaves / enters a box: the side facing along the flow
  const face = (id: string, sign: number): Vec => {
    const p = P.get(id)!, it = items.get(id)!;
    return right ? V2(p.x + (sign * it.across) / 2, p.y) : V2(p.x, p.y + (sign * it.across) / 2);
  };
  const route = (from: string, to: string, style: 'straight' | 'elbow' = 'straight'): Vec[] => {
    const pts = path(from, to);
    if (pts.length < 2) return pts;
    const down = rank.get(to)! > rank.get(from)! ? 1 : -1;
    const ends = [face(from, down), ...pts.slice(1, -1), face(to, -down)];
    if (style === 'straight') return ends;
    // elbow: between each pair of consecutive points, turn halfway across the gap
    const outPts: Vec[] = [ends[0]];
    for (let i = 1; i < ends.length; i++) {
      const a = ends[i - 1], b = ends[i];
      if (right ? Math.abs(a.y - b.y) < 0.5 : Math.abs(a.x - b.x) < 0.5) {
        outPts.push(b);
        continue;
      }
      const mid = right ? (a.x + b.x) / 2 : (a.y + b.y) / 2;
      outPts.push(right ? V2(mid, a.y) : V2(a.x, mid), right ? V2(mid, b.y) : V2(b.x, mid), b);
    }
    return outPts;
  };

  const x = reals.map((it) => P.get(it.id)!);
  const boxes = reals.map((it, i) => {
    const w = right ? it.across : it.along, h = right ? it.along : it.across;
    return { x0: x[i].x - w / 2, y0: x[i].y - h / 2, x1: x[i].x + w / 2, y1: x[i].y + h / 2 };
  });
  const bx0 = Math.min(...boxes.map((b) => b.x0)), by0 = Math.min(...boxes.map((b) => b.y0));
  const box = boxes.length ? { x: bx0, y: by0, w: Math.max(...boxes.map((b) => b.x1)) - bx0, h: Math.max(...boxes.map((b) => b.y1)) - by0 } : { x: x0, y: y0, w: 0, h: 0 };

  return {
    pos: (id) => P.get(id) ?? V2(x0, y0),
    rank: (id) => rank.get(id) ?? 0,
    layers: layers.map((l) => l.filter((id) => !items.get(id)!.dummy)),
    reversed,
    path,
    route,
    box,
    crossings: bestCross,
  };
}
