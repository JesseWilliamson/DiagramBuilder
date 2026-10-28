// An order, step by step, in three swimlanes. The walk is data: each step says which
// node is current and which flows have been taken, and the diagram just highlights them.
// Switch "In stock" off to take the other branch of the decision.
import { useMemo, useState } from 'react';
import { fitViewBox } from 'dsviz';
import { Diagram, Switch, Transport, usePlayer } from 'dsviz/react';
import { activity, ActivityFlow, ActivityNode } from 'dsviz/uml';

const lanes = [{ id: 'cust', name: 'Customer' }, { id: 'shop', name: 'Shop' }, { id: 'wh', name: 'Warehouse' }];

const nodes: ActivityNode[] = [
  { id: 'start', kind: 'start', lane: 'cust' },
  { id: 'place', label: 'Place order', lane: 'cust' },
  { id: 'check', label: 'Check stock', lane: 'shop' },
  { id: 'dec', kind: 'decision', lane: 'shop' },
  { id: 'fork', kind: 'fork' },
  { id: 'charge', label: 'Charge card', lane: 'shop' },
  { id: 'pick', label: 'Pick items', lane: 'wh' },
  { id: 'join', kind: 'join' },
  { id: 'ship', label: 'Ship parcel', lane: 'wh' },
  { id: 'recv', label: 'Receive parcel', lane: 'cust' },
  { id: 'end', kind: 'end', lane: 'cust' },
  { id: 'sorry', label: 'Say sorry', lane: 'cust' },
  { id: 'stop', kind: 'flowFinal', lane: 'cust' },
];

// The flows, in the order the indices below refer to them.
const flows: ActivityFlow[] = [
  { from: 'start', to: 'place' }, //          0
  { from: 'place', to: 'check' }, //          1
  { from: 'check', to: 'dec' }, //            2
  { from: 'dec', to: 'fork', guard: 'in stock' }, // 3
  { from: 'dec', to: 'sorry', guard: 'sold out' }, // 4
  { from: 'fork', to: 'charge' }, //          5
  { from: 'fork', to: 'pick' }, //            6
  { from: 'charge', to: 'join' }, //          7
  { from: 'pick', to: 'join' }, //            8
  { from: 'join', to: 'ship' }, //            9
  { from: 'ship', to: 'recv' }, //            10
  { from: 'recv', to: 'end' }, //             11
  { from: 'sorry', to: 'stop' }, //           12
];

interface Step { current: ReadonlySet<string>; taken: ReadonlySet<number>; say: string }

function* walk(inStock: boolean): Generator<Step> {
  const taken = new Set<number>();
  const at = (say: string, ...ids: string[]): Step => ({ current: new Set(ids), taken: new Set(taken), say });
  yield at('The customer starts an order.', 'start');
  taken.add(0); yield at('They place it.', 'place');
  taken.add(1); yield at('The shop checks the stock.', 'check');
  taken.add(2); yield at('A decision: only the flow whose guard is true is taken.', 'dec');
  if (!inStock) {
    taken.add(4); yield at('Sold out: say sorry.', 'sorry');
    taken.add(12); yield at('A flow final ends this flow only, not the whole activity.', 'stop');
    return;
  }
  taken.add(3); yield at('In stock: a fork splits the work into two parallel flows.', 'fork');
  taken.add(5).add(6); yield at('The card is charged while the items are picked, at the same time.', 'charge', 'pick');
  taken.add(7).add(8); yield at('A join waits for both flows before going on.', 'join');
  taken.add(9); yield at('The parcel is shipped.', 'ship');
  taken.add(10); yield at('The customer receives it.', 'recv');
  taken.add(11); yield at('The activity ends.', 'end');
}

export default function Activity() {
  const [inStock, setInStock] = useState(true);
  const player = usePlayer(() => walk(inStock), [inStock], { interval: 900 });
  const f = player.frame!;
  const draw = (s?: Step) => activity(nodes, flows, { swimlanes: lanes, current: s?.current, taken: s?.taken });
  // the layout never changes between steps, so one camera fits them all
  const viewBox = useMemo(() => fitViewBox(draw(), 12), []);
  return (
    <>
      <Diagram scene={draw(f)} viewBox={viewBox} />
      <p className="status">{f.say}</p>
      <div className="row"><Switch label="In stock" checked={inStock} onChange={setInStock} /></div>
      <Transport player={player} />
    </>
  );
}
