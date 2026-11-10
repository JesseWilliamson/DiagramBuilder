// The run-around, drawn. Every button is an action; the model decides whether it
// is allowed, and the picture is redrawn from the state. The loco keeps its id,
// so dsviz glides it from spot to spot.
import { useMemo, useState } from 'react';
import { combine, fitViewBox, rect, text, type Scene, type Tone } from 'dsviz';
import { Button, Diagram } from 'dsviz/react';
import { track, train } from '../rail/draw';
import { act, done, start, type Action, type Spot, type State } from '../rail/runaround';
import { Ctl, Figure } from '../ui/blocks';

const Y = 100, LOOP = 50;
const spotX: Record<Spot, [number, number]> = { headshunt: [80, Y], mainWest: [204, Y], loop: [330, LOOP], east: [610, Y], mainEast: [478, Y] };
const WAGONS = [242, 288, 334, 380, 426]; // wagon centres, on the main

function draw(s: State): Scene {
  const leg = (on: boolean): Tone | undefined => (on ? undefined : 'muted');
  const [lx, ly] = spotX[s.loco];
  return combine(
    rect({ id: 'stop', x: 34, y: Y, w: 6, h: 18, rx: 1, tone: 'muted' }),
    track('head', [[40, Y], [126, Y]]),
    track('p1N', [[130, Y], [170, Y]], leg(s.p1 === 'N')),
    track('p1R', [[130, Y], [166, LOOP + 4], [178, LOOP]], leg(s.p1 === 'R')),
    track('main', [[174, Y], [486, Y]]),
    track('loop', [[182, LOOP], [478, LOOP]]),
    track('p2N', [[490, Y], [530, Y]], leg(s.p2 === 'N')),
    track('p2R', [[482, LOOP], [494, LOOP + 4], [530, Y]], leg(s.p2 === 'R')),
    track('out', [[534, Y], [680, Y]]),
    text({ id: 'p1:l', x: 156, y: Y + 20, text: `points 1 · ${s.p1}`, size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
    text({ id: 'p2:l', x: 528, y: Y + 20, text: `points 2 · ${s.p2}`, size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
    text({ id: 'out:l', x: 676, y: Y - 14, text: 'to the running line →', size: 10.5, anchor: 'end', role: 'code', tone: 'muted' }),
    text({ id: 'head:l', x: 74, y: Y + 20, text: 'headshunt', size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
    WAGONS.map((x, i) => train({ id: `w${i}`, x1: x - 20, x2: x + 20, y: Y, tone: 'muted', h: 18 })),
    s.handbrakes && WAGONS.map((x, i) => text({ id: `hb${i}`, x, y: Y - 18, text: 'HB', size: 9.5, anchor: 'middle', role: 'label', tone: 'danger', weight: 600 })),
    train({ id: 'loco', x1: lx - 22, x2: lx + 22, y: ly, label: 'loco', tone: 'visited', h: 18 }),
    s.coupled && text({ id: 'coupled', x: s.loco === 'mainWest' ? 222 : 456, y: Y + 20, text: 'coupled', size: 10, anchor: 'middle', role: 'label', tone: 'success', weight: 600 }),
  );
}

const viewBox = fitViewBox([draw({ ...start, handbrakes: true }), draw({ ...start, loco: 'loop', coupled: false, handbrakes: true })], 16);

const buttons: { a: Action; label: (s: State) => string }[] = [
  { a: 'handbrakes', label: () => 'Apply handbrakes' },
  { a: 'uncouple', label: () => 'Uncouple' },
  { a: 'p1', label: (s) => `Points 1 → ${s.p1 === 'N' ? 'reverse' : 'normal'}` },
  { a: 'p2', label: (s) => `Points 2 → ${s.p2 === 'N' ? 'reverse' : 'normal'}` },
  { a: 'west', label: () => '← Loco west' },
  { a: 'east', label: () => 'Loco east →' },
  { a: 'couple', label: () => 'Couple' },
  { a: 'release', label: () => 'Release handbrakes' },
  { a: 'test', label: () => 'Brake test' },
];

export function RunAround({ onDone }: { onDone?: () => void }) {
  const [s, setS] = useState<State>(start);
  const [msg, setMsg] = useState<{ text: string; kind?: 'ok' | 'bad' }>({ text: 'The train has arrived with the loco at the west end. Get the loco to the east end, ready to depart.' });
  const [slips, setSlips] = useState(0);
  const scene = useMemo(() => draw(s), [s]);

  const press = (a: Action) => {
    const r = act(s, a);
    if (r.error) {
      setSlips((n) => n + 1);
      return setMsg({ text: r.error, kind: 'bad' });
    }
    setS(r.state);
    if (done(r.state)) {
      onDone?.();
      return setMsg({ text: `Done in ${r.state.moves} loco moves${slips ? `, with ${slips} refused action${slips > 1 ? 's' : ''} along the way` : ', with nothing refused'}. ${r.note ?? ''}`, kind: 'ok' });
    }
    setMsg({ text: r.note ?? `Loco moved ${a}.` });
  };

  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="actions">
            <div className="btn-row">
              {buttons.map((b) => <Button key={b.a} onClick={() => press(b.a)}>{b.label(s)}</Button>)}
              <Button onClick={() => (setS(start), setSlips(0), setMsg({ text: 'Back to the start.' }))}>Reset</Button>
            </div>
          </Ctl>
          <p className={`status ${msg.kind ?? ''}`} aria-live="polite" style={{ flexBasis: '100%' }}>{msg.text}</p>
        </>
      }
      caption="Faint legs show which way each set of points is not lying. HB marks a wagon with its handbrake applied. Wrong orders are refused with the reason a shunter would give, so try a few on purpose."
    >
      <Diagram scene={scene} viewBox={viewBox} label="A terminal with a headshunt, a run-around loop, five wagons and a locomotive" />
    </Figure>
  );
}
