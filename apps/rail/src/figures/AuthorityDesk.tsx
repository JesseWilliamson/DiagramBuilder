// Train order territory, from the desk: requests come in one at a time and you
// decide each one. The rule underneath every right answer is the same one the
// interlocking enforced in the last lesson, now enforced by you: no two
// authorities may cover the same section of track.
import { useMemo, useState } from 'react';
import { combine, fitViewBox, rect, text, type Scene } from 'dsviz';
import { Button, Diagram } from 'dsviz/react';
import { band, place, track, train } from '../rail/draw';
import { Figure } from '../ui/blocks';

const X: Record<string, number> = { A: 40, B: 220, C: 400, D: 580, E: 760 };
const NAME: Record<string, string> = { A: 'Ardmore', B: 'Bellbird', C: 'Coolabah', D: 'Dunmore', E: 'Emu Flat' };
const Y = 70;

type Auth = { id: string; kind: 'train' | 'toa'; holder: string; from: string; to: string };
type Train = { id: string; x: number; dir: 1 | -1 };
type Board = { auths: Auth[]; trains: Train[] };
type Step = { who: string; says: string; board: Board; after: Board; options: { text: string; right?: boolean; why: string }[] };

const auth9 = { id: 'a9', kind: 'train', holder: '9MB2', from: 'A', to: 'C' } as const;
const authToa = { id: 'toa', kind: 'toa', holder: 'PO Jones', from: 'B', to: 'C' } as const;
const auth4 = { id: 'a4', kind: 'train', holder: '4BM1', from: 'E', to: 'C' } as const;
const auth9b = { id: 'a9b', kind: 'train', holder: '9MB2', from: 'C', to: 'E' } as const;

