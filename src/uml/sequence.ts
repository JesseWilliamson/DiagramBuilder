/**
 * UML sequence diagrams: participants across the top, time running down,
 * one row per message.
 *
 *   kind     line     head          meaning
 *   call     solid    solid arrow   synchronous call: the caller waits
 *   return   dashed   open arrow    the reply to the most recent call
 *   async    solid    open arrow    fire and forget: nobody waits
 *
 * A call where from === to is a self-call, drawn as a loop.
 *
 * Activation bars (the thin boxes on a lifeline) are not specified: they come
 * from the call/return structure. A call pushes onto the callee's stack, the
 * matching return pops it. That's the same stack a running program keeps, which
 * is exactly what the diagram is showing. See `activations()`.
 *
 * Step through by passing `upTo`: messages after it aren't drawn yet, so a
 * player can reveal the conversation one message at a time.
 */
import { connector } from '../connector';
import { Scene, SceneNode, Tone, circle, estimateTextWidth, path, rect, text } from '../scene';

export interface Participant {
  id: string;
  label: string;
  /** 'actor' draws a stick figure (a person); 'object' (default) a box. */
  kind?: 'object' | 'actor';
}

export interface Message {
  from: string;
  to: string;
  label: string;
  kind?: 'call' | 'return' | 'async';
}

export interface Activation {
  participant: string;
  /** Nesting depth on that lifeline: 0 = outermost. */
  depth: number;
  /** First and last message row covered (inclusive). */
  start: number;
  end: number;
}

/**
 * Activation bars from the message list. Calls push, returns pop; anything
 * still open at the end runs to the last row.
 */
export function activations(messages: readonly Message[]): Activation[] {
  const out: Activation[] = [];
  const stacks = new Map<string, Activation[]>();
  const stack = (p: string) => stacks.get(p) ?? (stacks.set(p, []), stacks.get(p)!);
  messages.forEach((m, i) => {
    const kind = m.kind ?? 'call';
    if (kind === 'call') {
      const s = stack(m.to);
      const a: Activation = { participant: m.to, depth: s.length, start: i, end: i };
      out.push(a);
      if (m.from === m.to) return; // a self-call is drawn as a one-row nested bar
      s.push(a);
    } else if (kind === 'return') {
      const a = stack(m.from).pop();
      if (a) a.end = i;
    }
  });
  for (const s of stacks.values()) for (const a of s) a.end = Math.max(a.end, messages.length - 1);
  return out;
}

export interface SequenceOptions {
  id?: string;
  /** Show messages 0..upTo only (default: all). The message at upTo is highlighted. */
  upTo?: number;
  /** Horizontal distance between lifelines. Default 150. */
  gap?: number;
  /** Height of one message row. Default 44. */
  row?: number;
  /** Prefix each message with its number: "3. getUser(id)". */
  numbered?: boolean;
  tone?: Tone;
}

export interface SequenceDiagram extends Scene {
  /** x of a participant's lifeline. */
  x(id: string): number;
  /** y of message row i. */
  rowY(i: number): number;
}

const HEAD = 34, BAR = 10;

