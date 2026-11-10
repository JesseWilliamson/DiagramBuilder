// A crossing loop's control panel. Set and cancel routes; the interlocking refuses
// anything that conflicts, and holds a cancelled route locked if a train is approaching.
import { useEffect, useMemo, useState } from 'react';
import { combine, fitViewBox, text, type Scene, type Tone } from 'dsviz';
import { Button, Diagram, Switch, useTicker } from 'dsviz/react';
import { signal, track, train, type Aspect } from '../rail/draw';
import { conflict, pointsLie, routeById, routes, type Lie, type Points, type Route, type Section } from '../rail/interlocking';
import { Ctl, Figure } from '../ui/blocks';

const MAIN = 60, LOOP = 120;
const RELEASE_MS = 8000; // stands in for the two minutes or so a real timer runs
// which signal a route leads to: the aspect of the entrance signal depends on it
const exitSignal: Record<string, string | undefined> = { 'S1-main': 'S3', 'S1-loop': 'S5', 'S2-main': 'S4', 'S2-loop': 'S6' };

type State = { set: string[]; releasing: Record<string, number>; lie: Record<Points, Lie>; approaching: boolean };

function aspectsOf(s: State): Record<string, Aspect> {
  const live = s.set.filter((id) => !(id in s.releasing));
  const out: Record<string, Aspect> = {};
  for (const sig of ['S3', 'S4', 'S5', 'S6', 'S1', 'S2']) {
    const r = live.map((id) => routeById[id]).find((x) => x.signal === sig);
    if (!r) out[sig] = 'stop';
    else {
      const next = exitSignal[r.id];
      out[sig] = next && out[next] === 'stop' ? 'caution' : 'clear';
    }
  }
  return out;
}

