// Code inside the diagram: code.block draws numbered monospace lines and
// highlight bands, keyed by position, so stepping slides the band from line to
// line. Because it is part of the scene, an arrow can join a line of code to
// the thing it touches, and the whole figure exports as one SVG.
import { useMemo } from 'react';
import { array, code, combine, connector, fitViewBox, pointer, text } from 'dsviz';
import { Diagram, Transport, usePlayer } from 'dsviz/react';

const nums = [2, 5, 8, 12, 16, 23, 38, 56, 72];
const target = 23;
const source = `def find(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`;

type Frame = { lo: number; hi: number; mid: number; lines: [number, number]; msg: string };

function* run(): Generator<Frame> {
  let lo = 0, hi = nums.length - 1;
  yield { lo, hi, mid: -1, lines: [2, 2], msg: 'Start with the whole array.' };
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    yield { lo, hi, mid, lines: [4, 4], msg: `mid = ${mid}, nums[mid] = ${nums[mid]}` };
    if (nums[mid] === target) {
      yield { lo, hi, mid, lines: [5, 6], msg: `Found ${target} at index ${mid}` };
      return;
    }
    if (nums[mid] < target) {
      yield { lo, hi, mid, lines: [7, 8], msg: `${nums[mid]} < ${target}: go right` };
      lo = mid + 1;
    } else {
      yield { lo, hi, mid, lines: [9, 10], msg: `${nums[mid]} > ${target}: go left` };
      hi = mid - 1;
    }
  }
}

const block = code.block(source, { x: 0, y: 0 });
const draw = (f: Frame) => {
  const b = code.block(source, { highlight: [f.lines] });
  const arr = array(nums, { x: b.box.w + 60, y: 70, cell: 40, tones: (i) => (i === f.mid ? 'active' : i < f.lo || i > f.hi ? 'muted' : undefined) });
  return combine(
    b,
    arr,
    pointer({ id: 'lo', at: arr.bottom(Math.min(f.lo, nums.length - 1)), side: 'bottom', label: 'lo' }),
    pointer({ id: 'hi', at: arr.bottom(Math.max(f.hi, 0)), side: 'bottom', label: 'hi', level: f.hi === f.lo ? 1 : 0 }),
    f.mid >= 0 && connector({ id: 'link', from: b.right(f.lines[0]), to: arr.top(f.mid), end: 'arrow', dashed: true, tone: 'active', via: [{ x: b.box.w + 30, y: b.right(f.lines[0]).y }, { x: b.box.w + 30, y: 30 }, { x: arr.top(f.mid).x, y: 30 }] }),
    // the status line is a text node with a stable id: when its words change it crossfades
    text({ id: 'status', x: b.box.w + 60, y: 205, text: f.msg, size: 14, anchor: 'start', role: 'value' }),
  );
};

export default function CodeBlock() {
  const player = usePlayer(run, [], { interval: 1400 });
  const viewBox = useMemo(() => fitViewBox([block, ...player.frames.map(draw)], 16), [player.frames]);
  return (
    <>
      <Diagram scene={draw(player.frame ?? player.frames[0])} viewBox={viewBox} />
      <Transport player={player} />
    </>
  );
}
