// A turnout in plan view, its point machine, and the signal reading over it. Call the
// points and watch the machine go through unlock, move, lock and detect; put a stone
// between a blade and its stock rail and watch detection never come.
//
// The blades are drawn from `pos` (0 = normal, 1 = reverse) with the same ids every
// frame, so dsviz tweens them across as the machine steps: the animation is free.
import { useEffect, useMemo, useState } from 'react';
import { circle, combine, fitViewBox, path, rect, text, type Scene } from 'dsviz';
import { Diagram, Segmented, Switch, useTicker } from 'dsviz/react';
import { signal } from '../rail/draw';
import { throwPoints, type Lie, type Snapshot, type Stage } from '../rail/pointMachine';
import { Ctl, Figure } from '../ui/blocks';

const G = 16; // half the gauge, in px (exaggerated so the parts are visible)
const K = 0.0009; // curvature of the diverging route
const TOE = 150, HEEL = 260, END = 580;
const div = (x: number) => (x <= TOE ? 0 : K * (x - TOE) ** 2); // the diverging centre line
const pts = (f: (x: number) => number, a: number, b: number, n = 16): [number, number][] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const x = a + ((b - a) * i) / n;
    return [x, f(x)];
  });
// where the straight route's lower rail meets the diverging route's upper rail: the crossing nose
const NOSE = TOE + Math.sqrt((2 * G) / K);
const OPEN = 8; // how far the open blade stands off its stock rail at the toe
const lbl = (id: string, x: number, y: number, s: string, anchor: 'start' | 'middle' | 'end' = 'middle') =>
  text({ id: `L:${id}`, x, y, text: s, size: 10.5, anchor, role: 'code', tone: 'muted' });

function draw(s: Snapshot, stone: boolean, labels: boolean): Scene {
  // normal: the straight blade is closed against the lower stock rail; reverse: the curved blade against the upper one
  const shift = s.pos * OPEN;
  const straightToe = G - 1 - shift;
  const curvedToe = -G + 1 + OPEN - shift;
  // a blade runs from its toe to the heel, its offset from the closed line shrinking to nothing at the heel
  const blade = (id: string, toeY: number, line: (x: number) => number) =>
    path({ id, points: pts((x) => line(x) + (toeY - line(TOE)) * (1 - (x - TOE) / (HEEL - TOE)), TOE, HEEL, 8), role: 'path', tone: 'accent' });
  const ok = s.detected && s.locked;
  const W = 40; // how far the wing rails and check rails run past the nose
  return combine(
    // stock rails: the upper runs straight through, the lower follows the diverging route
    path({ id: 'stockU', points: [[0, -G], [END, -G]], role: 'path' }),
    path({ id: 'stockL', points: [[0, G], ...pts((x) => div(x) + G, TOE, END)], role: 'path' }),
    // switch blades, tied together by a stretcher bar at the toe
    blade('bladeS', straightToe, () => G),
    blade('bladeC', curvedToe, (x) => div(x) - G),
    path({ id: 'bar', points: [[TOE + 4, curvedToe], [TOE + 4, straightToe]], role: 'post' }),
    // closure rails to the throat, then each flares outside the V as a wing rail
    path({ id: 'closS', points: [[HEEL, G], [NOSE - 10, G], [NOSE + W, div(NOSE + W) - G + 7]], role: 'path' }),
    path({ id: 'closC', points: [...pts((x) => div(x) - G, HEEL, NOSE - 10, 8), [NOSE + W, G - 7]], role: 'path' }),
    // the crossing V: the straight route's lower rail and the diverging route's upper rail, joined at the nose
    path({ id: 'vee', points: [[END, G], [NOSE + 4, G + 1], ...pts((x) => div(x) - G, NOSE + 6, END, 10)], role: 'path' }),
    // check rails opposite the crossing, holding the other wheel so the axle can't drift onto the wrong side of the nose
    path({ id: 'checkS', points: [[NOSE - W, -G + 6], [NOSE + W, -G + 6]], role: 'path', tone: 'orange' }),
    path({ id: 'checkC', points: pts((x) => div(x) + G - 6, NOSE - W, NOSE + W, 6), role: 'path', tone: 'orange' }),
    // the point machine beside the toe, and its drive rod to the blades
    rect({ id: 'machine', x: TOE + 4, y: -G - 52, w: 82, h: 28, rx: 4, tone: s.stage === 'fail' ? 'danger' : ok ? 'success' : 'active' }),
    text({ id: 'machine:l', x: TOE + 4, y: -G - 52, text: s.stage === 'fail' ? 'NO DETECTION' : stageWord[s.stage], size: 10, anchor: 'middle', role: 'code', weight: 600 }),
    path({ id: 'rod', points: [[TOE + 4, -G - 38], [TOE + 4, curvedToe]], role: 'post' }),
    circle({ id: 'lock', x: TOE + 58, y: -G - 52, r: 4, tone: s.locked ? 'success' : 'danger' }),
    stone && circle({ id: 'stone', x: TOE + 16, y: -G + 3.5, r: 3, tone: 'orange' }),
    signal({ id: 'sig', x: 60, y: G, aspect: ok ? 'clear' : 'stop', label: 'S21', side: 1 }),
    labels && [
      lbl('stock', 50, -G - 10, 'stock rails'),
      lbl('blades', HEEL - 30, -G - 10, 'switch blades'),
      lbl('toe', TOE, G + 18, 'toe'),
      lbl('heel', HEEL, div(HEEL) + G + 18, 'heel'),
      lbl('closure', (HEEL + NOSE) / 2 + 10, div((HEEL + NOSE) / 2 + 10) + G + 18, 'closure rails'),
      lbl('vee', NOSE + 60, (G + div(NOSE + 60) - G) / 2 + 3, 'crossing V', 'start'),
      lbl('wing', NOSE + W + 4, div(NOSE + W) - G + 14, 'wing rails', 'start'),
      lbl('check', NOSE, -G - 10, 'check rails'),
      text({ id: 'L:N', x: END + 6, y: 0, text: 'normal', size: 11, anchor: 'start', role: 'code' }),
      text({ id: 'L:R', x: END + 6, y: div(END), text: 'reverse', size: 11, anchor: 'start', role: 'code' }),
    ],
  );
}

