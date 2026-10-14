import { useMemo, useState } from 'react';
import { array, combine, pointer } from '../src';
import { CodeTrace, Diagram, NumberStepper, Transport, usePlayer } from '../src/react';

const NUMS = [-9, -4, -1, 0, 3, 5, 8, 9, 12, 17, 21, 30];

export const CODE = [
  'while lo <= hi:',
  '    mid = lo + (hi - lo) // 2',
  '    if nums[mid] == target: return mid',
  '    elif nums[mid] < target: lo = mid + 1',
  '    else:                    hi = mid - 1',
  'return -1',
];

interface Frame {
  lo: number;
  hi: number;
  mid: number | null;
  line: number;
  found: boolean;
  text: string;
}

/**
 * The algorithm as a generator. Each `yield` is one step of the transport bar,
 * and carries `line` so the code panel can follow along. Note we yield fresh
 * objects (numbers are copied by value), never a shared mutable one.
 */
export function* binarySearch(nums: readonly number[], target: number): Generator<Frame> {
  let lo = 0, hi = nums.length - 1;
  yield { lo, hi, mid: null, line: 0, found: false, text: `Looking for ${target} in ${nums.length} sorted values.` };
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    yield { lo, hi, mid, line: 1, found: false, text: `Middle of ${lo}..${hi} is index ${mid}, value ${nums[mid]}.` };
    if (nums[mid] === target) {
      yield { lo, hi, mid, line: 2, found: true, text: `${nums[mid]} is the target. Found at index ${mid}.` };
      return;
    }
    if (nums[mid] < target) {
      yield { lo, hi, mid, line: 3, found: false, text: `${nums[mid]} < ${target}: everything at or left of ${mid} is too small.` };
      lo = mid + 1;
    } else {
      yield { lo, hi, mid, line: 4, found: false, text: `${nums[mid]} > ${target}: everything at or right of ${mid} is too big.` };
      hi = mid - 1;
    }
    yield { lo, hi, mid: null, line: 0, found: false, text: lo <= hi ? `Interval is now ${lo}..${hi}.` : 'The interval is empty.' };
  }
  yield { lo, hi, mid: null, line: 5, found: false, text: `${target} is not in the array: return -1.` };
}

export function BinarySearch() {
  const [target, setTarget] = useState(9);
  const p = usePlayer(() => binarySearch(NUMS, target), [target]);
  const f = p.frame;

  const scene = useMemo(() => {
    if (!f) return { nodes: [] };
    const arr = array(NUMS, {
      cell: 34,
      gap: 10,
      // outside the live interval = ruled out (muted); mid = active; found = success
      tones: (i) => (f.found && i === f.mid ? 'success' : i === f.mid ? 'active' : i < f.lo || i > f.hi ? 'muted' : undefined),
    });
    const below = (i: number) => ({ x: arr.center(i).x, y: arr.bottom(i).y + 18 });
    return combine(
      arr,
      f.lo <= f.hi && pointer({ id: 'lo', at: below(Math.min(f.lo, NUMS.length - 1)), label: 'lo', side: 'bottom', length: 12, tone: 'accent' }),
      f.lo <= f.hi && pointer({ id: 'hi', at: below(Math.max(f.hi, 0)), label: 'hi', side: 'bottom', length: 12, tone: 'accent', level: f.lo === f.hi ? 1 : 0 }),
      f.mid !== null && pointer({ id: 'mid', at: arr.top(f.mid), label: 'mid', side: 'top', length: 14, tone: f.found ? 'success' : 'active' }),
    );
  }, [f]);

  return (
    <div className="card">
      <NumberStepper label="Target" value={target} onChange={setTarget} min={-20} max={40} />
      <Diagram scene={scene} height={130} label="Binary search over a sorted array" />
      <p className="status">{f?.text}</p>
      <CodeTrace lines={CODE} active={f?.line} />
      <Transport {...p} onFirst={p.first} onPrev={p.prev} onToggle={p.toggle} onNext={p.next} onSeek={p.seek} />
    </div>
  );
}
