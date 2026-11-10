// A train graph (time across, distance down) for a single line with three crossing
// loops. Two freights head towards each other; the controller chooses where they cross.
//
// The interesting part is `plan()`: crossing at a loop means whichever train gets
// there first waits until the other has arrived and is clear, because the section
// beyond is occupied by the opposing train. Everything on screen is drawn from
// its result, so the picture can never disagree with the arithmetic.
import { useMemo, useState } from 'react';
import { combine, fitViewBox, path, text, type Part, type Scene } from 'dsviz';
import { Diagram, Segmented, Slider } from 'dsviz/react';
import { Ctl, Figure } from '../ui/blocks';

import { END, down, places, plan, up } from '../rail/crossing';

const X0 = 90, PX_MIN = 2.6, PX_KM = 2.1, T_MAX = 210;
const tx = (t: number) => X0 + t * PX_MIN;
const ky = (km: number) => km * PX_KM;
export const clock = (t: number) => {
  const m = Math.round(t) + 6 * 60;
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

function draw(loopId: string, upDep: number): Scene {
  const p = plan(loopId, upDep);
  const grid: Part[] = [];
  for (let t = 0; t <= T_MAX; t += 30) {
    grid.push(path({ id: `g:t${t}`, points: [[tx(t), -8], [tx(t), ky(END) + 8]], role: 'grid' }));
    grid.push(text({ id: `g:l${t}`, x: tx(t), y: ky(END) + 24, text: clock(t), size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }));
  }
  const rows = places.flatMap((pl) => [
    path({ id: `row:${pl.id}`, points: [[X0 - 4, ky(pl.km)], [tx(T_MAX), ky(pl.km)]], role: 'grid' }),
    text({ id: `row:${pl.id}:n`, x: X0 - 10, y: ky(pl.km) - (pl.loop ? 5 : 0), text: pl.name, size: 12, anchor: 'end', weight: 600, tone: pl.id === loopId ? undefined : 'muted', role: 'label' }),
    !!pl.loop && text({ id: `row:${pl.id}:l`, x: X0 - 10, y: ky(pl.km) + 9, text: `loop ${pl.loop.toLocaleString()} m`, size: 9.5, anchor: 'end', role: 'code', tone: 'muted' }),
  ]);
  const L = ky(p.loop.km);
  const dTone = 'accent', uTone = 'orange';
  const waitLabel = (who: 'down' | 'up') => {
    const [a, b, delay] = who === 'down' ? [p.dArrive, p.dLeave, p.dDelay] : [p.uArrive, p.uLeave, p.uDelay];
    return delay > 0.5 && text({ id: `wait:${who}`, x: tx((a + b) / 2), y: L + (who === 'down' ? -9 : 15), text: `waits ${Math.round(delay)} min`, size: 10.5, anchor: 'middle', role: 'code' });
  };
  return combine(
    grid,
    rows,
    path({ id: 'down', points: [[tx(down.dep), 0], [tx(p.dArrive), L], [tx(p.dLeave), L], [tx(p.dEnd), ky(END)]], role: 'path', tone: dTone }),
    path({ id: 'up', points: [[tx(upDep), ky(END)], [tx(p.uArrive), L], [tx(p.uLeave), L], [tx(p.uEnd), 0]], role: 'path', tone: uTone }),
    text({ id: 'down:n', x: tx(down.dep) + 6, y: -12, text: `${down.id} ↓`, size: 11, anchor: 'start', role: 'code', weight: 600 }),
    text({ id: 'up:n', x: tx(upDep) + 6, y: ky(END) + 12, text: `${up.id} ↑`, size: 11, anchor: 'start', role: 'code', weight: 600 }),
    waitLabel('down'),
    waitLabel('up'),
    !p.ok && text({ id: 'bad', x: tx(Math.min(p.dArrive, p.uArrive)) - 8, y: L - 10, text: 'neither train fits this loop', size: 11, anchor: 'end', role: 'label', tone: 'danger', weight: 600 }),
  );
}

// Fit the camera once, around the extremes, so it never moves as you drag.
const viewBox = fitViewBox([draw('B', 0), draw('D', 0), draw('B', 60), draw('D', 60), draw('C', 30)], 18);

export function TrainGraph() {
  const [loop, setLoop] = useState('B');
  const [upDep, setUpDep] = useState(0);
  const p = useMemo(() => plan(loop, upDep), [loop, upDep]);
  const scene = useMemo(() => draw(loop, upDep), [loop, upDep]);
  const total = Math.round(p.dDelay + p.uDelay);
  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="cross at">
            <Segmented value={loop} onChange={setLoop} options={places.filter((x) => x.loop).map((x) => ({ value: x.id, label: x.name }))} />
          </Ctl>
          <Ctl label={`${up.id} departs Emu Flat`}>
            <Slider value={upDep} onChange={setUpDep} min={0} max={60} step={5} format={(v) => clock(v)} />
          </Ctl>
          <p className="readout">
            {down.id}: {down.length.toLocaleString()} m, {down.speed} km/h<br />
            {up.id}: {up.length.toLocaleString()} m, {up.speed} km/h<br />
            <br />
            {p.ok ? (
              <>
                {down.id} delayed <b>{Math.round(p.dDelay)} min</b><br />
                {up.id} delayed <b>{Math.round(p.uDelay)} min</b><br />
                total <b className={total > 30 ? 'warn' : 'ok'}>{total} min</b>
              </>
            ) : (
              <span className="bad">Both trains are longer than the {p.loop.loop?.toLocaleString()} m loop at {p.loop.name}. Neither can stand clear of the main line, so they can't cross there.</span>
            )}
          </p>
        </>
      }
      caption="Time runs left to right, distance down the page. A steeper line is a faster train, a flat line is a train standing in a loop. Change the crossing loop and the up train's departure, and find the plan with the least total delay. Some loops are shorter than the trains."
    >
      <Diagram scene={scene} viewBox={viewBox} label="Train graph of two trains crossing on a single line" />
    </Figure>
  );
}
