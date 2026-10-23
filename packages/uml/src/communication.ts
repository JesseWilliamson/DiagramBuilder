/**
 * UML communication (collaboration) diagrams: the same conversation as a
 * sequence diagram, drawn as a graph instead of a timeline.
 *
 *   participants    stick figure (actor) or a box named `name : Type`, as in `sequence`
 *   link            a plain line between two participants that talk: ONE per pair,
 *                   however many messages cross it, in either direction
 *   message         a short arrow beside the link, parallel to it, pointing the way
 *                   the message goes, with its number and text: `1.2: verify(pw)`
 *
 * Time is gone from the picture (there is no "down"), so order is carried by the
 * numbers: 1, 2, 3… in message order (`numbering: 'flat'`, the default), or
 * Dewey numbers (`'dewey'`): a message `parent` is the message it happens
 * inside, so top-level messages are 1, 2, 3, the ones inside message 2 are
 * 2.1, 2.2, and inside 2.2, 2.2.1. See `deweyNumbers()`. Long message text is
 * cut to `maxLabel` characters with an ellipsis: this diagram has no room for
 * more than a few words per message.
 *
 * The messages are the same `Message` type `sequence` takes (from, to, label,
 * kind, tone, and the optional `parent`), so one list feeds both diagrams. Step
 * through with `upTo`: later messages aren't drawn, the one at `upTo` is toned,
 * and its link with it. Links always show, since they are the structure.
 *
 * Place participants yourself (x, y = centre of the head) or leave x/y out:
 * `ring: true` puts them on a circle in the order the conversation reaches them
 * (so the links are mostly the polygon's sides and the messages ride outside
 * it), otherwise the layered layout (layout/layered.ts) stacks them by who
 * calls whom.
 *
 * Messages on a link are rows: an 18px arrow 12px off the link, parallel to
 * it, pointing the way the message goes, with its text in 12px mono beside it
 * on the outer side of the picture. A flat link stacks its rows away from it
 * (above or below, whichever faces out); a steep one spreads them along it,
 * top to bottom. No row crosses the line or a head. Row positions come from
 * the full message list, not the ones shown so far, so stepping only adds
 * rows: nothing moves.
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, connector, estimateTextWidth, rectEdge, text } from '@dsviz/core';
import { layered } from '@dsviz/layout';
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
  /** Prefix each message with its number. Default true. */
  numbered?: boolean;
  /** 'flat' (default): 1, 2, 3… in message order. 'dewey': 1, 1.1, 1.2, 2… from each message's `parent`. */
  numbering?: 'flat' | 'dewey';
  /** Message text longer than this is cut with an ellipsis. Default 22. */
  maxLabel?: number;
  /** Tone for the current message (default 'active'); `highlight: false` for a static diagram. */
  tone?: Tone;
  highlight?: boolean;
  /** Place participants without x/y on a circle instead of in layers. */
  ring?: boolean;
  /** Ring radius. Default: from the count and the widest head (about 110 for five). */
  radius?: number;
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
  /** The number drawn for each message, in message order. */
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

/** Message rows: arrow length, distance of the first row from the link, spacing between rows, arrow–text gap. */
export const MESSAGE_ROW = { arrow: 18, off: 12, stack: 16, gap: 5 } as const;
const { arrow: ARROW, off: OFF, stack: STACK, gap: GAP } = MESSAGE_ROW;

const unit = (a: Vec, b: Vec): Vec => {
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return V2((b.x - a.x) / d, (b.y - a.y) / d);
};

/** The link a message rides on: the pair in participant order, so a→b and b→a share it. */
export const linkKey = (participants: readonly Participant[], a: string, b: string): string => {
  const ia = participants.findIndex((p) => p.id === a), ib = participants.findIndex((p) => p.id === b);
  return ia <= ib ? `${a}-${b}` : `${b}-${a}`;
};

/** Participants in the order the conversation reaches them: the first message's sender, then whoever is spoken to next. */
export function conversationOrder(participants: readonly Participant[], messages: readonly Message[]): string[] {
  const known = new Set(participants.map((p) => p.id));
  const order: string[] = [];
  for (const m of messages) for (const q of [m.from, m.to]) if (known.has(q) && !order.includes(q)) order.push(q);
  for (const p of participants) if (!order.includes(p.id)) order.push(p.id);
  return order;
}

