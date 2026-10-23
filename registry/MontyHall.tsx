// The Monty Hall problem. A car is behind one door, goats behind the others.
// Pick a door; the host (who knows) opens a goat door; then stay or switch.
import { useState } from 'react';
import { combine, rect, text } from '@dsviz/core';
import { bars } from '@dsviz/prob';
import { Button, Diagram, useBurst } from '@dsviz/react';

type Stage = 'pick' | 'offer' | 'done';
const DW = 92, DH = 130, GAP = 22;
const doorX = (i: number) => i * (DW + GAP) + DW / 2;
const rnd = (k: number) => Math.floor(Math.random() * k);

function newGame() {
  return { car: rnd(3), pick: -1, opened: -1, final: -1, stage: 'pick' as Stage };
}
// One full game with a fixed strategy, no UI: for the "simulate" button.
function play(strategy: 'stay' | 'switch') {
  const car = rnd(3), pick = rnd(3);
  const goats = [0, 1, 2].filter((d) => d !== pick && d !== car);
  const opened = goats[rnd(goats.length)];
  const final = strategy === 'stay' ? pick : [0, 1, 2].find((d) => d !== pick && d !== opened)!;
  return final === car;
}

export default function MontyHall() {
  const [g, setG] = useState(newGame);
  const [tally, setTally] = useState({ stay: { won: 0, n: 0 }, switch: { won: 0, n: 0 } });
  const [particles, fire] = useBurst();

  function click(d: number) {
    if (g.stage === 'pick') {
      // the host opens a goat door that isn't yours
      const goats = [0, 1, 2].filter((x) => x !== d && x !== g.car);
      setG({ ...g, pick: d, opened: goats[rnd(goats.length)], stage: 'offer' });
    } else if (g.stage === 'offer' && d !== g.opened) {
      const strategy = d === g.pick ? 'stay' : 'switch';
      const won = d === g.car;
      setG({ ...g, final: d, stage: 'done' });
      setTally((t) => ({ ...t, [strategy]: { won: t[strategy].won + (won ? 1 : 0), n: t[strategy].n + 1 } }));
      if (won) fire(doorX(d), DH / 2, { count: 20, radius: 60 });
    }
  }
  function simulate() {
    setTally((t) => {
      const next = { stay: { ...t.stay }, switch: { ...t.switch } };
      for (let i = 0; i < 100; i++) {
        next.stay.n++; next.stay.won += +play('stay');
        next.switch.n++; next.switch.won += +play('switch');
      }
      return next;
    });
  }

  const isOpen = (d: number) => d === g.opened || g.stage === 'done';
  const doors = [0, 1, 2].map((d) => {
    const open = isOpen(d);
    const tone = g.stage === 'done' && d === g.final ? (d === g.car ? 'success' : 'danger') : d === g.pick ? 'accent' : undefined;
    return [
      rect({ id: `frame${d}`, x: doorX(d), y: DH / 2, w: DW, h: DH, rx: 6, role: 'frame', tone }),
      text({ id: `prize${d}`, x: doorX(d), y: DH / 2 + 4, text: d === g.car ? '🚗' : '🐐', size: 42, opacity: open ? 1 : 0 }),
      // opening = the panel squeezes toward its hinge (same id, so it tweens)
      rect({
        id: `door${d}`, x: open ? doorX(d) - DW / 2 + 7 : doorX(d), y: DH / 2, w: open ? 12 : DW - 8, h: DH - 8, rx: 5,
        tone: tone ?? 'orange', interactive: g.stage !== 'done' && !open, data: d,
      }),
      text({ id: `num${d}`, x: open ? doorX(d) - DW / 2 + 7 : doorX(d), y: DH / 2, text: open ? '' : String(d + 1), size: 22, role: 'value', tone }),
      !open && { kind: 'circle' as const, id: `knob${d}`, x: doorX(d) + DW / 2 - 16, y: DH / 2 + 8, r: 3.5, role: 'dot' },
      d === g.pick && text({ id: 'yours', x: doorX(d), y: DH + 16, text: g.stage === 'done' && g.final !== g.pick ? 'first pick' : 'your pick', size: 11, role: 'caption', tone: 'accent' }),
    ];
  });

  const rate = (s: { won: number; n: number }) => (s.n ? s.won / s.n : 0);
  // win rates, once there's something to show (two flat 0% bars just look broken)
  const played = tally.stay.n + tally.switch.n > 0;
  const chart = played && bars([rate(tally.stay), rate(tally.switch)], {
    id: 'rates', x: 3 * (DW + GAP) + 30, y: 10, width: 130, height: DH - 10, max: 1,
    labels: ['stay', 'switch'], showValues: true, format: (v) => `${Math.round(v * 100)}%`, tones: { 0: 'muted', 1: 'success' }, reference: 2 / 3,
  });

  const msg =
    g.stage === 'pick' ? 'Pick a door.'
    : g.stage === 'offer' ? `The host opens door ${g.opened + 1}: a goat. Click your door to stay, or the other closed one to switch.`
    : g.final === g.car ? `You ${g.final === g.pick ? 'stayed' : 'switched'} and won the car!` : `You ${g.final === g.pick ? 'stayed' : 'switched'}… goat.`;

  return (
    <>
      <Diagram scene={combine(doors, chart, particles)} viewBox={[-6, -28, 520, DH + 60]} onClick={(e) => typeof e.node.data === 'number' && click(e.node.data)} />
      <p className="status">{msg}</p>
      <div className="row">
        <Button variant="primary" onClick={() => setG(newGame())}>{g.stage === 'done' ? 'Play again' : 'Restart'}</Button>
        <Button onClick={simulate}>Simulate 100 of each</Button>
        <span className="stats">stay <b>{tally.stay.won}/{tally.stay.n}</b> · switch <b>{tally.switch.won}/{tally.switch.n}</b></span>
      </div>
    </>
  );
}
