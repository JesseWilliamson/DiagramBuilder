// The login from the Sequence example, as a communication diagram. One message list and one
// player feed both views. The sequence diagram shows ORDER by going down the page; the
// communication diagram has no "down", so it carries order in the numbers (1, 1.1, 1.1.1…),
// which come from each message's `parent`, and shows WHO TALKS TO WHOM as links.
import { useMemo, useState } from 'react';
import { fitViewBox } from '@figurae/core';
import { Diagram, Segmented, Transport, usePlayer } from '@figurae/react';
import { communication, CommunicationParticipant, Message, sequence } from '@figurae/uml';

const people: CommunicationParticipant[] = [
  { id: 'user', label: 'User', kind: 'actor' },
  { id: 'web', label: ':Browser' },
  { id: 'api', label: ':API' },
  { id: 'auth', label: ':AuthService' },
  { id: 'db', label: ':Database' },
];

// `parent` = the message this one happens inside. Sequence ignores it; communication numbers by it.
const messages: Array<Message & { note: string }> = [
  { from: 'user', to: 'web', label: 'submit(email, pw)', note: 'The user submits the form. Message 1.' },
  { from: 'web', to: 'api', label: 'POST /login', parent: 0, note: 'Happens inside message 1, so it is 1.1. The link web–API appears once, and carries both directions.' },
  { from: 'api', to: 'auth', label: 'verify(email, pw)', parent: 1, note: '1.1.1: nested one level deeper.' },
  { from: 'auth', to: 'db', label: 'findUser(email)', parent: 2, note: '1.1.1.1: auth looks the user up.' },
  { from: 'db', to: 'auth', label: 'user row', kind: 'return', parent: 2, note: '1.1.1.2: the reply rides the same link, with the arrow reversed. One link per pair, however many messages.' },
  { from: 'auth', to: 'auth', label: 'checkHash(pw)', parent: 2, note: '1.1.1.3: a message to self is a small loop over the object.' },
  { from: 'auth', to: 'db', label: 'audit("login")', kind: 'async', parent: 2, note: '1.1.1.4: fire and forget (open head). The auth service does not wait for the audit log.' },
  { from: 'auth', to: 'api', label: 'ok', kind: 'return', parent: 1, note: '1.1.2: auth answers the API.' },
  { from: 'api', to: 'web', label: '200 + token', kind: 'return', parent: 0, note: '1.2: back out to the browser.' },
  { from: 'web', to: 'user', label: 'show dashboard', kind: 'return', note: '2: the second top-level message.' },
];

const comm = (i: number) => communication(people, messages, { upTo: i, ring: true });
const seq = (i: number) => sequence(people, messages, { upTo: i, numbered: true, gap: 120 });
const commBox = fitViewBox(comm(messages.length - 1), 36);
const seqBox = fitViewBox(seq(messages.length - 1), 24);

type View = 'both' | 'communication' | 'sequence';

export default function Communication() {
  const [view, setView] = useState<View>('both');
  const player = usePlayer(() => messages.map((_, i) => i), [], { interval: 1500 });
  const i = player.frame ?? 0;
  const c = useMemo(() => comm(i), [i]);
  const s = useMemo(() => seq(i), [i]);
  return (
    <>
      <Segmented value={view} onChange={setView} options={[{ value: 'both', label: 'Both' }, { value: 'communication', label: 'Communication' }, { value: 'sequence', label: 'Sequence' }]} />
      {view !== 'sequence' && <Diagram scene={c} viewBox={commBox} />}
      {view !== 'communication' && <Diagram scene={s} viewBox={seqBox} />}
      <p className="status">{messages[i].note}</p>
      <Transport player={player} />
    </>
  );
}