const steps: Step[] = [
  {
    who: 'Driver, 9MB2 at Ardmore',
    says: '"Network Control, 9MB2 at Ardmore, ready to depart. Requesting an authority Ardmore to Coolabah."',
    board: { auths: [], trains: [{ id: '9MB2', x: X.A, dir: 1 }] },
    after: { auths: [auth9], trains: [{ id: '9MB2', x: X.A, dir: 1 }] },
    options: [
      { text: 'Issue the authority, Ardmore to Coolabah', right: true, why: 'Both sections are free: no train and no other authority in them. Issue it, and have the driver read it back word for word before you confirm it.' },
      { text: 'Refuse: wait until you know where the opposing train will be', why: 'Nothing is in the way, and the authority only reaches Coolabah. The crossing can be planned later, when you know where the up train is.' },
    ],
  },
  {
    who: 'Protection Officer, track gang at Bellbird',
    says: '"Network Control, Protection Officer Jones at Bellbird. Requesting a Track Occupancy Authority, Bellbird to Coolabah, for forty minutes."',
    board: { auths: [auth9], trains: [{ id: '9MB2', x: 300, dir: 1 }] },
    after: { auths: [auth9], trains: [{ id: '9MB2', x: 300, dir: 1 }] },
    options: [
      { text: 'Issue the TOA. The gang can stand clear when the train comes through.', why: "A TOA gives the worksite exclusive occupancy of the track between its limits. 9MB2's authority already covers that section, and the train is in it now." },
      { text: 'Refuse for now: 9MB2 holds that section and is in it. Offer the TOA once 9MB2 has fulfilled its authority.', right: true, why: 'Two authorities can never cover the same section. Tell the Protection Officer why and roughly when, so they can plan.' },
    ],
  },
  {
    who: 'Driver, 4BM1 at Emu Flat',
    says: '"Network Control, 4BM1 at Emu Flat. Requesting an authority Emu Flat to Ardmore."',
    board: { auths: [auth9], trains: [{ id: '9MB2', x: 360, dir: 1 }, { id: '4BM1', x: X.E, dir: -1 }] },
    after: { auths: [auth9, auth4], trains: [{ id: '9MB2', x: 360, dir: 1 }, { id: '4BM1', x: X.E, dir: -1 }] },
    options: [
      { text: 'Issue it as requested', why: "Ardmore to Coolabah is held by 9MB2's authority. Issuing Emu Flat to Ardmore would put two opposing trains on the same single line. This is the head-on collision that the whole system exists to prevent." },
      { text: 'Issue Emu Flat to Coolabah only: the two trains will cross at Coolabah', right: true, why: 'Both authorities end at Coolabah, so they cover no section in common. Both trains are short enough for its loop. 9MB2 will take the loop and 4BM1 the main, as in the interlocking lesson.' },
      { text: 'Refuse until 9MB2 has cleared the whole line', why: 'Safe, but it holds 4BM1 for no reason. Coolabah is a crossing loop, and that is what it is for.' },
    ],
  },
  {
    who: 'Driver, 9MB2 at Coolabah',
    says: '"9MB2 at Coolabah, in the loop. Requesting to fulfil authority Ardmore to Coolabah."',
    board: { auths: [auth9, auth4], trains: [{ id: '9MB2', x: X.C, dir: 1 }, { id: '4BM1', x: 640, dir: -1 }] },
    after: { auths: [auth4], trains: [{ id: '9MB2', x: X.C, dir: 1 }, { id: '4BM1', x: 640, dir: -1 }] },
    options: [
      { text: 'Fulfil it: the train is at Coolabah', why: "Being at Coolabah isn't enough. Half a train can be at Coolabah. The authority can be given back only when the whole train is clear of the section." },
      { text: 'Confirm the train is complete (the end-of-train marker seen or the train checked) and clear of the main line, then record the authority as fulfilled', right: true, why: "Fulfilling an authority hands the track back. The controller must be sure nothing of the train, such as a vehicle that has broken away, is left in the section." },
      { text: 'Leave it open until 4BM1 has arrived too', why: 'The authority covers Ardmore to Coolabah, behind 9MB2. Keeping it open does nothing for 4BM1 and blocks that track for everyone else, including the gang at Bellbird.' },
    ],
  },
  {
    who: 'Protection Officer, track gang at Bellbird',
    says: '"Protection Officer Jones again. Can we have that TOA now, Bellbird to Coolabah, forty minutes?"',
    board: { auths: [auth4], trains: [{ id: '9MB2', x: X.C, dir: 1 }, { id: '4BM1', x: 520, dir: -1 }] },
    after: { auths: [auth4, authToa], trains: [{ id: '9MB2', x: X.C, dir: 1 }, { id: '4BM1', x: 520, dir: -1 }] },
    options: [
      { text: 'Issue the TOA, Bellbird to Coolabah', right: true, why: 'That section is free now, so the worksite gets it to itself. The Protection Officer runs the work inside the limits. Your job is to let nothing in.' },
      { text: 'Refuse: 4BM1 is still coming towards Coolabah', why: "4BM1's authority ends at Coolabah, on the far side from the worksite. The two share no section." },
    ],
  },
  {
    who: 'Driver, 4BM1 at Coolabah',
    says: '"4BM1 at Coolabah on the main, train complete, 9MB2 is in the loop. Fulfilling Emu Flat to Coolabah, and requesting an authority Coolabah to Ardmore."',
    board: { auths: [auth4, authToa], trains: [{ id: '9MB2', x: X.C, dir: 1 }, { id: '4BM1', x: X.C, dir: -1 }] },
    after: { auths: [authToa, auth9b], trains: [{ id: '9MB2', x: X.C, dir: 1 }, { id: '4BM1', x: X.C, dir: -1 }] },
    options: [
      { text: "Fulfil 4BM1's authority and issue Coolabah to Ardmore", why: 'Coolabah to Bellbird is inside the TOA. Issuing it would send a train straight at the gang, with nothing but your mistake between them.' },
      { text: "Fulfil 4BM1's authority. Hold 4BM1 at Coolabah and tell the driver why: there's a worksite under a TOA ahead. Now 9MB2 can have Coolabah to Emu Flat.", right: true, why: 'The cross is done: Coolabah to Emu Flat is free, so 9MB2 goes on, and 4BM1 waits for the TOA to be fulfilled. Under the rules, a train can enter a TOA only with the Protection Officer\'s agreement, and that is arranged with them, not assumed.' },
      { text: "Leave 4BM1's authority open, since the train will be there a while", why: "It's complete and clear. Fulfil it so the track can be used, here by 9MB2 heading east." },
    ],
  },
];

