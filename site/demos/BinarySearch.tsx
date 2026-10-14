// The algorithm is a generator: each `yield` is one step of the transport bar.
import { useMemo, useState } from 'react';
import { array, combine, pointer } from 'dsviz';
import { CodeTrace, Diagram, NumberStepper, Transport, usePlayer } from 'dsviz/react';

const nums = [-9, -4, -1, 0, 3, 5, 8, 9, 12, 17, 21, 30];

const code = [
  'lo, hi = 0, len(nums) - 1',
  'while lo <= hi:',
  '    mid = lo + (hi - lo) // 2',
  '    if nums[mid] == target: return mid',
  '    if nums[mid] < target: lo = mid + 1',
  '    else:                  hi = mid - 1',
  'return -1',
];

function* binarySearch(a: number[], target: number) {
  let lo = 0, hi = a.length - 1;
  yield { lo, hi, mid: -1, line: 0, found: false, msg: `Looking for ${target} in ${a.length} sorted values.` };
  while (lo <= hi) {
    yield { lo, hi, mid: -1, line: 1, found: false, msg: `The answer, if it exists, is somewhere in ${lo}..${hi}.` };
    const mid = lo + Math.floor((hi - lo) / 2);
    yield { lo, hi, mid, line: 2, found: false, msg: `Look in the middle: nums[${mid}] = ${a[mid]}.` };
    if (a[mid] === target) {
      yield { lo, hi, mid, line: 3, found: true, msg: `${a[mid]} is the target: return ${mid}.` };
      return;
    }
    if (a[mid] < target) {
      yield { lo, hi, mid, line: 4, found: false, msg: `${a[mid]} < ${target}, so everything up to index ${mid} is too small.` };
      lo = mid + 1;
    } else {
      yield { lo, hi, mid, line: 5, found: false, msg: `${a[mid]} > ${target}, so everything from index ${mid} on is too big.` };
      hi = mid - 1;
    }
  }
  yield { lo, hi, mid: -1, line: 6, found: false, msg: `lo > hi: the interval is empty, ${target} isn't here.` };
}

export default function BinarySearch() {
  const [target, setTarget] = useState(9);
  const player = usePlayer(() => binarySearch(nums, target), [target], { interval: 800 });
  const f = player.frame!;

  const scene = useMemo(() => {
    const arr = array(nums, {
      cell: 36,
      gap: 8,
      // ruled out = muted, mid = active (or success when found)
      tones: (i) => (i === f.mid ? (f.found ? 'success' : 'active') : i < f.lo || i > f.hi ? 'muted' : undefined),
    });
    const under = (i: number) => ({ x: arr.center(i).x, y: arr.bottom(i).y + 20 });
    const live = f.lo <= f.hi;
    return combine(
      live && arr.window(f.lo, f.hi), // drawn first = underneath the cells
      arr,
      f.mid >= 0 && pointer({ id: 'mid', at: arr.top(f.mid), label: 'mid', tone: f.found ? 'success' : 'active', length: 16 }),
      live && pointer({ id: 'lo', at: under(f.lo), label: 'lo', side: 'bottom', length: 12 }),
      live && pointer({ id: 'hi', at: under(f.hi), label: 'hi', side: 'bottom', length: 12, level: f.lo === f.hi ? 1 : 0 }),
    );
  }, [f]);

  return (
    <>
      <NumberStepper label="Target" value={target} onChange={setTarget} min={-15} max={35} />
      <Diagram scene={scene} height={150} />
      <p className="status">{f.msg}</p>
      <CodeTrace lines={code} active={f.line} />
      <Transport player={player} />
    </>
  );
}
