// A checkout with two outcomes. An alt fragment with sections draws one box
// with a dashed divider and a guard per branch; the failure path is toned
// 'danger' message by message; notes take a row of their own. Turn off the
// activation bars for a lighter, overview-style diagram.
import { useState } from 'react';
import { fitViewBox } from '@figurae/core';
import { Diagram, Switch } from '@figurae/react';
import { Fragment, Message, Note, Participant, sequence } from '@figurae/uml';

const people: Participant[] = [
  { id: 'user', label: 'Shopper', kind: 'actor' },
  { id: 'web', label: 'Web app' },
  { id: 'pay', label: 'Payments' },
  { id: 'bank', label: 'Card network' },
];
const messages: Message[] = [
  { from: 'user', to: 'web', label: 'Pay £42' },
  { from: 'web', to: 'pay', label: 'charge(order, card)' },
  { from: 'pay', to: 'bank', label: 'authorise' },
  { from: 'bank', to: 'pay', label: 'approved', kind: 'return', tone: 'success' },
  { from: 'pay', to: 'web', label: 'receipt', kind: 'return', tone: 'success' },
  { from: 'bank', to: 'pay', label: 'declined', kind: 'return', tone: 'danger' },
  { from: 'pay', to: 'web', label: '402 card declined', kind: 'return', tone: 'danger' },
  { from: 'web', to: 'user', label: 'show result', kind: 'return' },
];
const fragments: Fragment[] = [
  { kind: 'alt', from: 3, to: 6, over: ['web', 'bank'], sections: [{ label: 'approved', from: 3, to: 4 }, { label: 'else', from: 5, to: 6 }] },
];
const notes: Note[] = [
  { over: 'pay', text: 'idempotency key = order id:\na retry never charges twice', at: 2 },
];

export default function Checkout() {
  const [bars, setBars] = useState(true);
  const scene = sequence(people, messages, { fragments, notes, activations: bars, highlight: false, gap: 160 });
  return (
    <>
      <Diagram scene={scene} viewBox={fitViewBox(scene, 24)} />
      <div className="row">
        <Switch label="Activation bars" checked={bars} onChange={setBars} />
      </div>
    </>
  );
}
