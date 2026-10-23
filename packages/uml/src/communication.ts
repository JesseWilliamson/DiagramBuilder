/**
 * UML communication (collaboration) diagrams: the same conversation as a
 * sequence diagram, drawn as a graph instead of a timeline.
 *
 *   participants    stick figure (actor) or a box named `name : Type`, as in `sequence`
 *   link            a plain line between two participants that talk: ONE per pair,
 *                   however many messages cross it, in either direction
 *   message         a small arrow beside the link, parallel to it, pointing the way
 *                   the message goes, with its number and text: `1.2: verify(pw)`
 *
 * Time is gone from the picture (there is no "down"), so order is carried by the
 * numbers. A message `parent` is the message it happens inside, and gets a
 * Dewey number: top-level messages are 1, 2, 3; the ones inside message 2 are
 * 2.1, 2.2; inside 2.2, 2.2.1. See `deweyNumbers()`.
 *
 * The messages are the same `Message` type `sequence` takes (from, to, label,
 * kind, tone, and the optional `parent`), so one list feeds both diagrams. Step
 * through with `upTo`: later messages aren't drawn, the one at `upTo` is toned,
 * and its link with it. Links always show, since they are the structure.
 *
 * Place participants yourself (x, y = centre of the head) or leave x/y out:
 * the layered layout (layout/layered.ts) places them, or `ring: true` puts them
 * on a circle, which suits a few objects that all talk to each other.
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, connector, text } from '@figurae/core';
import { layered } from '@figurae/layout';
import { Message, Participant, headSize, participantHead } from './sequence';

export interface CommunicationParticipant extends Participant {
  /** Centre of the head. Leave both out to have the layout place it. */
  x?: number;
  y?: number;
  tone?: Tone;
}

export interface CommunicationOptions {
  id?: string;
  /** Show messages 0..upTo only (default: all). The message at upTo is highlighted. */
  upTo?: number;
  /** Prefix each message with its Dewey number. Default true. */
  numbered?: boolean;
  /** Tone for the current message (default 'active'); `highlight: false` for a static diagram. */
  tone?: Tone;
  highlight?: boolean;
  /** Place participants without x/y on a circle instead of in layers. */
  ring?: boolean;
  /** Participants emit clicks with `{ participant: id }`. */
  interactive?: boolean;
  /** Participants can be dragged; drag data is `{ participant: id }`. */
  draggable?: boolean;
  /** Participants to fade. */
  dim?: ReadonlySet<string>;
  /** Layered layout spacing for participants without x/y. Defaults 90 and 70. */
  rankGap?: number;
  nodeGap?: number;
}

export interface CommunicationDiagram extends Scene {
  /** The head drawn for a participant (centre + size). */
  box(id: string): Frame;
  /** The Dewey number of each message, in message order. */
  numbers: string[];
}

/** "1", "2", "2.1"…: top-level messages count 1, 2, 3; a message with a `parent` counts within it. */
export function deweyNumbers(messages: readonly Pick<Message, 'parent'>[]): string[] {
  const out: string[] = [];
  const counts = new Map<number, number>(); // parent index (-1 = none) → children so far
  messages.forEach((m, i) => {
    // a parent must come earlier, or it can't be a number we have already made
    const p = m.parent != null && m.parent >= 0 && m.parent < i ? m.parent : -1;
    const n = (counts.get(p) ?? 0) + 1;
    counts.set(p, n);
    out.push(p < 0 ? `${n}` : `${out[p]}.${n}`);
  });
  return out;
}

const ARROW = 24, STACK = 30;

const unit = (a: Vec, b: Vec): Vec => {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return V2((b.x - a.x) / d, (b.y - a.y) / d);
};

/** The link a message rides on: the pair in participant order, so a→b and b→a share it. */
export const linkKey = (participants: readonly Participant[], a: string, b: string): string => {
  const ia = participants.findIndex((p) => p.id === a), ib = participants.findIndex((p) => p.id === b);
  return ia <= ib ? `${a}-${b}` : `${b}-${a}`;
};