const stageWord: Record<Stage, string> = { unlock: 'unlocking', move: 'moving', lock: 'locking', detect: 'detected', fail: 'no detection' };
const STEP_MS = 900;

const rest: Snapshot = { stage: 'detect', pos: 0, locked: true, detected: true, note: '' };
const viewBox = fitViewBox([draw(rest, true, true), draw({ ...rest, pos: 1, stage: 'fail' }, true, true)], 16);

export function Turnout() {
  const [lie, setLie] = useState<Lie>('N');
  const [stone, setStone] = useState(false);
  const [frames, setFrames] = useState<Snapshot[]>([{ ...rest, note: 'Points normal and detected. S21 is clear for the straight route.' }]);
  const [i, setI] = useState(0);
  const running = i < frames.length - 1;
  const tick = useTicker(STEP_MS, running);
  useEffect(() => {
    if (running && tick > 0) setI((n) => Math.min(n + 1, frames.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const s = frames[i];
  const call = (to: Lie) => {
    // blades stuck part-way by a failed throw count as lying the other way from the one asked for
    const from: Lie = s.stage === 'fail' ? (to === 'N' ? 'R' : 'N') : s.pos >= 0.5 ? 'R' : 'N';
    setLie(to);
    setFrames(throwPoints(from, to, stone, s.pos));
    setI(0);
  };
  const scene = useMemo(() => draw(s, stone, true), [s, stone]);
  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="call points 21">
            <Segmented value={lie} onChange={call} options={[{ value: 'N', label: 'Normal' }, { value: 'R', label: 'Reverse' }]} />
          </Ctl>
          <Ctl label="stone between curved blade and stock rail">
            <Switch checked={stone} onChange={setStone} label={stone ? 'yes' : 'no'} />
          </Ctl>
          <p className="readout">
            stage <b>{stageWord[s.stage]}</b><br />
            locked <b className={s.locked ? 'ok' : 'bad'}>{s.locked ? 'yes' : 'no'}</b> · detected <b className={s.detected ? 'ok' : 'bad'}>{s.detected ? 'yes' : 'no'}</b><br />
            S21 <b className={s.detected && s.locked ? 'ok' : 'bad'}>{s.detected && s.locked ? 'can clear' : 'held at stop'}</b>
          </p>
          <p className={`status ${s.stage === 'fail' ? 'bad' : ''}`} style={{ flexBasis: '100%' }} aria-live="polite">{s.note}</p>
        </>
      }
      caption="Plan view of a turnout, widths exaggerated. Blue rails are the switch blades, orange the check rails. S21 reads over the points facing, so it may only clear when they are locked and detected. Throw them both ways, then put the stone in and call them reverse."
    >
      <Diagram scene={scene} viewBox={viewBox} duration={STEP_MS * 0.8} label="Plan view of a turnout with its point machine and a signal" />
    </Figure>
  );
}
