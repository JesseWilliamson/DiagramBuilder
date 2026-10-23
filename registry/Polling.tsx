// A loop fragment: the box around the polls grows as each one comes back, and
// stops growing at the message that ends the loop.
import { useMemo } from 'react';
import { fitViewBox } from '@figurae/core';
import { Diagram, Transport, usePlayer } from '@figurae/react';
import { Fragment, Message, Participant, sequence } from '@figurae/uml';

const people: Participant[] = [
  { id: 'app', label: 'App' },
  { id: 'cloud', label: 'Cloud API' },
  { id: 'vm', label: 'VM' },
];
const messages: Array<Message & { note: string }> = [
  { from: 'app', to: 'cloud', label: 'start()', note: 'Ask for a machine. The answer comes back before the machine is ready.' },
  { from: 'cloud', to: 'app', label: 'id', kind: 'return', note: 'An id, and nothing running yet.' },
  { from: 'app', to: 'cloud', label: 'status(id)', note: 'So ask whether it is up…' },
  { from: 'cloud', to: 'app', label: 'PENDING', kind: 'return', note: '…not yet…' },
  { from: 'app', to: 'cloud', label: 'status(id)', note: 'Ask again a moment later.' },
  { from: 'cloud', to: 'app', label: 'RUNNING', kind: 'return', note: 'Running. The loop ends here.' },
  { from: 'app', to: 'vm', label: 'POST /job', note: 'Now the machine can take the work.' },
  { from: 'vm', to: 'app', label: 'result', kind: 'return', note: 'And the result comes back.' },
];
const fragments: Fragment[] = [{ kind: 'loop', label: 'until RUNNING', from: 2, to: 5, over: ['app', 'cloud'] }];
const draw = (i: number) => sequence(people, messages, { upTo: i, fragments, gap: 170 });
const viewBox = fitViewBox(draw(messages.length - 1), 24);

export default function Polling() {
  const player = usePlayer(() => messages.map((_, i) => i), [], { interval: 1100 });
  const i = player.frame ?? 0;
  const scene = useMemo(() => draw(i), [i]);
  return (
    <>
      <Diagram scene={scene} viewBox={viewBox} />
      <p className="status">{messages[i].note}</p>
      <Transport player={player} />
    </>
  );
}
