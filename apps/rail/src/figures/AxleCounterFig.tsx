// An axle-counter section from the signaller's chair. Run a train through and read
// the counts. When they don't match, you have to decide what to do, without being
// able to see what is really in the section.
import { useEffect, useMemo, useState } from 'react';
import { combine, fitViewBox, rect, text, type Scene } from 'dsviz';
import { Button, Diagram, Segmented, Switch, useTicker } from 'dsviz/react';
import { END_FRONT, HEAD_A, HEAD_B, snapshot, type Scenario } from '../rail/axleCounter';
import { track, train } from '../rail/draw';
import { Ctl, Figure } from '../ui/blocks';

const Y = 70, X0 = 10, X1 = 720;
type Phase = 'idle' | 'running' | 'done' | 'reset' | 'proved';

function draw(scenario: Scenario, front: number, phase: Phase, reveal: boolean): Scene {
  const s = snapshot(scenario, front);
  const zeroed = phase === 'reset' || phase === 'proved';
  const occupied = !zeroed && s.countIn !== s.countOut;
  const vehicles = s.vehicles
    .filter((v) => !v.parted || reveal || phase === 'reset' || phase === 'proved')
    .filter((v) => v.x2 > X0 + 4 && v.x1 < X1 - 4)
    .map((v) =>
      train({
        id: `v${v.i}`,
        x1: Math.max(v.x1, X0),
        x2: Math.min(v.x2, X1),
        y: Y - 9,
        h: 14,
        label: v.i === 0 ? 'loco' : undefined,
        tone: v.parted ? (phase === 'reset' ? 'danger' : 'visited') : 'accent',
      }),
    );
  return combine(
    track('approach', [[X0, Y], [HEAD_A - 4, Y]]),
    track('section', [[HEAD_A + 4, Y], [HEAD_B - 4, Y]], occupied ? 'danger' : undefined),
    track('beyond', [[HEAD_B + 4, Y], [X1, Y]]),
    [['A', HEAD_A, s.countIn, 'in'], ['B', HEAD_B, s.countOut, 'out']].flatMap(([k, x, n, w]) => [
      rect({ id: `head${k}`, x: x as number, y: Y + 1, w: 10, h: 16, rx: 2, tone: 'active' }),
      text({ id: `head${k}:l`, x: x as number, y: Y + 26, text: `head ${k}`, size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
      text({ id: `head${k}:n`, x: x as number, y: Y + 42, text: `${w} ${zeroed ? 0 : n}`, size: 12, anchor: 'middle', role: 'code', weight: 600 }),
    ]),
    text({ id: 'state', x: (HEAD_A + HEAD_B) / 2, y: Y + 34, text: occupied ? 'section occupied' : 'section clear', size: 11.5, anchor: 'middle', role: 'label', tone: occupied ? 'danger' : 'success', weight: 600 }),
    vehicles,
  );
}

const viewBox = fitViewBox([draw('left', 400, 'reset', true), draw('clean', END_FRONT, 'idle', true)], 16);

export function AxleCounterFig({ onProved }: { onProved?: () => void }) {
  const [choice, setChoice] = useState<'surprise' | Scenario>('surprise');
  const [scenario, setScenario] = useState<Scenario>('clean');
  const [front, setFront] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [reveal, setReveal] = useState(false);
  const tick = useTicker(40, phase === 'running');
  useEffect(() => {
    if (phase !== 'running') return;
    setFront((f) => {
      const n = f + 7;
      if (n >= END_FRONT) setPhase('done');
      return Math.min(n, END_FRONT);
    });
  }, [tick, phase]);

  const run = () => {
    const all: Scenario[] = ['clean', 'miscount', 'left'];
    setScenario(choice === 'surprise' ? all[Math.floor(Math.random() * 3)] : choice);
    setFront(0);
    setPhase('running');
  };
  const s = snapshot(scenario, front);
  const mismatch = s.countIn !== s.countOut;
  const scene = useMemo(() => draw(scenario, front, phase, reveal), [scenario, front, phase, reveal]);

  let msg: { text: string; kind?: 'ok' | 'bad' | 'warn' } = { text: 'Run a train through the section, then read the counts at each head.' };
  if (phase === 'running') msg = { text: 'Counting…' };
  if (phase === 'done')
    msg = mismatch
      ? { text: `The train has gone, but ${s.countIn} axles were counted in and ${s.countOut} out. The section still shows occupied. What do you do?`, kind: 'warn' }
      : { text: `${s.countIn} in, ${s.countOut} out. Counts match: the section is clear.`, kind: 'ok' };
  if (phase === 'reset')
    msg = scenario === 'left'
      ? { text: 'You reset the section and it now shows clear, but a wagon parted from the train is standing in it. The next signal into the section can clear, and the next train has nothing to warn it.', kind: 'bad' }
      : { text: 'This time it really was a miscount, so nothing happened. But you reset without proving the section clear, and the panel looked exactly the same as when a wagon is left behind.', kind: 'warn' };
  if (phase === 'proved')
    msg = scenario === 'left'
      ? { text: 'The section was examined (or the next train sent in at restricted speed, able to stop short). The parted wagon was found before anything hit it. Only then is the section reset.', kind: 'ok' }
      : { text: 'The section was proved clear (examined, or the next train went through at restricted speed and found nothing). Then the counts were reset. It cost a few minutes and was the right call.', kind: 'ok' };

  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="what really happens">
            <Segmented value={choice} onChange={setChoice} options={[{ value: 'surprise', label: 'surprise me' }, { value: 'clean', label: 'clean run' }, { value: 'miscount', label: 'head B misses an axle' }, { value: 'left', label: 'last wagon parts' }]} />
          </Ctl>
          <Ctl label="show what's really in the section">
            <Switch checked={reveal} onChange={setReveal} label={reveal ? 'shown' : 'hidden, as on the panel'} />
          </Ctl>
          <div className="btn-row" style={{ flexBasis: '100%' }}>
            <Button variant="primary" onClick={run} disabled={phase === 'running'}>Run a train</Button>
            {phase === 'done' && mismatch && (
              <>
                <Button onClick={() => setPhase('reset')}>Reset the counter now</Button>
                <Button onClick={() => (setPhase('proved'), onProved?.())}>Prove the section clear, then reset</Button>
              </>
            )}
          </div>
          <p className={`status ${msg.kind ?? ''}`} aria-live="polite" style={{ flexBasis: '100%' }}>{msg.text}</p>
        </>
      }
      caption="Each head counts axles as they pass. The section is clear when the count in equals the count out. A miscount and a vehicle left behind give the same picture on the panel, which is why a reset has to be earned."
    >
      <Diagram scene={scene} viewBox={viewBox} duration={140} label="An axle counter section with a counting head at each end and a train passing through" />
    </Figure>
  );
}
