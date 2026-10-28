// Two Sum with a hash map: for each value, look for its complement among the
// values already seen, then remember this one. The map's rows are keyed by
// value, so each new entry drops in as its own row.
import { useMemo, useState } from 'react';
import { combine, fitViewBox, translate } from 'dsviz';
import { array, hashMap } from 'dsviz/ds';
import { Diagram, NumberStepper, Transport, usePlayer } from 'dsviz/react';

const nums = [3, 8, 1, 6, 4, 9];

function* twoSum(target: number) {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const want = target - nums[i];
    yield { i, seen: new Map(seen), want, hit: seen.has(want), msg: `nums[${i}] = ${nums[i]} needs ${want}. ${seen.has(want) ? `Seen at index ${seen.get(want)}: done.` : 'Not seen yet.'}` };
    if (seen.has(want)) return;
    seen.set(nums[i], i);
  }
  yield { i: -1, seen, want: NaN, hit: false, msg: 'No pair adds up to the target.' };
}

type Frame = { i: number; seen: Map<number, number>; want: number; hit: boolean };
const draw = (f: Frame) =>
  combine(
    array(nums, { cell: 40, tones: (i) => (i === f.i ? (f.hit ? 'success' : 'active') : undefined) }),
    translate(hashMap(f.seen, { title: 'seen: value → index', tones: (k) => (f.hit && k === f.want ? 'success' : k === f.want ? 'muted' : undefined) }), 300, -20),
  );

export default function HashMap() {
  const [target, setTarget] = useState(10);
  const player = usePlayer(() => twoSum(target), [target], { interval: 1100 });
  const f = player.frame!;
  const viewBox = useMemo(() => fitViewBox(player.frames.map(draw)), [player.frames]);
  return (
    <>
      <NumberStepper label="Target" value={target} onChange={setTarget} min={2} max={18} />
      <Diagram scene={draw(f)} viewBox={viewBox} />
      <p className="status">{f.msg}</p>
      <Transport player={player} />
    </>
  );
}
