/**
 * Stacks and queues are just arrays with opinions about where things come
 * from and go to. Both are thin wrappers around array() that set
 * enter/exit offsets, so pushes drop in and pops/dequeues slide away.
 *
 * Remember to pass stable `keys` — otherwise popping the top looks like
 * "the last cell faded out", which happens to be right for a stack but is
 * wrong for a queue (dequeue removes index 0, and every key shifts).
 */
import { V2 } from '@dsviz/core';
import { ArrayDiagram, ArrayOptions, array } from './array';
import { resolveTone } from './common';

/** Bottom of the stack is index 0, drawn at the bottom. */
export function stack<T>(values: readonly T[], o: ArrayOptions<T> = {}): ArrayDiagram {
  const cell = o.cell ?? 44;
  const gap = o.gap ?? 4;
  // Draw top-to-bottom reversed so index 0 is at the bottom; y is the stack's BOTTOM edge.
  const n = values.length;
  const reversed = [...values].reverse();
  const keys = (o.keys ?? values.map((_, i) => i)).slice().reverse();
  const bottomY = o.y ?? 0;
  const d = array(reversed, {
    showIndices: false,
    ...o,
    id: o.id ?? 'stack',
    cell,
    gap,
    keys,
    vertical: true,
    y: bottomY - n * (cell + gap) + gap,
    tones: o.tones ? (i, v) => resolveTone(o.tones, n - 1 - i, v) : undefined,
    enterOffset: V2(0, -cell * 1.5),
    exitOffset: V2(0, -cell * 1.5),
  });
  // Re-index helpers so stack.center(0) is the bottom element.
  const flip = (i: number) => n - 1 - i;
  return {
    ...d,
    center: (i) => d.center(flip(i)),
    top: (i) => d.top(flip(i)),
    bottom: (i) => d.bottom(flip(i)),
    left: (i) => d.left(flip(i)),
    right: (i) => d.right(flip(i)),
  };
}

/** Front of the queue is index 0, on the left. Enqueue enters right, dequeue exits left. */
export function queue<T>(values: readonly T[], o: ArrayOptions<T> = {}): ArrayDiagram {
  const cell = o.cell ?? 44;
  return array(values, {
    showIndices: false,
    ...o,
    id: o.id ?? 'queue',
    cell,
    enterOffset: V2(cell * 1.5, 0),
    exitOffset: V2(-cell * 1.5, 0),
  });
}
