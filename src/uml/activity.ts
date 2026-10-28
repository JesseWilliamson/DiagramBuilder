/**
 * UML activity diagrams: a process as a flow of actions.
 *
 *   kind        shape              meaning
 *   start       filled dot         where the flow begins
 *   action      rounded box        one step
 *   decision    diamond            pick ONE outgoing flow by its [guard]
 *   merge       diamond            several flows meet again (no waiting)
 *   fork        thick bar          split into parallel flows
 *   join        thick bar          wait for ALL incoming flows
 *   end         ringed dot         the whole activity finishes
 *   flowFinal   circle with X      this one flow stops; the others go on
 *
 * Flows are arrows between nodes; a `guard` ('x > 0' or '[x > 0]') labels the
 * ones leaving a decision. Pass `current` (a node id) and `taken` (indices of
 * flows) to highlight where a walk through the process has got to.
 *
 * Layout: nodes without x/y go through the layered layout (flow downward, or
 * `direction: 'right'`). With `swimlanes`, each node carries a `lane` id: the
 * layers still fix the position ALONG the flow, but the position ACROSS it is
 * the lane's centre, and nodes that share a lane and a layer (the two branches
 * of a decision) sit side by side inside it. Lanes are columns when the flow
 * runs down, rows when it runs right. A fork or join bar is stretched to span
 * the flows it splits or gathers, plus 24.
 *
 * Flows leave the bottom centre of a node and enter the top centre of the
 * next, with right angles in between; a branch out of a decision that goes
 * sideways leaves by the diamond's side point instead. They are routed round
 * any node or bar in the way, and a flow back up (a retry loop) goes round
 * the right side. A guard sits beside the first segment after the decision,
 * off the line, with a halo.
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, circle, connector, estimateTextWidth, path, rect, text } from '../core';
import { layered } from '../layout';

export type ActivityKind = 'action' | 'decision' | 'merge' | 'fork' | 'join' | 'start' | 'end' | 'flowFinal';

export interface ActivityNode {
  id: string;
  /** Default 'action'. */
  kind?: ActivityKind;
  /** Shown in actions (default: the id) and beside decisions; start / end / bars have none. */
  label?: string;
  /** Swimlane id. Nodes without one go in the first lane (bars: between the nodes they touch). */
  lane?: string;
  /** Centre. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
  tone?: Tone;
}

export interface ActivityFlow {
  from: string;
  to: string;
  /** Condition on a flow out of a decision. */
  guard?: string;
  tone?: Tone;
}

export interface Swimlane {
  id: string;
  name: string;
  tone?: Tone;
}

export interface ActivityOptions {
  id?: string;
  swimlanes?: readonly Swimlane[];
  /** The flow runs 'down' (default) or 'right'. Lanes are columns when it runs down, rows when it runs right. */
  direction?: 'down' | 'right';
  /** Node (or nodes, for parallel branches) to highlight in the active tone. */
  current?: string | ReadonlySet<string>;
  /** Index (or indices) into `flows` of the flows already taken: drawn in the active tone. */
  taken?: number | ReadonlySet<number>;
  /** Nodes emit clicks with `{ node: id }`. */
  interactive?: boolean;
  draggable?: boolean;
  /** Space between layers and between neighbours in a layer. Defaults 46 and 36. */
  rankGap?: number;
  nodeGap?: number;
}

export interface ActivityDiagram extends Scene {
  frame(id: string): Frame;
  box(id: string): Frame;
  frames: Record<string, Frame>;
  /** Swimlane frames (including their title band), by lane id. */
  lanes: Record<string, Frame>;
}

const BAR = 6, HEAD = 26, DIAMOND = 26, ACTION_H = 38;
const isBar = (k?: ActivityKind) => k === 'fork' || k === 'join';

/** Size of a node. A bar is `len` long across the flow. */
export function activitySize(n: ActivityNode, down = true, len = 80): { w: number; h: number } {
  switch (n.kind ?? 'action') {
    case 'start': return { w: 16, h: 16 };
    case 'end': return { w: 16, h: 16 };
    case 'flowFinal': return { w: 16, h: 16 };
    case 'decision': case 'merge': return { w: DIAMOND, h: DIAMOND };
    case 'fork': case 'join': return down ? { w: len, h: BAR } : { w: BAR, h: len };
    default: return { w: Math.max(96, Math.ceil(estimateTextWidth(n.label ?? n.id, 13) + 28)), h: ACTION_H };
  }
}

