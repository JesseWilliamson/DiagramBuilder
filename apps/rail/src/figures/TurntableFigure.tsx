// A turntable from above. Turn the bridge, lock it, drive the loco on and off.
// The task: the loco arrived cab first; send it back out the way it came, cab first again.
import { useMemo, useState } from 'react';
import { circle, combine, fitViewBox, path, text, type Scene, type Tone } from 'dsviz';
import { Button, Diagram, Slider } from 'dsviz/react';
import { track } from '../rail/draw';
import { alignedRoads, cabOutward, driveOff, driveOn, lock, norm, roads, rotate, type Result, type Table } from '../rail/turntable';
import { Ctl, Figure } from '../ui/blocks';

const R = 110, ROAD_IN = R + 6, ROAD_OUT = 250, LOCO_L = 100, LOCO_W = 24;
const rad = (d: number) => (d * Math.PI) / 180;
const at = (r: number, a: number): [number, number] => [r * Math.cos(rad(a)), r * Math.sin(rad(a))];

/** A rectangle of length l and width w centred on c, its long axis along angle a. */
function box(c: [number, number], a: number, l: number, w: number, from = -l / 2, to = l / 2): [number, number][] {
  const [ux, uy] = [Math.cos(rad(a)), Math.sin(rad(a))];
  const [nx, ny] = [-uy, ux];
  return [
    [c[0] + ux * from + nx * w / 2, c[1] + uy * from + ny * w / 2],
    [c[0] + ux * to + nx * w / 2, c[1] + uy * to + ny * w / 2],
    [c[0] + ux * to - nx * w / 2, c[1] + uy * to - ny * w / 2],
    [c[0] + ux * from - nx * w / 2, c[1] + uy * from - ny * w / 2],
  ];
}

function draw(t: Table): Scene {
  const aligned = alignedRoads(t.angle).map((r) => r.id);
  const locoCentre: [number, number] = t.loco.at === 'bridge' ? [0, 0] : at((ROAD_IN + ROAD_OUT) / 2 + 4, roads.find((r) => r.id === t.loco.at)!.angle);
  const roadTone = (id: string): Tone | undefined => (t.locked && aligned.includes(id) ? 'accent' : undefined);
  const boltTone: Tone = t.locked ? 'danger' : 'muted';
  return combine(
    circle({ id: 'pit', x: 0, y: 0, r: R, tone: 'muted' }),
    circle({ id: 'ring', x: 0, y: 0, r: R - 8, role: 'outline' }),
    circle({ id: 'pivot', x: 0, y: 0, r: 5, role: 'dot' }),
    roads.flatMap((r) => [
      track(`road:${r.id}`, [at(ROAD_IN, r.angle), at(ROAD_OUT, r.angle)], roadTone(r.id)),
      text({ id: `road:${r.id}:l`, x: at(ROAD_OUT + 22, r.angle)[0], y: at(ROAD_OUT + 22, r.angle)[1], text: r.name, size: 11, anchor: Math.abs(norm(r.angle) - 90) < 1 || Math.abs(norm(r.angle) - 270) < 1 ? 'middle' : Math.cos(rad(r.angle)) > 0 ? 'start' : 'end', role: 'code', tone: 'muted' }),
    ]),
    path({ id: 'girder', points: box([0, 0], t.angle, 2 * R - 6, 34), closed: true, tone: 'muted' }),
    track('bridge', [at(R - 3, t.angle + 180), at(R - 3, t.angle)], t.locked ? 'accent' : undefined),
    [0, 180].map((e) => path({ id: `bolt${e}`, points: box(at(R - 10, t.angle + e), t.angle, 10, 10), closed: true, tone: boltTone })),
    path({ id: 'loco', points: box(locoCentre, t.loco.heading, LOCO_L, LOCO_W), closed: true, tone: 'accent' }),
    path({ id: 'cab', points: box(locoCentre, t.loco.heading, LOCO_L, LOCO_W, LOCO_L / 2 - 26, LOCO_L / 2), closed: true, tone: 'visited' }),
    text({ id: 'cab:l', x: at(LOCO_L / 2 - 13, t.loco.heading)[0] + locoCentre[0], y: at(LOCO_L / 2 - 13, t.loco.heading)[1] + locoCentre[1], text: 'cab', size: 9.5, anchor: 'middle', role: 'code' }),
  );
}

const start: Table = { angle: 0, locked: true, loco: { at: 'main', heading: 0 } };
const viewBox = fitViewBox([draw(start), draw({ ...start, angle: 45, loco: { at: 'bridge', heading: 45 } })], 16);

export function TurntableFigure() {
  const [t, setT] = useState<Table>(start);
  const [msg, setMsg] = useState<{ text: string; kind?: 'ok' | 'bad' | 'warn' }>({ text: 'The loco has arrived from the main line, cab first. Send it back out onto the main line, cab first again.' });
  const apply = (r: Result) => {
    if (r.ok) setT(r.table);
    if (r.msg || !r.ok) setMsg({ text: r.msg, kind: r.ok ? undefined : 'bad' });
    const out = cabOutward(r.table);
    if (r.ok && r.table.loco.at === 'main' && out) setMsg({ text: 'Turned. The loco is back on the main-line road with its cab leading away from the table.', kind: 'ok' });
  };
  const scene = useMemo(() => draw(t), [t]);
  const aligned = alignedRoads(t.angle);
  const out = cabOutward(t);
  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="bridge angle">
            <Slider value={t.angle} onChange={(v) => apply(rotate(t, v))} min={0} max={359} step={1} format={(v) => `${v}°`} />
          </Ctl>
          <div className="btn-row" style={{ alignSelf: 'flex-end' }}>
            <Button onClick={() => apply(lock(t, !t.locked))}>{t.locked ? 'Withdraw bolt' : 'Insert locking bolt'}</Button>
            {t.loco.at !== 'bridge' ? (
              <Button onClick={() => apply(driveOn(t))}>Drive loco onto bridge</Button>
            ) : (
              roads.map((r) => (
                <Button key={r.id} onClick={() => apply(driveOff(t, r.id))} variant={aligned.some((a) => a.id === r.id) ? 'ghost' : undefined} disabled={!aligned.some((a) => a.id === r.id)}>
                  Off to {r.name}
                </Button>
              ))
            )}
          </div>
          <p className="readout" style={{ flexBasis: '100%' }}>
            bolt <b className={t.locked ? 'ok' : 'warn'}>{t.locked ? 'in' : 'out'}</b> · lined up with{' '}
            <b>{aligned.length ? aligned.map((r) => r.name).join(', ') : 'nothing'}</b> · loco{' '}
            <b>{t.loco.at === 'bridge' ? 'on the bridge' : `on ${roads.find((r) => r.id === t.loco.at)!.name}`}</b>
            {out !== null && <>, cab <b>{out ? 'facing away from the table' : 'facing the table'}</b></>}
          </p>
          <p className={`status ${msg.kind ?? ''}`} aria-live="polite" style={{ flexBasis: '100%' }}>{msg.text}</p>
        </>
      }
      caption="The bridge spins on a centre pivot over the pit, its ends running on a circular rail. Rails meet only when the bridge is lined up with a road, and the locking bolt holds it there. Drive on, withdraw the bolt, turn, line up, lock, drive off."
    >
      <Diagram scene={scene} viewBox={viewBox} duration={180} label="Turntable seen from above, with a bridge, a locomotive and five radial roads" />
    </Figure>
  );
}
