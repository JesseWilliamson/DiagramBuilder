// An order's lifecycle as a state machine. Only the events that are legal in the
// current state are enabled: that list IS the state machine.
import { useState } from 'react';
import { Button, Diagram } from '@figurae/react';
import { stateMachine, Transition, UmlState } from '@figurae/uml';

const states: UmlState[] = [
  { id: 'start', kind: 'initial', x: 0, y: 60 },
  { id: 'Pending', x: 120, y: 60 },
  { id: 'Paid', x: 320, y: 60 },
  { id: 'Shipped', x: 520, y: 60 },
  { id: 'Delivered', x: 520, y: 210 },
  { id: 'Cancelled', x: 120, y: 210 },
  { id: 'end', kind: 'final', x: 320, y: 300 },
];

const transitions: Transition[] = [
  { from: 'start', to: 'Pending' },
  { from: 'Pending', to: 'Pending', label: 'addItem' },
  { from: 'Pending', to: 'Paid', label: 'pay [in stock]' },
  { from: 'Paid', to: 'Shipped', label: 'ship' },
  { from: 'Shipped', to: 'Delivered', label: 'deliver' },
  { from: 'Pending', to: 'Cancelled', label: 'cancel' },
  { from: 'Paid', to: 'Cancelled', label: 'cancel / refund', bend: -30 },
  { from: 'Delivered', to: 'end', label: 'after 30 days' },
  { from: 'Cancelled', to: 'end', label: 'after 30 days' },
];

// A label reads `event [guard] / action`: the event is everything before the guard or action.
const eventOf = (t: Transition) => t.label?.split(/\s*[[/]/)[0] ?? '';
const events = [...new Set(transitions.map(eventOf).filter(Boolean))];

export default function StateMachine() {
  const [current, setCurrent] = useState('Pending');
  const [fired, setFired] = useState<number | undefined>(0);
  const [log, setLog] = useState<string[]>(['created → Pending']);

  const fire = (ev: string) => {
    const i = transitions.findIndex((t) => t.from === current && eventOf(t) === ev);
    if (i < 0) return;
    const t = transitions[i];
    setFired(i);
    setCurrent(t.to);
    setLog((l) => [...l.slice(-3), `${t.label}: ${t.from} → ${t.to === 'end' ? 'archived' : t.to}`]);
  };
  const legal = new Set(transitions.filter((t) => t.from === current).map(eventOf));

  return (
    <>
      <Diagram scene={stateMachine(states, transitions, { current, fired })} viewBox={[-30, -10, 640, 340]} />
      <div className="row">
        {events.map((ev) => (
          <Button key={ev} variant={legal.has(ev) ? 'primary' : undefined} disabled={!legal.has(ev)} onClick={() => fire(ev)}>{ev}</Button>
        ))}
        <Button onClick={() => (setCurrent('Pending'), setFired(0), setLog(['created → Pending']))}>Reset</Button>
      </div>
      <p className="status">{log.join('   ·   ')}</p>
    </>
  );
}