function draw(s: State): Scene {
  const locked = s.set.map((id) => routeById[id]);
  const lie = pointsLie(locked, s.lie);
  const asp = aspectsOf(s);
  const tone = (sec: Section): Tone | undefined =>
    sec === 'west' && s.approaching ? 'danger' : locked.some((r) => r.sections.includes(sec)) ? 'accent' : undefined;
  // a points leg is drawn in the route colour only if a route runs over it, and faint if the points don't lie that way
  const leg = (p: Points, l: Lie, sec: Section): Tone | undefined => (lie[p] !== l ? 'muted' : tone(sec) ? tone(sec) : undefined);
  const releasing = (sig: string) => Object.keys(s.releasing).some((id) => routeById[id].signal === sig);
  return combine(
    track('t:west', [[0, MAIN], [128, MAIN]], tone('west')),
    track('t:11', [[132, MAIN], [150, MAIN]], tone('p11')),
    track('t:11N', [[150, MAIN], [208, MAIN]], leg('11', 'N', 'p11')),
    track('t:11R', [[150, MAIN], [196, LOOP - 4], [208, LOOP]], leg('11', 'R', 'p11')),
    track('t:main', [[212, MAIN], [488, MAIN]], tone('main')),
    track('t:loop', [[212, LOOP], [488, LOOP]], tone('loop')),
    track('t:12N', [[492, MAIN], [550, MAIN]], leg('12', 'N', 'p12')),
    track('t:12R', [[492, LOOP], [504, LOOP - 4], [550, MAIN]], leg('12', 'R', 'p12')),
    track('t:12', [[550, MAIN], [568, MAIN]], tone('p12')),
    track('t:east', [[572, MAIN], [700, MAIN]], tone('east')),
    text({ id: 'name', x: 350, y: MAIN - 34, text: 'Coolabah', size: 13, anchor: 'middle', weight: 600 }),
    text({ id: 'p11', x: 150, y: MAIN + 18, text: `11 ${lie['11']}`, size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
    text({ id: 'p12', x: 550, y: MAIN + 18, text: `12 ${lie['12']}`, size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
    signal({ id: 'S1', x: 118, y: MAIN, aspect: asp.S1, label: releasing('S1') ? 'S1 ⏱' : 'S1' }),
    signal({ id: 'S3', x: 500, y: MAIN, aspect: asp.S3, label: 'S3' }),
    signal({ id: 'S5', x: 480, y: LOOP, aspect: asp.S5, label: 'S5', side: 1 }),
    signal({ id: 'S2', x: 582, y: MAIN, aspect: asp.S2, label: 'S2', side: 1, facing: -1 }),
    signal({ id: 'S4', x: 200, y: MAIN, aspect: asp.S4, label: 'S4', side: 1, facing: -1 }),
    signal({ id: 'S6', x: 220, y: LOOP, aspect: asp.S6, label: 'S6', side: 1, facing: -1 }),
    s.approaching && train({ id: 'down', x1: 22, x2: 98, y: MAIN - 22, label: '1MP5 →' }),
  );
}

const viewBox = fitViewBox([draw({ set: [], releasing: { 'S1-main': 1 }, lie: { '11': 'N', '12': 'N' }, approaching: true })], 18);

export function LoopPanel() {
  const [s, setS] = useState<State>({ set: [], releasing: {}, lie: { '11': 'N', '12': 'N' }, approaching: false });
  const [msg, setMsg] = useState<{ text: string; kind?: 'ok' | 'bad' | 'warn' }>({ text: 'Pick a route to set it. Pick a set route to cancel it.' });
  const timing = Object.keys(s.releasing).length > 0;
  const now = useTicker(250, timing) && Date.now();

  // release any route whose approach-locking timer has run out
  useEffect(() => {
    const done = Object.entries(s.releasing).filter(([, t]) => Date.now() >= t).map(([id]) => id);
    if (!done.length) return;
    setS((p) => {
      const releasing = { ...p.releasing };
      done.forEach((id) => delete releasing[id]);
      return { ...p, set: p.set.filter((id) => !done.includes(id)), releasing, lie: pointsLie(p.set.map((id) => routeById[id]), p.lie) };
    });
    setMsg({ text: `Timer expired: ${done.map((id) => routeById[id].name).join(', ')} released.`, kind: 'ok' });
  }, [now, s.releasing]);

  const press = (r: Route) => {
    if (s.releasing[r.id]) return setMsg({ text: `${r.name} is approach locked. Its signal is at stop, but the route stays locked until the timer runs out.`, kind: 'warn' });
    if (s.set.includes(r.id)) {
      // cancel: with a train approaching the signal, the route can't be freed straight away
      if (r.signal === 'S1' && s.approaching) {
        setS((p) => ({ ...p, releasing: { ...p.releasing, [r.id]: Date.now() + RELEASE_MS } }));
        return setMsg({ text: `S1 back to stop. A train is approaching it, so ${r.name} stays approach locked while the timer runs, in case the driver can't stop.`, kind: 'warn' });
      }
      setS((p) => ({ ...p, set: p.set.filter((id) => id !== r.id), lie: pointsLie(p.set.map((id) => routeById[id]), p.lie) }));
      return setMsg({ text: `${r.name} cancelled and released at once: nothing was approaching.` });
    }
    const why = conflict(r, s.set.map((id) => routeById[id]));
    if (why) return setMsg({ text: `Refused. ${why}`, kind: 'bad' });
    setS((p) => ({ ...p, set: [...p.set, r.id] }));
    setMsg({ text: `${r.name} set: points called and locked, sections reserved, ${r.signal} cleared.`, kind: 'ok' });
  };

  const scene = useMemo(() => draw(s), [s]);
  return (
    <Figure
      panel={
        <>
          <Ctl label="routes">
            <div className="btn-row">
              {routes.map((r) => (
                <Button key={r.id} onClick={() => press(r)} variant={s.set.includes(r.id) ? 'primary' : 'ghost'}>
                  {r.name}{s.releasing[r.id] ? ` ⏱ ${Math.max(0, Math.ceil((s.releasing[r.id] - Date.now()) / 1000))}` : ''}
                </Button>
              ))}
            </div>
          </Ctl>
          <Ctl label="train approaching S1">
            <Switch checked={s.approaching} onChange={(v) => setS((p) => ({ ...p, approaching: v }))} label={s.approaching ? 'yes' : 'no'} />
          </Ctl>
          <p className={`status ${msg.kind ?? ''}`} aria-live="polite" style={{ flexBasis: '100%' }}>{msg.text}</p>
        </>
      }
      wide
      caption="Blue track is locked in a route. Faint legs show which way points are not lying. Set S1 → main and S2 → loop together to cross two trains, then try S2 → main as well. Put a train on the approach to S1, set a route, and cancel it."
    >
      <Diagram scene={scene} viewBox={viewBox} label="Control panel for a single-line crossing loop with two sets of points and six signals" />
    </Figure>
  );
}
