// A level crossing's warning sequence for one train, as a timeline. Change the
// train's speed and watch what a fixed strike-in point does to the warning time.
import { useMemo, useState } from 'react';
import { combine, fitViewBox, path, rect, text, type Scene } from 'dsviz';
import { Diagram, Slider, Switch } from 'dsviz/react';
import { band, track, train } from '../rail/draw';
import { APPROACH_M, crossingTimeline, DESIGN_KMH, TARGET_S, type Phase } from '../rail/levelCrossing';
import { Ctl, Figure } from '../ui/blocks';

const PX_S = 3.4, T_MAX = 200;
const LANES: Phase['lane'][] = ['train', 'lights', 'booms'];
const LANE_NAME = { train: 'train', lights: 'lights', booms: 'booms' };
const laneY = (l: Phase['lane']) => LANES.indexOf(l) * 34;
const tx = (t: number) => Math.min(t, T_MAX) * PX_S;

function drawTimeline(kmh: number, cwt: boolean): Scene {
  const r = crossingTimeline(kmh, cwt);
  const ticks = [];
  for (let t = 0; t <= T_MAX; t += 20) {
    ticks.push(path({ id: `tk${t}`, points: [[tx(t), -16], [tx(t), laneY('booms') + 16]], role: 'grid' }));
    ticks.push(text({ id: `tl${t}`, x: tx(t), y: laneY('booms') + 30, text: `${t} s`, size: 10, anchor: 'middle', role: 'code', tone: 'muted' }));
  }
  const late = r.boomsDownBeforeTrain < 0;
  return combine(
    ticks,
    LANES.map((l) => text({ id: `lane:${l}`, x: -10, y: laneY(l), text: LANE_NAME[l], size: 11, anchor: 'end', role: 'code', weight: 600 })),
    r.phases.map((p) => {
      const x1 = tx(p.start), x2 = tx(p.end);
      return band(`${p.lane}:${p.label}`, x1, Math.max(x2, x1 + 2), laneY(p.lane), 20, p.tone, x2 - x1 > p.label.length * 6.2 + 8 ? p.label : undefined);
    }),
    path({ id: 'arrive', points: [[tx(r.warning), -22], [tx(r.warning), laneY('booms') + 16]], role: 'path', tone: late ? 'danger' : 'accent', dashed: true }),
    text({ id: 'arrive:l', x: tx(r.warning), y: -30, text: `train arrives · ${Math.round(r.warning)} s`, size: 10.5, anchor: r.warning > 150 ? 'end' : 'start', role: 'label', tone: late ? 'danger' : undefined, weight: 600 }),
    r.warning > T_MAX && text({ id: 'more', x: tx(T_MAX) + 6, y: laneY('lights'), text: '…', size: 14, anchor: 'start' }),
  );
}

// A plan of the crossing: where the strike-in points are, and the island over the road.
const ROAD = 420;
const plan = combine(
  rect({ id: 'road', x: ROAD, y: 0, w: 46, h: 96, tone: 'muted' }),
  text({ id: 'road:l', x: ROAD, y: 62, text: 'road', size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
  track('t', [[0, 0], [840, 0]]),
  band('island', ROAD - 40, ROAD + 40, 15, 8, 'danger'),
  text({ id: 'island:l', x: ROAD + 46, y: 15, text: 'island', size: 10, anchor: 'start', role: 'code', tone: 'muted' }),
  [20, 820].flatMap((x, i) => [
    path({ id: `si${i}`, points: [[x, -10], [x, 10]], role: 'post' }),
    text({ id: `si${i}:l`, x, y: -18, text: 'strike-in', size: 10.5, anchor: 'middle', role: 'code' }),
    text({ id: `si${i}:d`, x: (x + ROAD) / 2, y: -14, text: `${APPROACH_M} m approach`, size: 10, anchor: 'middle', role: 'code', tone: 'muted' }),
  ]),
  train({ id: 'tr', x1: -60, x2: 4, y: 0, h: 12 }),
);
const planBox = fitViewBox(plan, 10);
const box = fitViewBox([drawTimeline(20, false), drawTimeline(160, false)], 14);

export function CrossingTimeline() {
  const [kmh, setKmh] = useState(80);
  const [cwt, setCwt] = useState(false);
  const r = useMemo(() => crossingTimeline(kmh, cwt), [kmh, cwt]);
  const scene = useMemo(() => drawTimeline(kmh, cwt), [kmh, cwt]);
  const late = r.boomsDownBeforeTrain < 0;
  const fast = kmh > DESIGN_KMH + 0.5;
  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="train speed">
            <Slider value={kmh} onChange={setKmh} min={20} max={160} step={5} format={(v) => `${v} km/h`} />
          </Ctl>
          <Ctl label="constant warning time">
            <Switch checked={cwt} onChange={setCwt} label={cwt ? 'on' : 'off'} />
          </Ctl>
          <p className="readout">
            warning before train <b className={late || fast ? 'bad' : r.warning > 60 ? 'warn' : 'ok'}>{Math.round(r.warning)} s</b><br />
            booms down before train{' '}
            <b className={late ? 'bad' : 'ok'}>{late ? `no: still lowering` : `${Math.round(r.boomsDownBeforeTrain)} s`}</b><br />
            road closed for <b>{Math.round(r.roadClosed)} s</b>
          </p>
          <p className={`status ${late || fast ? 'bad' : r.warning > 60 ? 'warn' : ''}`} style={{ flexBasis: '100%' }} aria-live="polite">
            {late
              ? `The train reaches the road before the booms are down.`
              : fast
                ? `Faster than the ${Math.round(DESIGN_KMH)} km/h the approach was sized for: only ${Math.round(r.warning)} s of warning, less than the ${TARGET_S} s the crossing was designed to give, with or without a predictor. Line speed and crossing design are tied together.`
                : r.warning > 60
                ? 'A long wait with nothing in sight. This is when drivers start to doubt the lights and go round the booms.'
                : cwt && kmh < DESIGN_KMH
                  ? `The predictor measured the train's speed and held the warning back, so it gets the same ${TARGET_S} s as a fast train.`
                  : 'About what the crossing was designed for.'}
          </p>
        </>
      }
      caption="Top: the plan of the crossing, with a strike-in point on each approach and the short island circuit over the road. Bottom: what happens after the train passes the strike-in point. Try a slow freight at 25 km/h, then turn on constant warning time. Then try a train faster than the design speed."
    >
      <Diagram scene={plan} viewBox={planBox} label="Plan of a level crossing with strike-in points on each approach" />
      <Diagram scene={scene} viewBox={box} duration={200} label="Timeline of lights, booms and train for one approach" />
    </Figure>
  );
}