export function communication(input: readonly CommunicationParticipant[], messages: readonly Message[], o: CommunicationOptions = {}): CommunicationDiagram {
  const id = o.id ?? 'comm';
  const upTo = Math.min(o.upTo ?? messages.length - 1, messages.length - 1);
  const numbers = deweyNumbers(messages);
  const known = new Set(input.map((p) => p.id));
  const pairOf = (m: Message) => linkKey(input, m.from, m.to);
  const used = messages.map((m, i) => ({ m, i })).filter(({ m }) => known.has(m.from) && known.has(m.to));

  // ---- placement: heads that lack x/y go on a ring or into layers
  const size = new Map(input.map((p) => [p.id, headSize(p)]));
  const free = input.filter((p) => p.x == null || p.y == null);
  const placed = new Map<string, Vec>(input.filter((p) => !free.includes(p)).map((p) => [p.id, V2(p.x!, p.y!)]));
  if (free.length && o.ring) {
    // chord between neighbours must clear both heads: R = chord / (2 sin(π/n))
    const need = Math.max(...free.map((p) => Math.max(size.get(p.id)!.w, size.get(p.id)!.h))) + 150;
    const R = free.length < 2 ? 0 : Math.max(130, need / (2 * Math.sin(Math.PI / free.length)));
    free.forEach((p, k) => {
      const a = -Math.PI / 2 + (2 * Math.PI * k) / free.length;
      placed.set(p.id, V2(Math.cos(a) * R, Math.sin(a) * R));
    });
  } else if (free.length) {
    const seen = new Set<string>();
    const edges = used.filter(({ m }) => m.from !== m.to).flatMap(({ m }) => {
      const k = pairOf(m);
      return seen.has(k) ? [] : (seen.add(k), [{ from: m.from, to: m.to }]);
    });
    const L = layered(
      free.map((p) => ({ id: p.id, w: size.get(p.id)!.w, h: size.get(p.id)!.h })),
      edges.filter((e) => free.some((p) => p.id === e.from) && free.some((p) => p.id === e.to)),
      { rankGap: o.rankGap ?? 90, nodeGap: o.nodeGap ?? 70 },
    );
    for (const p of free) placed.set(p.id, L.pos(p.id));
  }
  const frames = new Map<string, Frame>();
  for (const p of input) {
    const c = placed.get(p.id) ?? V2(0, 0), s = size.get(p.id)!;
    frames.set(p.id, { x: c.x, y: c.y, w: s.w, h: s.h });
  }

  // ---- links: one per pair that exchanges a message (self-messages ride a loop instead)
  const byPair = new Map<string, number[]>();
  for (const { m, i } of used) (byPair.get(pairOf(m)) ?? byPair.set(pairOf(m), []).get(pairOf(m))!).push(i);
  const neighbours = new Map<string, Vec>();
  for (const p of input) {
    const f = frames.get(p.id)!;
    const others = input.filter((q) => q.id !== p.id && used.some(({ m }) => (m.from === p.id && m.to === q.id) || (m.to === p.id && m.from === q.id)));
    if (!others.length) continue;
    const cx = others.reduce((a, q) => a + frames.get(q.id)!.x, 0) / others.length, cy = others.reduce((a, q) => a + frames.get(q.id)!.y, 0) / others.length;
    neighbours.set(p.id, unit(V2(cx, cy), V2(f.x, f.y)));
  }
  const centre = V2(input.reduce((a, p) => a + frames.get(p.id)!.x, 0) / (input.length || 1), input.reduce((a, p) => a + frames.get(p.id)!.y, 0) / (input.length || 1));
  const nodes: SceneNode[] = [], msgs: SceneNode[] = [];
  const current = o.highlight !== false && upTo >= 0 ? messages[upTo] : undefined;
  const curPair = current ? pairOf(current) : undefined;
  const dimOf = (a: string, b = a) => (o.dim?.has(a) || o.dim?.has(b) ? 0.3 : 1);
  for (const [key, list] of byPair) {
    const m0 = messages[list[0]];
    if (m0.from === m0.to) continue;
    const [a, b] = input.map((p) => p.id).filter((q) => q === m0.from || q === m0.to);
    nodes.push(...connector({
      id: `${id}:link:${key}`, from: frames.get(a)!, to: frames.get(b)!, end: 'none',
      tone: key === curPair ? (o.tone ?? 'active') : undefined, opacity: dimOf(a, b),
    }).nodes);
  }

  // ---- messages: small arrows riding the link, stacked in the order they appear
  for (const list of byPair.values()) {
    list.forEach((i, j) => {
      if (i > upTo) return;
      const m = messages[i];
      const tone = i === upTo && o.highlight !== false ? (o.tone ?? 'active') : m.tone;
      const label = o.numbered === false ? m.label : `${numbers[i]}: ${m.label}`;
      const k = `${id}:msg:${i}`;
      const style = (m.kind ?? 'call') === 'call' ? { end: 'arrow' as const } : { end: 'open' as const, dashed: m.kind === 'return' };
      const opacity = dimOf(m.from, m.to);
      if (m.from === m.to) {
        // a message to self: a little loop on the side of the head that faces away from its links
        const f = frames.get(m.from)!;
        const away = neighbours.get(m.from) ?? V2(0, -1);
        const o = Math.abs(away.x) > Math.abs(away.y) * 1.4 ? V2(Math.sign(away.x), 0) : V2(0, away.y > 0 ? 1 : -1);
        const t = V2(-o.y, o.x), ext = o.x ? f.w / 2 : f.h / 2, hw = 12 + j * 8, hh = 24 + j * 22;
        const P = (a: number, b: number) => V2(f.x + o.x * (ext + a) + t.x * b, f.y + o.y * (ext + a) + t.y * b);
        msgs.push(...connector({ id: k, from: P(0, -hw), via: [P(hh, -hw), P(hh, hw)], to: P(0, hw), ...style, tone, opacity }).nodes);
        const lp = P(hh + 10, 0);
        msgs.push(text({ id: `${k}:label`, x: o.x ? P(hh + 6, 0).x : lp.x, y: o.x ? lp.y : lp.y, text: label, size: 12, anchor: o.x > 0 ? 'start' : o.x < 0 ? 'end' : 'middle', role: 'message', tone, opacity }));
        return;
      }
      const ids = input.map((p) => p.id);
      const [a, b] = ids.filter((q) => q === m.from || q === m.to);
      const fa = frames.get(a)!, fb = frames.get(b)!;
      const mid = V2((fa.x + fb.x) / 2, (fa.y + fb.y) / 2);
      const len = Math.hypot(fb.x - fa.x, fb.y - fa.y) || 1;
      const u = V2((fb.x - fa.x) / len, (fb.y - fa.y) / len);
      // Messages go on the outer side of the link (away from the middle of the picture), so they
      // don't land on other links; a link through the middle falls back to up / right.
      let n = V2(-u.y, u.x);
      const side = Math.abs(n.x) > 0.4;
      const out = (mid.x - centre.x) * n.x + (mid.y - centre.y) * n.y;
      if (Math.abs(out) > 8 ? out < 0 : side ? n.x < 0 : n.y > 0) n = V2(-n.x, -n.y);
      const K = list.length, dir = m.from === a ? 1 : -1;
      const half = ARROW / 2;
      const arrow = (c: Vec) => ({ from: V2(c.x - u.x * half * dir, c.y - u.y * half * dir), to: V2(c.x + u.x * half * dir, c.y + u.y * half * dir) });
      if (side) {
        // a steep link: stack the messages along the link, text beside each arrow
        const step = Math.max(28, 18 / Math.max(Math.abs(u.y), 0.4));
        const c = V2(mid.x + u.x * (j - (K - 1) / 2) * step, mid.y + u.y * (j - (K - 1) / 2) * step);
        const at = V2(c.x + n.x * 12, c.y + n.y * 12);
        msgs.push(...connector({ id: k, ...arrow(at), ...style, tone, opacity }).nodes);
        // the text starts beyond the arrow, clear of the (slanted) link: its near corners are
        // up to 6 units above/below the anchor, where the link has moved sideways by 6·|ux/uy|
        const lean = Math.min(14, 6 * Math.abs(u.x / (u.y || 1e-3)));
        msgs.push(text({ id: `${k}:label`, x: at.x + n.x * 10 + Math.sign(n.x || 1) * lean, y: at.y, text: label, size: 12, anchor: n.x >= 0 ? 'start' : 'end', role: 'message', tone, opacity }));
      } else {
        // a flatter link: stack the messages outward from the link, text beyond each arrow
        const d = 14 + j * STACK;
        const at = V2(mid.x + n.x * d, mid.y + n.y * d), tx = V2(mid.x + n.x * (d + 12), mid.y + n.y * (d + 12));
        msgs.push(...connector({ id: k, ...arrow(at), ...style, tone, opacity }).nodes);
        msgs.push(text({ id: `${k}:label`, x: tx.x, y: tx.y, text: label, size: 12, role: 'message', tone, opacity }));
      }
    });
  }

  // ---- heads on top of the links
  const heads: SceneNode[] = [];
  for (const p of input) {
    const f = frames.get(p.id)!;
    heads.push(...participantHead(p, f.x, f.y - headSize(p).dy, `${id}:head:${p.id}`, {
      tone: p.tone, opacity: dimOf(p.id), interactive: o.interactive, draggable: o.draggable, data: { participant: p.id },
    }));
  }
  return { nodes: [...nodes, ...heads, ...msgs], box: (k) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 }, numbers };
}