function draw(b: Board): Scene {
  const xs = Object.values(X);
  return combine(
    xs.slice(0, -1).map((x, i) => track(`sec${i}`, [[x + 4, Y], [xs[i + 1] - 4, Y]])),
    ['B', 'C', 'D'].map((k) => track(`loop${k}`, [[X[k] - 34, Y], [X[k] - 24, Y - 12], [X[k] + 24, Y - 12], [X[k] + 34, Y]])),
    Object.keys(X).map((k) => place(`pl${k}`, X[k], Y + 54, NAME[k], k === 'A' || k === 'E' ? 'yard' : 'crossing loop')),
    b.auths.map((a, i) =>
      band(a.id, X[a.from] + 6, X[a.to] - 6 * Math.sign(X[a.to] - X[a.from]), Y + 22, 14, a.kind === 'toa' ? 'orange' : 'accent', `${a.kind === 'toa' ? 'TOA' : 'authority'} · ${a.holder}`),
    ),
    b.trains.map((t) => train({ id: t.id, x1: t.x - 34 * t.dir, x2: t.x + 6 * t.dir, y: t.id === '9MB2' && t.x === X.C ? Y - 12 : Y, label: t.id, tone: t.id === '9MB2' ? 'visited' : 'success', h: 14 })),
    b.auths.some((a) => a.kind === 'toa') && rect({ id: 'worksite', x: (X.B + X.C) / 2, y: Y - 22, w: 52, h: 14, rx: 3, tone: 'orange' }),
    b.auths.some((a) => a.kind === 'toa') && text({ id: 'worksite:l', x: (X.B + X.C) / 2, y: Y - 21.5, text: 'worksite', size: 10, anchor: 'middle', role: 'code' }),
  );
}

const viewBox = fitViewBox(steps.flatMap((s) => [draw(s.board), draw(s.after)]), 16);

export function AuthorityDesk({ onFinish }: { onFinish?: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  const finished = i >= steps.length;
  const solved = picked !== null && step.options[picked].right;
  const board = finished || solved ? step.after : step.board;
  const scene = useMemo(() => draw(board), [board]);

  return (
    <Figure
      wide
      panel={
        finished ? (
          <div style={{ flexBasis: '100%' }}>
            <p className="status ok">Shift handed over. {mistakes === 0 ? 'Every call right first time.' : `${mistakes} call${mistakes > 1 ? 's' : ''} you'd want back.`}</p>
            <Button onClick={() => (setI(0), setPicked(null), setMistakes(0))}>Start again</Button>
          </div>
        ) : (
          <div style={{ flexBasis: '100%', display: 'grid', gap: 10 }}>
            <div className="ctl-label">call {i + 1} of {steps.length} · {step.who}</div>
            <p style={{ margin: 0, fontSize: 14.5 }}>{step.says}</p>
            <div style={{ display: 'grid', gap: 6 }}>
              {step.options.map((o, k) => (
                <button
                  type="button"
                  key={k}
                  className={`check-opt${picked === k ? (o.right ? ' right' : ' wrong') : ''}`}
                  aria-disabled={solved}
                  onClick={() => {
                    if (solved) return;
                    setPicked(k);
                    if (!o.right) setMistakes((m) => m + 1);
                  }}
                >
                  <span className="letter">{String.fromCharCode(65 + k)}</span>
                  <span>{o.text}</span>
                </button>
              ))}
            </div>
            {picked !== null && (
              <p className="check-why" style={{ margin: 0 }} aria-live="polite">
                <b className={solved ? 'ok' : 'bad'}>{solved ? 'Right. ' : 'Not quite. '}</b>
                {step.options[picked].why}
              </p>
            )}
            {solved && (
              <div>
                <Button variant="primary" onClick={() => (i + 1 === steps.length && onFinish?.(), setI(i + 1), setPicked(null))}>{i + 1 < steps.length ? 'Next call' : 'Finish'}</Button>
              </div>
            )}
          </div>
        )
      }
      caption="Blue bands are train authorities, orange is a Track Occupancy Authority. Every decision comes down to one check: would this authority cover any section that another authority already covers?"
    >
      <Diagram scene={scene} viewBox={viewBox} label="A single line with five locations, the trains on it and the authorities issued" />
    </Figure>
  );
}