export function communication(input: readonly CommunicationParticipant[], messages: readonly Message[], o: CommunicationOptions = {}): CommunicationDiagram {
  const id = o.id ?? 'comm';
  const upTo = Math.min(o.upTo ?? messages.length - 1, messages.length - 1);
  const numbers = o.numbering === 'dewey' ? deweyNumbers(messages) : messages.map((_, i) => `${i + 1}`);
  const maxLabel = o.maxLabel ?? 22;
  const cut = (t: string) => (t.length > maxLabel ? `${t.slice(0, Math.max(1, maxLabel - 1)).trimEnd()}…` : t);
  const known = new Set(input.map((p) => p.id));
  const pairOf = (m: Message) => linkKey(input, m.from, m.to);
  const used = messages.map((m, i) => ({ m, i })).filter(({ m }) => known.has(m.from) && known.has(m.to));

  // ---- placement: heads that lack x/y go on a ring or into layers
  const size = new Map(input.map((p) => [p.id, headSize(p)]));
  const free = input.filter((p) => p.x == null || p.y == null);
  const placed = new Map<string, Vec>(input.filter((p) => !free.includes(p)).map((p) => [p.id, V2(p.x!, p.y!)]));
  if (free.length && o.ring) {
    // round the ring in conversation order, so the links are the polygon's sides; the radius keeps
    // neighbouring heads apart (chord = 2R·sin(π/n)) and is never under 95
    const order = conversationOrder(free, messages);
    const n = order.length;
    const widest = Math.max(...free.map((p) => size.get(p.id)!.w));
    const R = o.radius ?? (n < 2 ? 0 : Math.max(95, (widest + 24) / (2 * Math.sin(Math.PI / n))));
    order.forEach((q, k) => {
      const a = -Math.PI / 2 + (2 * Math.PI * k) / n;
      placed.set(q, V2(Math.cos(a) * R, Math.sin(a) * R));
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
  const centre = V2(input.reduce((a, p) => a + frames.get(p.id)!.x, 0) / (input.length || 1), input.reduce((a, p) => a + frames.get(p.id)!.y, 0) / (input.length || 1));
  // the side of each head that its links leave by, so a self-loop can take a free one
  const sidesUsed = new Map<string, Set<'top' | 'bottom' | 'left' | 'right'>>();
  const sideOf = (f: Frame, p: Vec): 'top' | 'bottom' | 'left' | 'right' => {
    const dx = (p.x - f.x) / (f.w / 2), dy = (p.y - f.y) / (f.h / 2);
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'bottom' : 'top';
  };
  const nodes: SceneNode[] = [], msgs: SceneNode[] = [];
  const current = o.highlight !== false && upTo >= 0 ? messages[upTo] : undefined;
  const curPair = current ? pairOf(current) : undefined;
  const dimOf = (a: string, b = a) => (o.dim?.has(a) || o.dim?.has(b) ? 0.3 : 1);
  const ends = new Map<string, [Vec, Vec]>();
  for (const [key, list] of byPair) {
    const m0 = messages[list[0]];
    if (m0.from === m0.to) continue;
    const [a, b] = input.map((p) => p.id).filter((q) => q === m0.from || q === m0.to);
    const fa = frames.get(a)!, fb = frames.get(b)!;
    const A = rectEdge(fa, V2(fb.x, fb.y)), B = rectEdge(fb, V2(fa.x, fa.y));
    ends.set(key, [A, B]);
    (sidesUsed.get(a) ?? sidesUsed.set(a, new Set()).get(a)!).add(sideOf(fa, A));
    (sidesUsed.get(b) ?? sidesUsed.set(b, new Set()).get(b)!).add(sideOf(fb, B));
    nodes.push(...connector({
      id: `${id}:link:${key}`, from: A, to: B, end: 'none',
      tone: key === curPair ? (o.tone ?? 'active') : undefined, opacity: dimOf(a, b),
    }).nodes);
  }

  // ---- messages: rows of arrow + text beside each link, in message order
  for (const [key, list] of byPair) {
    const K = list.length;
    list.forEach((i, j) => {
      if (i > upTo) return;
      const m = messages[i];
      const tone = i === upTo && o.highlight !== false ? (o.tone ?? 'active') : m.tone;
      const label = o.numbered === false ? cut(m.label) : `${numbers[i]}: ${cut(m.label)}`;
      const k = `${id}:msg:${i}`;
      const style = (m.kind ?? 'call') === 'call' ? { end: 'arrow' as const } : { end: 'open' as const, dashed: m.kind === 'return' };
      const opacity = dimOf(m.from, m.to);
      if (m.from === m.to) {
        // a message to self: a little loop on a side of the head no link uses, facing out of the
        // picture (below or above first, then left or right), with the text on its outer side
        const f = frames.get(m.from)!;
        const taken = sidesUsed.get(m.from) ?? new Set();
        const away = { v: f.y >= centre.y ? 'bottom' : 'top', h: f.x < centre.x ? 'left' : 'right' } as const;
        const flip = { bottom: 'top', top: 'bottom', left: 'right', right: 'left' } as const;
        const side = ([away.v, away.h, flip[away.v], flip[away.h]] as const).find((s) => !taken.has(s)) ?? away.v;
        const ox = side === 'left' ? -1 : side === 'right' ? 1 : 0, oy = side === 'top' ? -1 : side === 'bottom' ? 1 : 0;
        const tx = -oy, ty = ox, ext = ox ? f.w / 2 : f.h / 2, hw = 10 + j * 6, hh = 18 + j * STACK;
        const P = (a: number, b: number) => V2(f.x + ox * (ext + a) + tx * b, f.y + oy * (ext + a) + ty * b);
        msgs.push(...connector({ id: k, from: P(0, -hw), via: [P(hh, -hw), P(hh, hw)], to: P(0, hw), ...style, tone, opacity }).nodes);
        const left = ox ? ox < 0 : f.x < centre.x;
        const lp = ox ? P(hh + GAP + 2, 0) : V2(f.x + (left ? -1 : 1) * (hw + GAP + 2), P(hh / 2 + 1, 0).y);
        msgs.push(text({ id: `${k}:label`, x: lp.x, y: lp.y, text: label, size: 12, anchor: left ? 'end' : 'start', role: 'message', tone, opacity }));
        return;
      }
      const [a, b] = input.map((p) => p.id).filter((q) => q === m.from || q === m.to);
      const [A, B] = ends.get(key)!;
      const mid = V2((A.x + B.x) / 2, (A.y + B.y) / 2);
      const u = unit(A, B), dir = m.from === a ? 1 : -1;
      // rows go on the outer side of the link (away from the middle of the picture), so they don't
      // land on other links; a link through the middle falls back to up / right
      let n = V2(-u.y, u.x);
      const out = (mid.x - centre.x) * n.x + (mid.y - centre.y) * n.y;
      if (Math.abs(out) > 8 ? out < 0 : Math.abs(n.x) > 0.4 ? n.x < 0 : n.y > 0) n = V2(-n.x, -n.y);
      const half = ARROW / 2;
      const arrowAt = (c: Vec) => ({ from: V2(c.x - u.x * half * dir, c.y - u.y * half * dir), to: V2(c.x + u.x * half * dir, c.y + u.y * half * dir) });
      if (Math.abs(u.y) < 0.35) {
        // a flat link: rows stack away from it, the arrow at its middle and the text beside the arrow
        // toward the outer side of the picture. A row wider than the link would run under a head, so
        // such rows start just past the heads' edge instead of OFF from the line.
        const fa = frames.get(a)!, fb = frames.get(b)!;
        const linkLen = Math.hypot(B.x - A.x, B.y - A.y);
        const rowW = ARROW + GAP + estimateTextWidth(label, 12);
        const d0 = rowW > linkLen - 4 ? Math.max(fa.h, fb.h) / 2 + OFF - 2 : OFF;
        const d = d0 + j * STACK;
        const c = V2(mid.x + n.x * d, mid.y + n.y * d);
        const right = mid.x >= centre.x - 1;
        msgs.push(...connector({ id: k, ...arrowAt(c), ...style, tone, opacity }).nodes);
        msgs.push(text({ id: `${k}:label`, x: c.x + (right ? 1 : -1) * (half + GAP), y: c.y, text: label, size: 12, anchor: right ? 'start' : 'end', role: 'message', tone, opacity }));
      } else {
        // a steep link: rows spread along it from the top down, far enough apart that the arrows clear
        // each other, each OFF from the line with the text beyond the arrow on the outer side
        const step = Math.max(STACK / Math.abs(u.y), ARROW + 6);
        const down = u.y > 0 ? u : V2(-u.x, -u.y);
        const t = (j - (K - 1) / 2) * step;
        const at = V2(mid.x + down.x * t + n.x * OFF, mid.y + down.y * t + n.y * OFF);
        msgs.push(...connector({ id: k, ...arrowAt(at), ...style, tone, opacity }).nodes);
        // the text must clear the arrow's reach in x, and the link where it passes the text's far corner
        // (6 above/below the row the line has moved sideways by 6·|ux/uy|)
        const clear = Math.max(half * Math.abs(u.x) + GAP, -OFF / Math.abs(u.y) + 6 * Math.abs(u.x / u.y) + 4);
        const sgn = n.x >= 0 ? 1 : -1;
        msgs.push(text({ id: `${k}:label`, x: at.x + sgn * clear, y: at.y, text: label, size: 12, anchor: sgn > 0 ? 'start' : 'end', role: 'message', tone, opacity }));
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
