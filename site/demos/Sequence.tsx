// Logging in, as a sequence diagram. Step through it: activation bars grow and shrink
// with the call stack, because uml.activations() derives them from calls and returns.
import { useMemo } from 'react';
import { fitViewBox, uml } from 'dsviz';
import { Diagram, Transport, usePlayer } from 'dsviz/react';

const people: uml.Participant[] = [
  { id: 'user', label: 'User', kind: 'actor' },
  { id: 'web', label: 'Browser' },
  { id: 'api', label: 'API' },
  { id: 'auth', label: 'AuthService' },
  { id: 'db', label: 'Database' },
];

const messages: Array<uml.Message & { note: string }> = [
  { from: 'user', to: 'web', label: 'submit(email, pw)', note: 'The user submits the form.' },
  { from: 'web', to: 'api', label: 'POST /login', note: 'The browser calls the API and waits: a synchronous call (solid head).' },
  { from: 'api', to: 'auth', label: 'verify(email, pw)', note: 'The API delegates to the auth service. Three bars are open now: three calls are waiting.' },
  { from: 'auth', to: 'db', label: 'findUser(email)', note: 'Auth looks the user up.' },
  { from: 'db', to: 'auth', label: 'user row', kind: 'return', note: 'Replies are dashed. The database bar closes: its call is finished.' },
  { from: 'auth', to: 'auth', label: 'checkHash(pw)', note: 'A self-call: auth calls its own method, so a bar nests inside its bar.' },
  { from: 'auth', to: 'api', label: 'ok', kind: 'return', note: 'Auth answers the API.' },
  { from: 'api', to: 'db', label: 'audit("login")', kind: 'async', note: 'Fire and forget (open head): the API does not wait for the audit log.' },
  { from: 'api', to: 'web', label: '200 + token', kind: 'return', note: 'The API replies with a token.' },
  { from: 'web', to: 'user', label: 'show dashboard', kind: 'return', note: 'Every call has been answered, so every bar has closed.' },
];

const draw = (i: number) => uml.sequence(people, messages, { upTo: i, numbered: true, gap: 140 });
// The diagram only ever grows downward, so fit the camera to the LAST frame once.
const viewBox = fitViewBox(draw(messages.length - 1), 24);

export default function Sequence() {
  const player = usePlayer(() => messages.map((_, i) => i), [], { interval: 1300 });
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
