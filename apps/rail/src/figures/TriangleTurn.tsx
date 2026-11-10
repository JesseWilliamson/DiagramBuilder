// Turning a locomotive on a triangle (a wye): forward, reverse, forward.
// No moving bridge, just three sets of points, and the loco ends up facing the other way.
import { useMemo } from 'react';
import { combine, fitViewBox, path, text, type Scene } from 'dsviz';
import { Diagram, Transport, usePlayer } from 'dsviz/react';
import { track } from '../rail/draw';
import { Figure } from '../ui/blocks';

type Pt = [number, number];
// track: a main line, two legs up to an apex, and a short tail track beyond the apex
const W: Pt = [150, 150], E: Pt = [350, 150], APEX: Pt = [250, 60], TAIL: Pt = [250, -10];

type Step = { at: Pt; cab: Pt; note: string }; // cab: a unit-ish vector the cab end points along
const unit = (a: Pt, b: Pt): Pt => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
};
const steps: Step[] = [
  { at: [50, 150], cab: [1, 0], note: 'The loco arrives from the west, cab leading, heading east. It needs to go back west, cab first.' },
  { at: [200, 105], cab: unit(W, APEX), note: 'Forward through the west points onto the west leg.' },
  { at: [250, 20], cab: [0, -1], note: 'On through the apex into the tail track, and stop clear of the points behind it.' },
  { at: [300, 105], cab: unit(E, APEX), note: 'The points at the apex are changed. Reverse out of the tail track and down the east leg. The cab is now trailing.' },
  { at: [440, 150], cab: [-1, 0], note: 'Reverse through the east points onto the main line, and stop clear of them.' },
  { at: [60, 150], cab: [-1, 0], note: 'Drive forward, west along the main line. Same loco, cab leading, facing the other way: three moves, two reversals.' },
];

function locoBox(c: Pt, d: Pt, from: number, to: number, w = 16): Pt[] {
  const n: Pt = [-d[1], d[0]];
  return [
    [c[0] + d[0] * from + n[0] * w / 2, c[1] + d[1] * from + n[1] * w / 2],
    [c[0] + d[0] * to + n[0] * w / 2, c[1] + d[1] * to + n[1] * w / 2],
    [c[0] + d[0] * to - n[0] * w / 2, c[1] + d[1] * to - n[1] * w / 2],
    [c[0] + d[0] * from - n[0] * w / 2, c[1] + d[1] * from - n[1] * w / 2],
  ];
}

function draw(i: number): Scene {
  const s = steps[i];
  return combine(
    track('main', [[0, 150], [500, 150]]),
    track('wleg', [W, APEX]),
    track('eleg', [E, APEX]),
    track('tail', [APEX, TAIL]),
    text({ id: 'w', x: W[0], y: 172, text: 'west points', size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
    text({ id: 'e', x: E[0], y: 172, text: 'east points', size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
    text({ id: 'a', x: APEX[0] + 14, y: APEX[1] + 4, text: 'apex points', size: 10.5, anchor: 'start', role: 'code', tone: 'muted' }),
    path({ id: 'loco', points: locoBox(s.at, s.cab, -32, 32), closed: true, tone: 'accent' }),
    path({ id: 'cab', points: locoBox(s.at, s.cab, 14, 32), closed: true, tone: 'visited' }),
  );
}

const viewBox = fitViewBox(steps.map((_, i) => draw(i)), 18);

export function TriangleTurn() {
  const player = usePlayer(() => steps.map((_, i) => i), [], { interval: 1600 });
  const i = player.frame ?? 0;
  const scene = useMemo(() => draw(i), [i]);
  return (
    <Figure
      wide
      panel={
        <div style={{ flexBasis: '100%', display: 'grid', gap: 8 }}>
          <p className="status">{steps[i].note}</p>
          <Transport player={player} />
        </div>
      }
      caption="A triangle turns a loco, or a whole train if the tail track is long enough, with nothing but points. The purple end is the cab."
    >
      <Diagram scene={scene} viewBox={viewBox} duration={700} label="A triangle junction used to turn a locomotive" />
    </Figure>
  );
}