/** A box in flow coordinates: u across the flow, v along it, cu / cv the half sizes. */
interface Cell { u: number; v: number; cu: number; cv: number }

/** Right-angled route from a to b, in (u, v) points; see the header comment. `diamond`: a is a decision. */
export function flowRoute(a: Cell, b: Cell, others: Cell[], bars: [boolean, boolean], diamond = false): [number, number][] {
  // a bar is entered at the point of it nearest the other end, not at its centre
  const at = (c: Cell, other: Cell, bar: boolean): Cell => (bar ? { ...c, u: Math.max(c.u - c.cu + 8, Math.min(c.u + c.cu - 8, other.u)), cu: 0 } : c);
  const A = at(a, b, bars[0]), B = at(b, a, bars[1]);
  if (B.v - B.cv >= A.v + A.cv - 1) {
    const s: [number, number] = [A.u, A.v + A.cv], e: [number, number] = [B.u, B.v - B.cv];
    const lo = Math.min(A.u, B.u), hi = Math.max(A.u, B.u);
    const blocks = others.filter((o) => o.v > A.v + 1 && o.v < B.v - 1 && o.u + o.cu + 8 > lo && o.u - o.cu - 8 < hi);
    if (diamond && !blocks.length && Math.abs(B.u - A.u) > A.cu + 8) {
      // a branch going sideways leaves by the diamond's point on that side, then turns down
      const k = B.u > A.u ? 1 : -1;
      return [[A.u + k * A.cu, A.v], [B.u, A.v], e];
    }
    if (blocks.length) {
      const x = Math.max(...blocks.map((o) => o.u + o.cu)) + 18;
      return [s, [A.u, s[1] + 14], [x, s[1] + 14], [x, e[1] - 14], [B.u, e[1] - 14], e];
    }
    if (Math.abs(A.u - B.u) < 1) return [s, e];
    const mid = (s[1] + e[1]) / 2;
    return [s, [A.u, mid], [B.u, mid], e];
  }
  if (Math.abs(A.v - B.v) < 2) {
    const k = A.u < B.u ? 1 : -1;
    return [[A.u + k * A.cu, A.v], [B.u - k * B.cu, B.v]];
  }
  // back up the flow: out of a's side, up the right of everything between, into b's side
  const x = Math.max(A.u + A.cu, B.u + B.cu, ...others.filter((o) => o.v > B.v && o.v < A.v).map((o) => o.u + o.cu)) + 26;
  return [[A.u + A.cu, A.v], [x, A.v], [x, B.v], [B.u + B.cu, B.v]];
}

