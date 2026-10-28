/**
 * UML state machines: rounded states, transitions labelled
 * `event [guard] / action`, a filled dot for the start and a ringed dot for the end.
 *
 * You place the states (x, y = centre), or leave x/y out and the layered
 * layout (layout/layered.ts) places them along the transitions. Pass `current`
 * to highlight where the machine is now and `fired` to highlight the
 * transition just taken.
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, circle, connector, estimateTextWidth, path, pointAlong, rect, rectEdge, text, vadd, vnorm, vperp, vscale, vsub } from '../core';
import { layered } from '../layout';

export interface UmlState {
  id: string;
  /** Default: the id. Ignored for initial/final/choice. */
  label?: string;
  /** Centre. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
  /** 'state' (default), 'initial' (filled dot), 'final' (ringed dot) or 'choice' (diamond). */
  kind?: 'state' | 'initial' | 'final' | 'choice';
  tone?: Tone;
}

export interface Transition {
  from: string;
  to: string;
  /** e.g. 'pay [amount ok] / sendReceipt'. */
  label?: string;
  /** Bow the line sideways by this many px (so A→B and B→A don't overlap). */
  bend?: number;
}

export interface StateMachineOptions {
  id?: string;
  current?: string;
  /** Index into `transitions` of the one just taken. */
  fired?: number;
  /** States emit clicks with `{ state: id }`. */
  interactive?: boolean;
  /** States can be dragged (emits drag events with `{ state: id }`). */
  draggable?: boolean;
  /** For states without x/y: the flow's direction ('down' default) and the gaps. */
  direction?: 'down' | 'right';
  rankGap?: number;
  nodeGap?: number;
}

export interface StateMachine extends Scene {
  frame(id: string): Frame;
}

const H = 38;

export function stateFrame(s: UmlState): Frame {
  const x = s.x ?? 0, y = s.y ?? 0;
  switch (s.kind) {
    case 'initial':
      return { x, y, w: 16, h: 16 };
    case 'final':
      return { x, y, w: 22, h: 22 };
    case 'choice':
      return { x, y, w: 26, h: 26 };
    default:
      return { x, y, w: Math.max(84, estimateTextWidth(s.label ?? s.id, 13) + 28), h: H };
  }
}

export function stateMachine(input: readonly UmlState[], transitions: readonly Transition[], o: StateMachineOptions = {}): StateMachine {
  const id = o.id ?? 'fsm';
  const free = input.filter((s) => s.x == null || s.y == null);
  let states = input;
  if (free.length) {
    // room between layers for a transition's label
    const L = layered(free.map((s) => ({ id: s.id, ...stateFrame(s) })), transitions, { direction: o.direction, rankGap: o.rankGap ?? 64, nodeGap: o.nodeGap ?? 56 });
    const auto = new Set(free.map((s) => s.id));
    states = input.map((s) => (auto.has(s.id) ? { ...s, ...L.pos(s.id) } : s));
  }
  const frames = new Map(states.map((s) => [s.id, stateFrame(s)]));
  const kinds = new Map(states.map((s) => [s.id, s.kind ?? 'state']));
  const F = (k: string) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 };
  // where a line toward `p` leaves a state: round things by radius, boxes by edge
  const exit = (k: string, p: Vec) => {
    const f = F(k);
    if (kinds.get(k) === 'state' || kinds.get(k) === 'choice') return rectEdge(f, p);
    const d = vnorm(vsub(p, f));
    return vadd(f, vscale(d, f.w / 2 + 1));
  };
  const lines: SceneNode[] = [];
  transitions.forEach((t, i) => {
    const k = `${id}:t:${i}`;
    const tone = o.fired === i ? 'active' : undefined;
    const a = F(t.from), b = F(t.to);
    if (t.from === t.to) {
      // self-transition: a loop over the top of the state
      const y0 = a.y - a.h / 2, l = a.x - 14, r = a.x + 14;
      const c = connector({ id: k, from: V2(l, y0), via: [V2(l - 6, y0 - 26), V2(r + 6, y0 - 26)], to: V2(r, y0), end: 'arrow', tone });
      lines.push(...c.nodes);
      if (t.label) lines.push(text({ id: `${k}:label`, x: a.x, y: y0 - 36, text: t.label, size: 12, role: 'edge-label', tone }));
      return;
    }
    // a bent transition: aim the ends at the bend's control point, then curve through it
    const bend = t.bend ?? 0;
    const mid = V2((a.x + b.x) / 2, (a.y + b.y) / 2);
    const ctrl = vadd(mid, vscale(vperp(vnorm(vsub(b, a))), bend));
    const p0 = exit(t.from, Math.abs(bend) > 0.5 ? ctrl : b);
    const p1 = exit(t.to, Math.abs(bend) > 0.5 ? ctrl : a);
    // sample the quadratic so the connector (a polyline) follows the curve
    const via: Vec[] = [];
    if (Math.abs(bend) > 0.5) for (let s = 1; s < 12; s++) {
      const u = s / 12, v = 1 - u;
      via.push(V2(v * v * p0.x + 2 * v * u * ctrl.x + u * u * p1.x, v * v * p0.y + 2 * v * u * ctrl.y + u * u * p1.y));
    }
    const c = connector({ id: k, from: p0, to: p1, via, end: 'arrow', gap: 2, tone });
    lines.push(...c.nodes.filter((n) => !n.id.endsWith(':label')));
    if (t.label) {
      const m = pointAlong(c.points, 0.5);
      // A bent line's label sits on the outside of its bulge, beside the curve,
      // so the two labels of an A ⇄ B pair don't land on top of each other.
      const out = Math.abs(bend) > 0.5 ? vnorm(vsub(ctrl, mid)) : null;
      const side = out && Math.abs(out.x) > 0.3 ? (out.x > 0 ? 'start' : 'end') : undefined;
      const at = side && out ? vadd(m, vscale(out, 6)) : m;
      lines.push(text({ id: `${k}:label`, x: at.x, y: at.y, text: t.label, size: 12, role: 'edge-label', tone, anchor: side }));
    }
  });

  const shapes: SceneNode[] = [];
  for (const s of states) {
    const f = F(s.id), k = `${id}:s:${s.id}`;
    const { x, y } = f;
    const on = o.current === s.id;
    const tone = on ? 'active' : s.tone;
    const data = { state: s.id };
    switch (s.kind) {
      case 'initial':
        shapes.push(circle({ id: k, x: x, y: y, r: 8, role: 'pseudo', tone: on ? 'active' : undefined, data }));
        break;
      case 'final':
        shapes.push(
          circle({ id: k, x: x, y: y, r: 11, role: 'outline', tone, data }),
          circle({ id: `${k}:dot`, x: x, y: y, r: 6.5, role: 'pseudo', tone: on ? 'active' : undefined }),
        );
        break;
      case 'choice':
        shapes.push(path({ id: k, points: [[x, y - 13], [x + 13, y], [x, y + 13], [x - 13, y]], closed: true, tone, data }));
        break;
      default:
        // the box first, the name right after it (a label always follows its shape)
        shapes.push(
          rect({ id: k, x: x, y: y, w: f.w, h: f.h, rx: f.h / 2, tone, interactive: o.interactive, draggable: o.draggable, data }),
          text({ id: `${k}:label`, x: x, y: y, text: s.label ?? s.id, size: 13, role: 'value', tone }),
        );
    }
  }
  return { nodes: [...lines, ...shapes], frame: F };
}
