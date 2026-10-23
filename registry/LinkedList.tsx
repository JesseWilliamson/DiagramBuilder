// Reversing a linked list. Each arrow's id is the node it LEAVES, so flipping
// `curr.next` swings that arrow round instead of replacing it.
import { combine, fitViewBox, text, V2 } from '@dsviz/core';
import { linkedList, listFromValues, ListNodeSpec, pointer } from '@dsviz/ds';
import { CodeTrace, Diagram, Transport, usePlayer } from '@dsviz/react';

const values = [4, 8, 15, 16];

const code = [
  'prev, curr = None, head',
  'while curr:',
  '    nxt = curr.next',
  '    curr.next = prev',
  '    prev, curr = curr, nxt',
  'return prev',
];

type Key = string | number | null;

function* reverse() {
  const nodes = listFromValues(values);
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const snap = (prev: Key, curr: Key, nxt: Key | undefined, line: number) => ({ nodes: nodes.map((n) => ({ ...n })), prev, curr, nxt, line });
  let prev: Key = null, curr: Key = nodes[0].key;
  yield snap(prev, curr, undefined, 0);
  while (curr !== null) {
    yield snap(prev, curr, undefined, 1);
    const nxt: Key = byKey.get(curr)!.next;
    yield snap(prev, curr, nxt, 2);
    byKey.get(curr)!.next = prev;
    yield snap(prev, curr, nxt, 3);
    prev = curr;
    curr = nxt;
    yield snap(prev, curr, undefined, 4);
  }
  yield snap(prev, null, undefined, 5);
}

type Frame = { nodes: ListNodeSpec[]; prev: Key; curr: Key; nxt: Key | undefined; line: number };

function draw(f: Frame) {
  // Pin the order: by default boxes follow `next`, which would shuffle them mid-reversal.
  const list = linkedList(f.nodes, {
    order: values.map((_, i) => `n${i}`),
    arrowTones: f.curr !== null ? { [String(f.curr)]: 'active' } : {},
  });
  // A pointer to null aims at an empty slot just past either end of the row.
  const at = (key: Key, side: 'top' | 'bottom', nullSlot: number) => {
    if (key !== null) return side === 'top' ? list.top(key) : list.bottom(key);
    const s = list.slot(nullSlot);
    return V2(s.x, side === 'top' ? s.y - 22 : s.y + 22);
  };
  const nullText = (id: string, slot: number, show: boolean) =>
    show && text({ id, x: list.slot(slot).x, y: list.slot(slot).y, text: 'None', size: 12, role: 'null' });

  return combine(
    list,
    nullText('null-left', -1, f.prev === null),
    nullText('null-right', values.length, f.curr === null || f.nxt === null),
    pointer({ id: 'prev', at: at(f.prev, 'top', -1), label: 'prev', tone: 'visited' }),
    pointer({ id: 'curr', at: at(f.curr, 'top', values.length), label: 'curr', tone: 'active' }),
    f.nxt !== undefined && pointer({ id: 'nxt', at: at(f.nxt, 'bottom', values.length), side: 'bottom', label: 'nxt', tone: 'accent' }),
  );
}

// Every frame is fixed, so the camera is too: fit it once, at module level.
const frames = [...reverse()] as Frame[];
const viewBox = fitViewBox(frames.map(draw));

export default function LinkedList() {
  const player = usePlayer(() => frames, [], { interval: 800 });
  const f = player.frame!;

  return (
    <>
      <Diagram scene={draw(f)} viewBox={viewBox} />
      <CodeTrace lines={code} active={f.line} />
      <Transport player={player} />
    </>
  );
}