export function activity(input: readonly ActivityNode[], flows: readonly ActivityFlow[] = [], o: ActivityOptions = {}): ActivityDiagram {
  const id = o.id ?? 'act';
  const down = o.direction !== 'right';
  const lanes = o.swimlanes ?? [];
  const size = (n: ActivityNode, len = 80) => activitySize(n, down, len);
  // flow coordinates <-> screen coordinates
  const U = (p: Vec) => (down ? p.x : p.y), Vv = (p: Vec) => (down ? p.y : p.x);
  const P = (u: number, v: number) => (down ? V2(u, v) : V2(v, u));

  // 1. positions: layered for the free nodes
  const free = input.filter((n) => n.x == null || n.y == null);
  const freeIds = new Set(free.map((n) => n.id));
  const L = free.length
    ? layered(free.map((n) => ({ id: n.id, ...size(n) })), flows.filter((f) => freeIds.has(f.from) && freeIds.has(f.to)), { direction: o.direction ?? 'down', rankGap: o.rankGap ?? 46, nodeGap: o.nodeGap ?? 36 })
    : undefined;
  const at = new Map<string, Vec>(input.map((n) => [n.id, V2(n.x ?? 0, n.y ?? 0)]));
  for (const n of free) at.set(n.id, L!.pos(n.id));
  const lens = new Map<string, number>();
  // a bar spans the parallel flows it splits (fork: where they go) or gathers (join: where they come from)
  const nb = (n: ActivityNode) => {
    const side = flows.flatMap((f) => (n.kind === 'fork' && f.from === n.id ? [f.to] : n.kind === 'join' && f.to === n.id ? [f.from] : []));
    return side.length ? side : flows.flatMap((f) => (f.from === n.id ? [f.to] : f.to === n.id ? [f.from] : []));
  };
  // a flow meets a bar at the point nearest its other end, so a bar spans those points, plus 24
  const barLen = (n: ActivityNode, u: number) => {
    const ns = nb(n).map((k) => at.get(k)!).filter(Boolean).map(U);
    return Math.max(48, 2 * Math.max(...ns.map((x) => Math.abs(x - u))) + 24);
  };
  const fr = (n: ActivityNode): Frame => ({ ...at.get(n.id)!, ...size(n, lens.get(n.id)) });

  // 2. swimlanes: across the flow, a node sits at its lane's centre; same lane + same layer share it
  const crossOf = (n: ActivityNode) => (down ? size(n).w : size(n).h);
  const laneIdx = (n: ActivityNode) => Math.max(0, lanes.findIndex((l) => l.id === n.lane));
  const laneBand: { c0: number; c1: number }[] = [];
  if (lanes.length) {
    const members = free.filter((n) => !isBar(n.kind) || n.lane);
    const gap = 28;
    // each lane is as wide as its fullest layer needs
    const groups = new Map<string, ActivityNode[]>();
    for (const n of members) groups.set(`${laneIdx(n)}|${L!.rank(n.id)}`, [...(groups.get(`${laneIdx(n)}|${L!.rank(n.id)}`) ?? []), n]);
    const widths = lanes.map((_, i) => {
      const own = members.filter((n) => laneIdx(n) === i);
      const m = Math.max(0, ...own.map(crossOf));
      const k = Math.max(1, ...[...groups].filter(([key]) => key.startsWith(`${i}|`)).map(([, g]) => g.length));
      return Math.max(down ? 150 : 84, k * m + (k - 1) * gap + 48);
    });
    let c = 0;
    lanes.forEach((_, i) => (laneBand[i] = { c0: c, c1: (c += widths[i]) }));
    for (const g of groups.values()) {
      g.sort((p, q) => U(at.get(p.id)!) - U(at.get(q.id)!));
      const band = laneBand[laneIdx(g[0])], m = Math.max(...g.map(crossOf));
      g.forEach((n, j) => at.set(n.id, P((band.c0 + band.c1) / 2 + (j - (g.length - 1) / 2) * (m + gap), Vv(at.get(n.id)!))));
    }
  }
  // 3. bars span the nodes they touch (a bar with no lane is centred among them)
  for (const n of input.filter((n) => isBar(n.kind))) {
    const ns = nb(n).map((k) => at.get(k)!).filter(Boolean).map(U);
    if (!ns.length) continue;
    if (free.includes(n) && !(lanes.length && n.lane)) at.set(n.id, P((Math.min(...ns) + Math.max(...ns)) / 2, Vv(at.get(n.id)!)));
    lens.set(n.id, barLen(n, U(at.get(n.id)!)));
  }
  const frames: Record<string, Frame> = Object.fromEntries(input.map((n) => [n.id, fr(n)]));

  // 4. lane frames: full height of the process, title band on top (or on the left)
  const laneFrames: Record<string, Frame> = {};
  const nodeCell = (f: Frame): Cell => (down ? { u: f.x, v: f.y, cu: f.w / 2, cv: f.h / 2 } : { u: f.y, v: f.x, cu: f.h / 2, cv: f.w / 2 });
  const cells = input.map((n) => nodeCell(frames[n.id]));
  const vmin = (cells.length ? Math.min(...cells.map((c) => c.v - c.cv)) : 0) - 28, vmax = (cells.length ? Math.max(...cells.map((c) => c.v + c.cv)) : 0) + 28;
  const head = down ? HEAD : Math.max(70, ...lanes.map((l) => estimateTextWidth(l.name, 12) + 24));
  const laneBox = (i: number, from: number, to: number): Frame => {
    const { c0, c1 } = laneBand[i], p = P((c0 + c1) / 2, (from + to) / 2);
    return down ? { x: p.x, y: p.y, w: c1 - c0, h: to - from } : { x: p.x, y: p.y, w: to - from, h: c1 - c0 };
  };
  lanes.forEach((l, i) => (laneFrames[l.id] = laneBox(i, vmin - head, vmax)));

  // 5. paint: lanes, flows, nodes
  const nodes: SceneNode[] = [];
  lanes.forEach((l, i) => {
    const k = `${id}:lane:${l.id}`, band = laneBox(i, vmin - head, vmin), f = laneFrames[l.id];
    nodes.push(
      rect({ id: k, ...f, role: 'lane' }),
      rect({ id: `${k}:title`, ...band, role: 'lane-title', tone: l.tone }),
      text({ id: `${k}:name`, x: band.x, y: band.y, text: l.name, size: 12, role: 'lane-name' }),
    );
  });
  const isCurrent = (k: string) => (typeof o.current === 'string' ? o.current === k : !!o.current?.has(k));
  const taken = (i: number) => (typeof o.taken === 'number' ? o.taken === i : !!o.taken?.has(i));
  flows.forEach((f, i) => {
    const a = input.find((n) => n.id === f.from), b = input.find((n) => n.id === f.to);
    if (!a || !b) return;
    const others = input.filter((n) => n !== a && n !== b).map((n) => nodeCell(frames[n.id]));
    const uv = flowRoute(nodeCell(frames[a.id]), nodeCell(frames[b.id]), others, [isBar(a.kind), isBar(b.kind)], a.kind === 'decision');
    const pts = uv.map(([u, v]) => P(u, v));
    const tone = taken(i) ? 'active' : f.tone;
    nodes.push(...connector({ id: `${id}:flow:${i}`, from: pts[0], to: pts[pts.length - 1], via: pts.slice(1, -1), end: 'arrow', tone }).nodes);
    if (f.guard) {
      // the guard sits beside the first segment, off the line: to the right of a segment along the
      // flow, on the near side of one across it, 10 in from the decision
      const guard = f.guard.startsWith('[') ? f.guard : `[${f.guard}]`;
      const [p0, p1] = uv;
      const along = Math.abs(p1[0] - p0[0]) < 1;
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const t = along ? Math.min(0.5, 12 / Math.max(len, 1)) : Math.min(0.5, (estimateTextWidth(guard, 11) / 2 + 10) / Math.max(len, 1));
      const q: [number, number] = [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
      const k = along ? 1 : -1; // across-segment: the label goes on the side toward the start of the flow
      const at = down ? V2(q[0] + (along ? 8 : 0), q[1] + (along ? 0 : k * 9)) : V2(q[1] + (along ? 0 : k * 9), q[0] + (along ? 8 : 0));
      const anchor = down ? (along ? 'start' : 'middle') : (along ? 'middle' : 'start');
      nodes.push(text({ id: `${id}:flow:${i}:label`, x: at.x, y: at.y + (!down && along ? 10 : 0), text: guard, size: 11, anchor, role: 'edge-label', tone }));
    }
  });
  for (const n of input) {
    const f = frames[n.id], { x, y } = f, k = `${id}:n:${n.id}`;
    const on = isCurrent(n.id), tone = on ? 'active' : n.tone;
    const ev = { interactive: o.interactive, draggable: o.draggable, data: { node: n.id } };
    switch (n.kind ?? 'action') {
      case 'start': nodes.push(circle({ id: k, x, y, r: 8, role: 'pseudo', tone: on ? 'active' : undefined, ...ev })); break;
      case 'end': nodes.push(circle({ id: k, x, y, r: 8, role: 'outline', tone }), circle({ id: `${k}:dot`, x, y, r: 5, role: 'pseudo', tone: on ? 'active' : undefined, ...ev })); break;
      case 'flowFinal':
        nodes.push(circle({ id: k, x, y, r: 8, role: 'flow-final', tone, ...ev }),
          path({ id: `${k}:x1`, points: [[x - 4, y - 4], [x + 4, y + 4]], role: 'figure-line' }), path({ id: `${k}:x2`, points: [[x - 4, y + 4], [x + 4, y - 4]], role: 'figure-line' }));
        break;
      case 'decision': case 'merge': {
        const r = DIAMOND / 2;
        nodes.push(path({ id: k, points: [[x, y - r], [x + r, y], [x, y + r], [x - r, y]], closed: true, role: 'decision', tone, ...ev }));
        if (n.label) nodes.push(text({ id: `${k}:label`, x: x + r + 6, y: y - r - 2, text: n.label, size: 12, role: 'caption', anchor: 'start' }));
        break;
      }
      case 'fork': case 'join': nodes.push(rect({ id: k, x, y, w: f.w, h: f.h, rx: 1, role: 'fork-bar', tone, ...ev })); break;
      default:
        nodes.push(rect({ id: k, x, y, w: f.w, h: f.h, rx: 10, role: 'card', tone, ...ev }), text({ id: `${k}:label`, x, y, text: n.label ?? n.id, size: 13, role: 'value' }));
    }
  }
  const frame = (k: string) => frames[k] ?? { x: 0, y: 0, w: 0, h: 0 };
  return { nodes, frame, box: frame, frames, lanes: laneFrames };
}
