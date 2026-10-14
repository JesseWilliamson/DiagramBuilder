// Names, objects and aliasing, Python-Tutor style. `b = a` doesn't copy the list:
// it draws a second arrow to the same object. Step through and watch what changes.
import { mem } from 'dsviz';
import { CodeTrace, Diagram, Transport, usePlayer } from 'dsviz/react';

const code = [
  'a = [1, 2]',
  'b = a',
  'b.append(3)',
  'c = list(a)',
  'c[0] = 99',
  'def grow(xs):',
  '    xs.append(4)',
  'grow(c)',
  'print(a, c)',
];

type Step = { line: number; frames: mem.StackFrame[]; heap: mem.HeapObject[]; tones?: Record<string, 'active' | 'success'>; note: string };
const ref = (id: string) => ({ ref: id });
const fn = { id: 'fn', kind: 'function grow', items: [] };

const steps: Step[] = [
  { line: 0, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2] }], tones: { 'Global.a': 'success', L1: 'success' }, note: 'A list object is created, and the name a points to it.' },
  { line: 1, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }, { name: 'b', value: ref('L1') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2] }], tones: { 'Global.b': 'success' }, note: 'b = a copies the ARROW, not the list. Two names, one object.' },
  { line: 2, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }, { name: 'b', value: ref('L1') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }], tones: { L1: 'active' }, note: 'Appending through b changes the one list, so a sees it too.' },
  { line: 3, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }, { name: 'b', value: ref('L1') }, { name: 'c', value: ref('L2') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [1, 2, 3] }], tones: { 'Global.c': 'success', L2: 'success' }, note: 'list(a) builds a NEW list with the same items. c points there.' },
  { line: 4, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }, { name: 'b', value: ref('L1') }, { name: 'c', value: ref('L2') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3] }], tones: { L2: 'active' }, note: 'Changing the copy leaves the original alone.' },
  { line: 5, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }, { name: 'b', value: ref('L1') }, { name: 'c', value: ref('L2') }, { name: 'grow', value: ref('fn') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3] }, fn], tones: { 'Global.grow': 'success', fn: 'success' }, note: 'def makes a function object and binds the name grow to it.' },
  { line: 7, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }, { name: 'b', value: ref('L1') }, { name: 'c', value: ref('L2') }, { name: 'grow', value: ref('fn') }] }, { name: 'grow', vars: [{ name: 'xs', value: ref('L2') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3] }, fn], tones: { 'grow.xs': 'success' }, note: 'Calling grow(c) makes a new frame. The parameter xs is another arrow to c\'s list.' },
  { line: 6, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }, { name: 'b', value: ref('L1') }, { name: 'c', value: ref('L2') }, { name: 'grow', value: ref('fn') }] }, { name: 'grow', vars: [{ name: 'xs', value: ref('L2') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3, 4] }, fn], tones: { L2: 'active' }, note: 'So appending to xs changes the caller\'s list.' },
  { line: 7, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }, { name: 'b', value: ref('L1') }, { name: 'c', value: ref('L2') }, { name: 'grow', value: ref('fn') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3, 4] }, fn], note: 'The call returns and its frame disappears. The list it changed stays.' },
  { line: 8, frames: [{ name: 'Global', vars: [{ name: 'a', value: ref('L1') }, { name: 'b', value: ref('L1') }, { name: 'c', value: ref('L2') }, { name: 'grow', value: ref('fn') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3, 4] }, fn], note: 'Output: [1, 2, 3] [99, 2, 3, 4]' },
];

// Fixed heap positions, so an object never jumps when another is added.
const positions = { L1: { x: 0, y: 20 }, L2: { x: 0, y: 92 }, fn: { x: 0, y: 164 } };

export default function PythonMemory() {
  const player = usePlayer(() => steps, [], { interval: 1400 });
  const s = player.frame!;
  return (
    <>
      <Diagram scene={mem.stackHeap(s.frames, s.heap, { tones: s.tones, positions, frameWidth: 150, heapX: 270 })} />
      <p className="status">{s.note}</p>
      <CodeTrace lines={code} active={s.line} />
      <Transport player={player} />
    </>
  );
}
