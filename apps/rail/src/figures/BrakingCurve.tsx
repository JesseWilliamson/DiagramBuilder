// Speed against distance on the approach to a signal at stop. Three supervision
// curves fall to zero at the end of authority; the blue line is the train. Set when
// the driver starts braking, run it, and see what ETCS does when they leave it too late.
import { useEffect, useMemo, useState } from 'react';
import { combine, fitViewBox, rect, text, type Scene } from 'dsviz';
import { axes, fn, plane, point, segment } from 'dsviz/plot';
import { Button, Diagram, Slider, Switch, useTicker } from 'dsviz/react';
import { BALISES, EOA, drive, interventionCurve, permittedCurve, speedAt, warningCurve, type Run } from '../rail/braking';
import { Ctl, Figure } from '../ui/blocks';

const p = plane({ x: [0, 2200], y: [0, 120], width: 640, height: 250 });
const NEVER = 2100;

function draw(run: Run, pos: number, atp: boolean): Scene {
  const v = speedAt(run);
  const upTo = Math.min(pos, run.stop || 2200);
  const at = (x: number, y: number) => p.toPx(x, y);
  const eoa = at(EOA, 0);
  const passed = (x?: number) => x !== undefined && pos >= x;
  return combine(
    axes(p, { xTicks: 500, yTicks: 20, grid: true, xLabel: 'distance (m)', yLabel: 'km/h' }),
    BALISES.flatMap((b, i) => {
      const c = at(b.x, 0);
      return [
        rect({ id: `bal${i}`, x: c.x, y: c.y - 5, w: 14, h: 8, rx: 1.5, tone: 'active' }),
        text({ id: `bal${i}:l`, x: c.x, y: c.y - 16, text: b.label, size: 10, anchor: 'middle', role: 'code', tone: 'muted' }),
      ];
    }),
    fn(p, warningCurve, { id: 'warn', tone: 'active', dashed: true, domain: [0, EOA] }),
    fn(p, permittedCurve, { id: 'perm', tone: 'orange', domain: [0, EOA] }),
    atp && fn(p, interventionCurve, { id: 'int', tone: 'danger', domain: [0, EOA] }),
    segment(p, { x: EOA, y: 0 }, { x: EOA, y: 112 }, { id: 'eoa', tone: 'danger', dashed: true }),
    text({ id: 'eoa:l', x: eoa.x + 6, y: at(0, 114).y, text: 'end of authority: S14 at stop', size: 10.5, anchor: 'start', role: 'label', tone: 'danger', weight: 600 }),
    upTo > 2 && fn(p, v, { id: 'train', domain: [0, upTo], samples: 200 }),
    run.warning !== undefined && passed(run.warning) && point(p, run.warning, v(run.warning), { id: 'ev:w', tone: 'active', r: 4 }),
    atp && run.intervention !== undefined && passed(run.intervention) && point(p, run.intervention, v(run.intervention), { id: 'ev:i', tone: 'danger', r: 4 }),
    point(p, upTo, v(upTo), { id: 'pos', r: 6 }),
  );
}

const viewBox = fitViewBox([draw(drive(100, NEVER, false), 2200, true)], 18);

export function BrakingCurve({ onSaved }: { onSaved?: () => void }) {
  const [speed, setSpeed] = useState(95);
  const [brakeAt, setBrakeAt] = useState(1000);
  const [atp, setAtp] = useState(true);
  const [pos, setPos] = useState(2200);
  const [playing, setPlaying] = useState(false);
  const run = useMemo(() => drive(speed, brakeAt >= NEVER ? Infinity : brakeAt, atp), [speed, brakeAt, atp]);
  const tick = useTicker(40, playing);
  useEffect(() => {
    if (!playing) return;
    setPos((x) => {
      const n = x + 18;
      if (n >= run.stop) {
        setPlaying(false);
        if (atp && run.intervention !== undefined && run.overrun === 0) onSaved?.();
      }
      return Math.min(n, run.stop);
    });
  }, [tick, playing, run, atp, onSaved]);
  const change = <T,>(set: (v: T) => void) => (v: T) => (set(v), setPlaying(false), setPos(2200));
  const scene = useMemo(() => draw(run, pos, atp), [run, pos, atp]);
  const done = pos >= run.stop;
  const m = (x?: number) => (x === undefined ? '' : `${Math.round(x).toLocaleString()} m`);

  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="approach speed">
            <Slider value={speed} onChange={change(setSpeed)} min={60} max={100} step={5} format={(v) => `${v} km/h`} />
          </Ctl>
          <Ctl label="driver starts braking at">
            <Slider value={brakeAt} onChange={change(setBrakeAt)} min={600} max={NEVER} step={25} format={(v) => (v >= NEVER ? 'never' : `${v} m`)} />
          </Ctl>
          <Ctl label="ETCS fitted"><Switch checked={atp} onChange={change(setAtp)} label={atp ? 'yes' : 'no'} /></Ctl>
          <div className="btn-row" style={{ alignSelf: 'flex-end' }}>
            <Button variant="primary" onClick={() => (setPos(0), setPlaying(true))}>Run the approach</Button>
          </div>
          <p className="readout" style={{ flexBasis: '100%' }}>
            {run.warning !== undefined ? <>warning sounds at <b className="warn">{m(run.warning)}</b> · </> : <>no warning · </>}
            {run.overspeed !== undefined && <>over the permitted curve at <b className="warn">{m(run.overspeed)}</b> · </>}
            {atp && run.intervention !== undefined && <>ETCS applies the brakes at <b className="bad">{m(run.intervention)}</b> · </>}
            stops at <b>{m(run.stop)}</b>:{' '}
            {run.overrun > 0 ? <b className="bad">passes S14 at stop by {m(run.overrun)} (a SPAD)</b> : <b className="ok">{m(EOA - run.stop)} short of S14</b>}
            {!done && playing && <span className="muted"> · running…</span>}
          </p>
        </>
      }
      caption="Speed against distance. The yellow dashed curve is where the driver is warned, orange is the permitted speed, red is where the computer takes over. Each curve is v = √(2ad) for a different deceleration a, falling to zero at the end of authority. Leave the braking late with and without ETCS."
    >
      <Diagram scene={scene} viewBox={viewBox} duration={100} label="Speed-distance graph of a train approaching a signal at stop, with ETCS braking curves" />
    </Figure>
  );
}
