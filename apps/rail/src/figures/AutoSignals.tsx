// A train running through automatic signals. Drag it along (or press play) and watch
// the aspects step down behind it; fail a track circuit and watch what the signals do.
import { useEffect, useMemo, useState } from 'react';
import { combine, fitViewBox, path, type Part, type Scene } from 'dsviz';
import { Button, Diagram, Slider, Switch, useTicker } from 'dsviz/react';
import { aspects, occupied, type Line } from '../rail/blocks';
import { aspectName, signal, track, train, type Aspect } from '../rail/draw';
import { Ctl, Figure } from '../ui/blocks';

const line: Line = { signals: [40, 170, 300, 430, 560, 690], end: 820 };
const names = ['S2', 'S4', 'S6', 'S8', 'S10', 'S12'];
const LEN = 92, Y = 70, FAILED_TC = 3; // the track circuit you can fail: S8's block
const MAX = line.end + LEN;

function draw(front: number, failed: boolean, occ: boolean[], asp: Aspect[]): Scene {
  const tcs = line.signals.map((s, i) => {
    const e = line.signals[i + 1] ?? line.end;
    return track(`tc${i}`, [[s + 3, Y], [e - 3, Y]], occ[i] ? 'danger' : undefined);
  });
  // insulated joints: the short gaps between track circuits, marked with a tick
  const joints = line.signals.map((s, i) => path({ id: `ij${i}`, points: [[s, Y - 7], [s, Y + 7]], role: 'post' }));
  const x1 = Math.max(front - LEN, 0), x2 = Math.min(front, line.end);
  return combine(
    tcs,
    joints,
    line.signals.map((s, i) => signal({ id: names[i], x: s, y: Y, aspect: asp[i], label: names[i] })),
    x2 > x1 + 4 && train({ id: 'train', x1, x2, y: Y + 26, label: x2 - x1 > 50 ? '7SP3 →' : undefined }),
    failed && path({ id: 'fault', points: [[line.signals[FAILED_TC] + 60, Y - 8], [line.signals[FAILED_TC] + 70, Y + 8]], role: 'post' }),
  );
}

const viewBox = fitViewBox([draw(0, true, line.signals.map(() => true), line.signals.map(() => 'stop')), draw(MAX / 2, true, [], [])], 16);

export function AutoSignals() {
  const [front, setFront] = useState(250);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const tick = useTicker(40, playing);
  useEffect(() => {
    if (playing) setFront((f) => (f >= MAX ? 0 : f + 4));
  }, [tick, playing]);

  const occ = useMemo(() => occupied(line, [{ front, length: LEN }], failed ? new Set([FAILED_TC]) : new Set()), [front, failed]);
  const asp = useMemo(() => aspects(occ), [occ]);
  const scene = useMemo(() => draw(front, failed, occ, asp), [front, failed, occ, asp]);

  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="train position">
            <Slider value={front} onChange={(v) => (setPlaying(false), setFront(v))} min={0} max={MAX} step={2} format={() => ''} />
          </Ctl>
          <div className="btn-row">
            <Button onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Run the train'}</Button>
          </div>
          <Ctl label={`fail track circuit at ${names[FAILED_TC]}`}>
            <Switch checked={failed} onChange={setFailed} label={failed ? 'failed' : 'working'} />
          </Ctl>
          <p className="readout">
            {names.map((n, i) => (
              <span key={n}>
                {n}{' '}
                <b className={asp[i] === 'stop' ? 'bad' : asp[i] === 'caution' ? 'warn' : 'ok'}>{aspectName[asp[i]]}</b>
                {occ[i] ? ' · occupied' : ''}
                <br />
              </span>
            ))}
          </p>
        </>
      }
      caption="Each signal protects the track circuit ahead of it (drawn red when occupied). The signal behind an occupied block shows Stop, the one behind that shows Caution, and every other one shows Clear. Fail the track circuit at S8 with no train anywhere near it."
    >
      <Diagram scene={scene} viewBox={viewBox} duration={160} label="A line of automatic signals with a train passing through" />
    </Figure>
  );
}
