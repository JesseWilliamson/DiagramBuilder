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
 *
 * Combined fragments box a run of messages with an operator in a tag at the
 * top-left: `loop` (repeated), `alt` (one of several), `opt` (maybe not at
 * all), or any word you like. A fragment grows with `upTo`, so a loop that is
 * still going is drawn open-ended down to the current message. An `alt` with
 * `sections` gets a dashed divider and a guard per branch ("[else]").
 *
 * Notes are yellow cards over one lifeline or across several. Each takes a row
 * of its own, so rows are "slots": a slot is a message or a note, and the
 * y of everything comes from adding up the slots above it.
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
  /** Colour this message (an error path, the interesting call). The step highlight still wins. */
  tone?: Tone;
}

/** A note card. It sits in its own row, just before message `at` (messages.length = after the last). */
export interface Note {
  /** One participant, or the first and last of a run of them. */
  over: string | readonly [string, string];
  /** May contain line breaks. */
  text: string;
  at: number;
  tone?: Tone;
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
 *
 * Branches of an alt are alternatives, not a sequence: only one of them
 * happens. So each later branch starts from the stacks as they were when the
 * first branch began (pass the fragments to get that), and a bar closed in
 * one branch can close again in the next.
 */
export function activations(messages: readonly Message[], fragments: readonly Fragment[] = []): Activation[] {
  const out: Activation[] = [];
  let stacks = new Map<string, Activation[]>();
  const stack = (p: string) => stacks.get(p) ?? (stacks.set(p, []), stacks.get(p)!);
  const copy = (m: Map<string, Activation[]>) => new Map([...m].map(([k, v]) => [k, [...v]]));
  // row → the snapshot to restore there; first-section row → where to save one
  const saveAt = new Map<number, Fragment[]>();
  const restoreAt = new Map<number, Fragment>();
  for (const f of fragments) {
    if (!f.sections || f.sections.length < 2) continue;
    (saveAt.get(f.sections[0].from) ?? saveAt.set(f.sections[0].from, []).get(f.sections[0].from)!).push(f);
    for (const s of f.sections.slice(1)) restoreAt.set(s.from, f);
  }
  const saved = new Map<Fragment, Map<string, Activation[]>>();
  messages.forEach((m, i) => {
    const r = restoreAt.get(i);
    if (r && saved.has(r)) stacks = copy(saved.get(r)!);
    for (const f of saveAt.get(i) ?? []) saved.set(f, copy(stacks));
    const kind = m.kind ?? 'call';
    if (kind === 'call') {
      const s = stack(m.to);
      const a: Activation = { participant: m.to, depth: s.length, start: i, end: i };
      out.push(a);
      if (m.from === m.to) return; // a self-call is drawn as a one-row nested bar
      s.push(a);
    } else if (kind === 'return') {
      const a = stack(m.from).pop();
      if (a) a.end = Math.max(a.end, i);
    }
  });
  for (const s of stacks.values()) for (const a of s) a.end = Math.max(a.end, messages.length - 1);
  return out;
}

export interface Fragment {
  /** The operator in the tag: 'loop', 'alt', 'opt', 'par'… */
  kind: string;
  /** The guard, drawn in brackets beside the tag: "until RUNNING". */
  label?: string;
  /** First and last message rows inside it (inclusive). */
  from: number;
  to: number;
  /** The leftmost and rightmost participants it spans. Default: all of them. */
  over?: readonly [string, string];
  /**
   * Branches of an `alt` (or `par`): each from its first message to its last.
   * The first one's label is the fragment's guard (unless `label` is set);
   * every later one starts with a dashed divider and its own guard, e.g. [else].
   */
  sections?: readonly FragmentSection[];
}

export interface FragmentSection {
  label: string;
  from: number;
  to: number;
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
  /** Boxes around runs of messages: loops, alternatives, options. */
  fragments?: readonly Fragment[];
  /** Note cards, each in its own row. */
  notes?: readonly Note[];
  /** Draw activation bars (derived from calls and returns). Default true. */
  activations?: boolean;
  /** Tone the message at `upTo` (the current step). Default true; turn off for a static diagram. */
  highlight?: boolean;
}

export interface SequenceDiagram extends Scene {
  /** x of a participant's lifeline. */
  x(id: string): number;
  /** y of message row i. */
  rowY(i: number): number;
}

const HEAD = 34, BAR = 10, NOTE_LINE = 15;

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
  // Slots, top to bottom: the notes before message i, then message i.
  const notes = (o.notes ?? []).map((n, k) => ({ ...n, k, at: Math.max(0, Math.min(messages.length, n.at)), lines: n.text.split('\n') }));
  const noteH = (n: { lines: string[] }) => n.lines.length * NOTE_LINE + 12;
  const msgTop: number[] = [];
  const noteTop = new Map<number, number>();
  let y = top;
  for (let i = 0; i <= messages.length; i++) {
    for (const n of notes) if (n.at === i) (noteTop.set(n.k, y), (y += noteH(n) + 14));
    if (i < messages.length) (msgTop.push(y), (y += row));
  }
  const rowY = (i: number) => (i < 0 ? top - row / 2 : i < msgTop.length ? msgTop[i] : y) + row / 2;
  const bottom = y + 8;
  const acts = o.activations === false ? [] : activations(messages, o.fragments);
  // depth of the innermost bar on lifeline p during row i (-1 = none)
  const depthAt = (p: string, i: number) => Math.max(-1, ...acts.filter((a) => a.participant === p && a.start <= i && i <= a.end).map((a) => a.depth));
  const barX = (p: string, depth: number) => X(p) + depth * (BAR * 0.6);
  const nodes: SceneNode[] = [];
  // lifelines first, the full height, so the camera never has to move as messages appear
  for (const p of participants) {
    nodes.push(path({ id: `${id}:life:${p.id}`, points: [[X(p.id), lifeTop(p)], [X(p.id), bottom]], role: 'lifeline', dashed: true }));
  }
  // fragments: the frame goes under the bars and messages, its tag and guard on
  // top of them (they sit across a lifeline); a fragment inside another is inset
  const frags = o.fragments ?? [];
  const fragmentLabels: SceneNode[] = [];
  frags.forEach((f, k) => {
    if (f.from > upTo) return;
    const depth = frags.filter((g) => g !== f && g.from <= f.from && f.to <= g.to).length;
    const [a, b] = f.over ?? [participants[0]?.id ?? '', participants[participants.length - 1]?.id ?? ''];
    const pad = gap * 0.42 - depth * 10;
    const x0 = Math.min(X(a), X(b)) - pad, x1 = Math.max(X(a), X(b)) + pad;
    // the tag strip sits above the first message's label, which is drawn 10px over its arrow
    const y0 = rowY(f.from) - row / 2 - 14 + depth * 6, y1 = rowY(Math.min(f.to, upTo)) + row / 2 - depth * 6;
    const fk = `${id}:frag:${k}`;
    const tagW = estimateTextWidth(f.kind, 11) + 16;
    nodes.push(rect({ id: fk, x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0, rx: 3, role: 'fragment', enter: { h: 0, y: y0 } }));
    fragmentLabels.push(
      path({ id: `${fk}:tag`, points: [[x0, y0], [x0 + tagW, y0], [x0 + tagW, y0 + 11], [x0 + tagW - 6, y0 + 17], [x0, y0 + 17]], closed: true, role: 'fragment-tag' }),
      text({ id: `${fk}:kind`, x: x0 + 6, y: y0 + 9, text: f.kind, size: 11, anchor: 'start', role: 'fragment-kind' }),
    );
    // a guard gets a backing box, so a lifeline or bar running under it does not cut through it
    const guard = (k: string, label: string, x: number, gy: number) => {
      const g = `[${label}]`, gw = estimateTextWidth(g, 11) + 6;
      fragmentLabels.push(
        rect({ id: `${k}:bg`, x: x + gw / 2 - 3, y: gy, w: gw, h: 14, rx: 2, role: 'fragment-guard-bg' }),
        text({ id: k, x, y: gy, text: g, size: 11, anchor: 'start', role: 'fragment-guard' }),
      );
    };
    const first = f.label ?? f.sections?.[0]?.label;
    if (first) guard(`${fk}:label`, first, x0 + tagW + 8, y0 + 9);
    // later branches of an alt: a dashed divider across the box, the guard just under it
    f.sections?.slice(1).forEach((sec, j) => {
      if (sec.from > upTo || sec.from <= f.from) return;
      const dy = rowY(sec.from) - row / 2 - 4;
      nodes.push(path({ id: `${fk}:div:${j}`, points: [[x0, dy], [x1, dy]], role: 'fragment-divider', dashed: true }));
      guard(`${fk}:sec:${j}`, sec.label, x0 + 8, dy + 10);
    });
  });
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
    const tone = i === upTo && o.highlight !== false ? (o.tone ?? 'active') : m.tone;
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
  // notes over the messages (a note spanning lifelines sits on top of them)
  for (const n of notes) {
    if (n.at > upTo && upTo < messages.length - 1) continue;
    const [a, b] = typeof n.over === 'string' ? [n.over, n.over] : n.over;
    const textW = Math.max(...n.lines.map((l) => estimateTextWidth(l, 12))) + 20;
    const l0 = Math.min(X(a), X(b)), l1 = Math.max(X(a), X(b));
    const w = Math.max(textW, l1 - l0 + (l1 > l0 ? 60 : 0), 70);
    const cx = (l0 + l1) / 2, h = noteH(n), t = noteTop.get(n.k)! + 7;
    const L = cx - w / 2, R = cx + w / 2, B = t + h, d = 9;
    const nk = `${id}:note:${n.k}`;
    nodes.push(path({ id: nk, points: [[L, t], [R - d, t], [R, t + d], [R, B], [L, B]], closed: true, role: 'note', tone: n.tone, enter: {} }));
    n.lines.forEach((line, j) =>
      nodes.push(text({ id: `${nk}:line:${j}`, x: L + 10, y: t + 6 + NOTE_LINE / 2 + j * NOTE_LINE, text: line, size: 12, anchor: 'start', role: 'note-text', tone: n.tone })),
    );
  }
  nodes.push(...fragmentLabels);
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
