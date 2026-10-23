// A login, drawn twice from ONE message list: as a communication diagram (left) and as a
// sequence diagram (right), stepped by one player. The sequence diagram shows ORDER by going
// down the page; the communication diagram has no "down", so it carries order in the numbers
// and shows WHO TALKS TO WHOM as links: one per pair, however many messages cross it. (Pass
// numbering: 'dewey' and `parent` on nested messages for 1, 1.1, 1.1.1 numbers.)
import { useMemo } from 'react';
import { fitViewBox } from '@dsviz/core';
import { Diagram, Transport, usePlayer } from '@dsviz/react';
import { communication, CommunicationParticipant, Message, sequence } from '@dsviz/uml';

const people: CommunicationParticipant[] = [
  { id: 'user', label: 'User', kind: 'actor' },
  { id: 'web', label: ':Browser' },
  { id: 'api', label: ':API' },
  { id: 'auth', label: ':AuthService' },
  { id: 'db', label: ':Database' },
];

const messages: Array<Message & { note: string }> = [
  { from: 'user', to: 'web', label: 'submit(email, pw)', note: 'The user submits the form: message 1. The line user–browser is the link (the structure); the small arrow beside it is the message.' },
  { from: 'web', to: 'api', label: 'POST /login', note: 'Message 2. Where the sequence diagram goes down a row, this one goes along the next link.' },
  { from: 'api', to: 'auth', label: 'verify(email, pw)', note: 'Message 3: the API delegates to the auth service.' },
  { from: 'auth', to: 'db', label: 'findUser(email)', note: 'Message 4: auth looks the user up.' },
  { from: 'db', to: 'auth', label: 'user row', kind: 'return', note: 'Message 5: the reply rides the same link, arrow reversed and dashed. One link per pair, however many messages.' },
  { from: 'api', to: 'web', label: '200 + token', kind: 'return', note: 'Message 6: back out to the browser. Same conversation, two pictures; only the numbers say what came first.' },
];

const comm = (i: number) => communication(people, messages, { upTo: i, ring: true });
const seq = (i: number) => sequence(people, messages, { upTo: i, numbered: true, gap: 104, row: 36 });
// one box over every step of each view, so neither camera moves while stepping
const commBox = fitViewBox(messages.map((_, i) => comm(i).nodes), 12);
const seqBox = fitViewBox(seq(messages.length - 1), 16);

export default function Communication() {
  const player = usePlayer(() => messages.map((_, i) => i), [], { interval: 1500 });
  const i = player.frame ?? 0;
  const c = useMemo(() => comm(i), [i]);
  const s = useMemo(() => seq(i), [i]);
  return (
    <>
      <div className="row">
        <Diagram scene={c} viewBox={commBox} label="Communication diagram of the login" />
        <Diagram scene={s} viewBox={seqBox} label="Sequence diagram of the same login" />
      </div>
      <p className="status">{messages[i].note}</p>
      <Transport player={player} />
    </>
  );
}
