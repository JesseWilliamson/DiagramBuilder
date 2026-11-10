// A trainstop, seen from the side. With the signal at stop the arm beside the rail is
// raised; a train running past it strikes the trip cock under the leading bogie, which
// vents the brake pipe and stops the train. With the signal clear the arm lies down.
import { useMemo, useState } from 'react';
import { circle, combine, fitViewBox, path, rect, text, type Scene } from 'dsviz';
import { Diagram, Segmented, Slider } from 'dsviz/react';
import { signal, track } from '../rail/draw';
import { Ctl, Figure } from '../ui/blocks';

const RAIL = 100, STOP_X = 420, LEN = 220, STOP_IN = 70; // the train stops this far past the trainstop once tripped
const MAX = 680;

export function trainstop(front: number, atStop: boolean) {
  const tripped = atStop && front > STOP_X + 4;
  return { tripped, front: tripped ? Math.min(front, STOP_X + STOP_IN) : front };
}

function draw(want: number, atStop: boolean): Scene {
  const { tripped, front } = trainstop(want, atStop);
  const tail = front - LEN;
  const cock = front - 26; // the trip cock hangs just behind the front of the leading car
  return combine(
    track('rail', [[0, RAIL], [MAX + 40, RAIL]]),
    signal({ id: 'sig', x: STOP_X + 12, y: RAIL, aspect: atStop ? 'stop' : 'clear', label: 'S20' }),
    // the arm: same id raised or lowered, so dsviz swings it between the two
    rect({ id: 'arm', x: STOP_X, y: atStop ? RAIL - 9 : RAIL - 2, w: atStop ? 5 : 22, h: atStop ? 18 : 4, rx: 1.5, tone: atStop ? 'danger' : 'muted' }),
    text({ id: 'arm:l', x: STOP_X, y: RAIL + 22, text: atStop ? 'trainstop raised' : 'trainstop lowered', size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
    rect({ id: 'car', x: (front + tail) / 2, y: RAIL - 34, w: LEN, h: 34, rx: 6, role: 'train', tone: tripped ? 'danger' : 'accent' }),
    circle({ id: 'w1', x: front - 40, y: RAIL - 8, r: 7 }),
    circle({ id: 'w2', x: front - 64, y: RAIL - 8, r: 7 }),
    circle({ id: 'w3', x: tail + 40, y: RAIL - 8, r: 7 }),
    circle({ id: 'w4', x: tail + 64, y: RAIL - 8, r: 7 }),
    path({ id: 'cock', points: [[cock, RAIL - 17], [cock, RAIL - 6], [cock - 4, RAIL - 4]], role: 'post' }),
    text({ id: 'cock:l', x: cock, y: RAIL - 44, text: 'trip cock ↓', size: 10.5, anchor: 'middle', role: 'code' }),
    tripped && text({ id: 'trip', x: front - LEN / 2, y: RAIL - 17, text: 'TRIPPED · emergency brake', size: 11, anchor: 'middle', role: 'code', weight: 600 }),
  );
}

const viewBox = fitViewBox([draw(LEN, true), draw(MAX, false)], 16);

export function Trainstop() {
  const [front, setFront] = useState(300);
  const [stop, setStop] = useState<'stop' | 'clear'>('stop');
  const scene = useMemo(() => draw(front, stop === 'stop'), [front, stop]);
  const t = trainstop(front, stop === 'stop');
  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="signal S20">
            <Segmented value={stop} onChange={setStop} options={[{ value: 'stop', label: 'Stop' }, { value: 'clear', label: 'Clear' }]} />
          </Ctl>
          <Ctl label="drive the train">
            <Slider value={front} onChange={setFront} min={LEN} max={MAX} step={4} format={() => ''} />
          </Ctl>
          <p className={`status ${t.tripped ? 'bad' : ''}`} style={{ flexBasis: '100%' }}>
            {t.tripped
              ? 'The raised arm struck the trip cock, venting the brake pipe: the train is in emergency braking and stops just past the signal, before the danger it protects.'
              : stop === 'stop' ? 'The arm is raised beside the rail. Drive the train past the signal.' : 'With S20 clear the arm lies flat and the trip cock passes over it.'}
          </p>
        </>
      }
      caption="Side view, not to scale. The trainstop only acts after the train has passed the signal, so the protected point (the overlap) has to be far enough beyond the signal for an emergency stop from the speed trains approach it at."
    >
      <Diagram scene={scene} viewBox={viewBox} duration={220} label="Side view of a train approaching a signal with a trainstop beside the rail" />
    </Figure>
  );
}