export function sequence(participants: readonly Participant[], messages: readonly Message[], o: SequenceOptions = {}): SequenceDiagram {
  const id = o.id ?? 'seq';
  const gap = o.gap ?? 150, row = o.row ?? 44;
  const upTo = Math.min(o.upTo ?? messages.length - 1, messages.length - 1);
  const xs = new Map(participants.map((p, i) => [p.id, i * gap]));
  const X = (p: string) => xs.get(p) ?? 0;
  // a stick figure is taller than a box, so leave room under it
  const hasActor = participants.some((p) => p.kind === 'actor');
  const top = (hasActor ? 44 : HEAD / 2) + 18;
  const lifeTop = (p: Participant) => (p.kind === 'actor' ? 44 : HEAD / 2);
  const rowY = (i: number) => top + i * row + row / 2;
  const bottom = rowY(messages.length - 1) + row / 2 + 8;
  const acts = activations(messages);
  // depth of the innermost bar on lifeline p during row i (-1 = none)
  const depthAt = (p: string, i: number) => Math.max(-1, ...acts.filter((a) => a.participant === p && a.start <= i && i <= a.end).map((a) => a.depth));
  const barX = (p: string, depth: number) => X(p) + depth * (BAR * 0.6);

  const nodes: SceneNode[] = [];
  // lifelines first, the full height, so the camera never has to move as messages appear
  for (const p of participants) {
    nodes.push(path({ id: `${id}:life:${p.id}`, points: [[X(p.id), lifeTop(p)], [X(p.id), bottom]], role: 'lifeline', dashed: true }));
  }
  // activation bars that have started by now; open ones stop at the current row
  acts.forEach((a, k) => {
    if (a.start > upTo) return;
    const y0 = rowY(a.start) - 6, end = Math.min(a.end, upTo);
    const y1 = a.start === a.end ? rowY(a.start) + row * 0.45 : rowY(end) + 6;
    nodes.push(rect({ id: `${id}:act:${k}`, x: barX(a.participant, a.depth), y: (y0 + y1) / 2, w: BAR, h: y1 - y0, rx: 2, role: 'activation', enter: { h: 0, y: y0 } }));
  });
  // messages revealed so far
  messages.forEach((m, i) => {
    if (i > upTo) return;
    const kind = m.kind ?? 'call';
    const y = rowY(i);
    const tone = i === upTo ? (o.tone ?? 'active') : undefined;
    const label = o.numbered ? `${i + 1}. ${m.label}` : m.label;
    const k = `${id}:msg:${i}`;
    const style = kind === 'call' ? { end: 'arrow' as const } : { end: 'open' as const, dashed: kind === 'return' };
    if (m.from === m.to) {
      // self-call: out to the right, down a little, back into the nested bar
      const d = depthAt(m.from, i);
      const x0 = barX(m.from, Math.max(0, d - 1)) + BAR / 2, x1 = barX(m.from, d) + BAR / 2;
      nodes.push(...connector({ id: k, from: { x: x0, y: y - 8 }, via: [{ x: x0 + 34, y: y - 8 }, { x: x0 + 34, y: y + 8 }], to: { x: x1, y: y + 8 }, ...style, tone }).nodes);
      nodes.push(text({ id: `${k}:label`, x: x0 + 42, y: y - 8, text: label, size: 12, role: 'message', anchor: 'start', tone }));
      return;
    }
    const dir = Math.sign(X(m.to) - X(m.from));
    // start and end at the edge of the bars (if any), not the dashed lifeline
    const edge = (p: string, side: number) => {
      const d = depthAt(p, i);
      return d < 0 ? X(p) : barX(p, d) + (side * BAR) / 2;
    };
    const x0 = edge(m.from, dir), x1 = edge(m.to, -dir);
    nodes.push(...connector({ id: k, from: { x: x0, y }, to: { x: x1, y }, ...style, tone }).nodes);
    nodes.push(text({ id: `${k}:label`, x: (x0 + x1) / 2, y: y - 10, text: label, size: 12, role: 'message', tone }));
  });
  // participant heads last, on top of the lifelines
  for (const p of participants) {
    const x = X(p.id), k = `${id}:head:${p.id}`;
    if (p.kind === 'actor') {
      // a stick figure: head, body, arms, legs
      nodes.push(
        circle({ id: `${k}:head`, x, y: -10, r: 7, role: 'figure' }),
        path({ id: `${k}:body`, points: [[x, -3], [x, 12]], role: 'figure-line' }),
        path({ id: `${k}:arms`, points: [[x - 10, 3], [x + 10, 3]], role: 'figure-line' }),
        path({ id: `${k}:legs`, points: [[x - 8, 24], [x, 12], [x + 8, 24]], role: 'figure-line' }),
        text({ id: `${k}:label`, x, y: 36, text: p.label, size: 12, role: 'value' }),
      );
    } else {
      const w = Math.max(84, estimateTextWidth(p.label, 13) + 22);
      nodes.push(
        rect({ id: `${k}:box`, x, y: 0, w, h: HEAD, rx: 6, role: 'card' }),
        text({ id: `${k}:label`, x, y: 0, text: p.label, size: 13, role: 'value' }),
      );
    }
  }
  return { nodes, x: X, rowY };
}
