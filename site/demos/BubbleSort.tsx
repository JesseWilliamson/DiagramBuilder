// Keys decide what moves. Turn "stable keys" off and the numbers change in place instead.
import { useState } from 'react';
import { array, combine, pointer } from 'dsviz';
import { Button, Diagram, Switch, Transport, usePlayer } from 'dsviz/react';

type Item = { value: number; key: string };

function* bubbleSort(input: number[]) {
  // Carry each value's identity with it.
  const items: Item[] = input.map((value, i) => ({ value, key: `k${i}` }));
  for (let end = items.length - 1; end > 0; end--) {
    for (let j = 0; j < end; j++) {
      yield { items: [...items], j, end, swap: false }; // copy! the player keeps every frame
      if (items[j].value > items[j + 1].value) {
        [items[j], items[j + 1]] = [items[j + 1], items[j]];
        yield { items: [...items], j, end, swap: true };
      }
    }
  }
  yield { items: [...items], j: -1, end: 0, swap: false };
}

const random = () => Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 49));

export default function BubbleSort() {
  const [input, setInput] = useState([29, 10, 14, 37, 13, 5, 22, 41]);
  const [useKeys, setUseKeys] = useState(true);
  const player = usePlayer(() => bubbleSort(input), [input], { interval: 450 });
  const f = player.frame!;

  const arr = array(f.items.map((it) => it.value), {
    cell: 40,
    keys: useKeys ? f.items.map((it) => it.key) : undefined,
    tones: (i) =>
      f.j < 0 || i > f.end ? 'success' : i === f.j || i === f.j + 1 ? (f.swap ? 'danger' : 'active') : undefined,
  });
  const scene = combine(arr, f.j >= 0 && pointer({ id: 'j', at: arr.top(f.j), label: 'j', tone: 'active', length: 14 }));

  return (
    <>
      <Diagram scene={scene} height={140} />
      <p className="status">
        {f.j < 0 ? 'Sorted.' : f.swap ? `Swapped a[${f.j}] and a[${f.j + 1}].` : `Compare a[${f.j}] and a[${f.j + 1}].`}
      </p>
      <Transport player={player} />
      <div className="row">
        <Switch label="Stable keys" checked={useKeys} onChange={setUseKeys} />
        <Button onClick={() => setInput(random())}>Shuffle</Button>
      </div>
    </>
  );
}
