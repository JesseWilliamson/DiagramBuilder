// A track circuit in plan view: feed at one end, relay at the other, two rails
// between insulated joints. Blue shows where the current is flowing. Put a vehicle
// on it, rust the rails, break a rail, cut the power, and watch the relay.
import { useMemo, useState } from 'react';
import { combine, fitViewBox, path, rect, text, type Scene, type Tone } from 'dsviz';
import { Diagram, Segmented, Switch } from 'dsviz/react';
import { band, signal, track } from '../rail/draw';
import { evaluate, type TcInput } from '../rail/trackCircuit';
import { Ctl, Figure } from '../ui/blocks';

const L = 90, R = 560, TOP = 50, BOT = 100, AX = 320, BREAK = 200;

function draw(i: TcInput): Scene {
  const r = evaluate(i);
  const powered = !i.noPower && !i.brokenRail;
  const flow: Tone = 'accent';
  // the rails carry current from the feed as far as the shunt (or all the way to the relay)
  const cut = r.shunted ? AX : R;
  const railTone = (lo: number, hi: number): Tone | undefined => (powered && hi <= cut + 0.5 && lo < cut ? flow : undefined);
  const wire = (on: boolean): Tone => (on ? flow : 'muted');
  const relayFlow = powered && !r.shunted;
  const topA = i.brokenRail ? BREAK - 4 : cut;
  const topB = i.brokenRail ? BREAK + 4 : cut;
  const vw = i.vehicle === 'light' ? 34 : 90;
  return combine(
    i.rusty && band('rust:t', L + 2, R - 2, TOP, 10, 'orange'),
    i.rusty && band('rust:b', L + 2, R - 2, BOT, 10, 'orange'),
    track('top:a', [[L, TOP], [topA, TOP]], railTone(L, topA)),
    track('top:b', [[topB, TOP], [R, TOP]], i.brokenRail ? undefined : railTone(topB, R)),
    track('bot:a', [[L, BOT], [cut, BOT]], railTone(L, cut)),
    track('bot:b', [[cut, BOT], [R, BOT]], railTone(cut, R)),
    [L - 4, R + 4].flatMap((x, k) => [
      path({ id: `ij${k}t`, points: [[x, TOP - 8], [x, TOP + 8]], role: 'post' }),
      path({ id: `ij${k}b`, points: [[x, BOT - 8], [x, BOT + 8]], role: 'post' }),
    ]),
    // feed (left) and relay (right), wired across the two rails
    path({ id: 'w:ft', points: [[30, 62], [30, TOP], [L + 6, TOP]], role: 'curve', tone: wire(powered) }),
    path({ id: 'w:fb', points: [[30, 88], [30, BOT], [L + 6, BOT]], role: 'curve', tone: wire(powered) }),
    rect({ id: 'feed', x: 30, y: 75, w: 44, h: 26, rx: 5, tone: i.noPower ? 'muted' : undefined }),
    text({ id: 'feed:l', x: 30, y: 75.5, text: i.noPower ? 'no power' : 'feed', size: 10, anchor: 'middle', role: 'code' }),
    path({ id: 'w:rt', points: [[R - 6, TOP], [R + 40, TOP], [R + 40, 62]], role: 'curve', tone: wire(relayFlow) }),
    path({ id: 'w:rb', points: [[R - 6, BOT], [R + 40, BOT], [R + 40, 88]], role: 'curve', tone: wire(relayFlow) }),
    rect({ id: 'relay', x: R + 40, y: 75, w: 70, h: 26, rx: 5, tone: r.relayUp ? 'success' : 'danger' }),
    text({ id: 'relay:l', x: R + 40, y: 75.5, text: r.relayUp ? 'relay ↑ up' : 'relay ↓ down', size: 10, anchor: 'middle', role: 'code' }),
    signal({ id: 'sig', x: L - 30, y: TOP, aspect: r.relayUp ? 'clear' : 'stop', label: 'S6' }),
    i.brokenRail && text({ id: 'break:l', x: BREAK, y: TOP - 14, text: 'broken rail', size: 10.5, anchor: 'middle', role: 'label', tone: 'danger', weight: 600 }),
    i.vehicle !== 'none' && [
      rect({ id: 'veh', x: AX, y: (TOP + BOT) / 2, w: vw, h: BOT - TOP + 22, rx: 6, tone: 'ghost' }),
      path({ id: 'axle1', points: [[AX - vw / 2 + 12, TOP - 6], [AX - vw / 2 + 12, BOT + 6]], role: 'post' }),
      path({ id: 'axle2', points: [[AX + vw / 2 - 12, TOP - 6], [AX + vw / 2 - 12, BOT + 6]], role: 'post' }),
      text({ id: 'veh:l', x: AX, y: TOP - 24, text: i.vehicle === 'light' ? 'hi-rail' : 'wagon', size: 10.5, anchor: 'middle', role: 'code' }),
    ],
    i.rusty && text({ id: 'rust:l', x: 160, y: BOT + 20, text: 'rust film on the railhead', size: 10, anchor: 'middle', role: 'code', tone: 'muted' }),
  );
}

const viewBox = fitViewBox([draw({ vehicle: 'train', rusty: true, brokenRail: true, noPower: false })], 16);

export function TrackCircuitFig() {
  const [s, setS] = useState<TcInput>({ vehicle: 'none', rusty: false, brokenRail: false, noPower: false });
  const r = evaluate(s);
  const scene = useMemo(() => draw(s), [s]);
  const set = (p: Partial<TcInput>) => setS((o) => ({ ...o, ...p }));
  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="on the track">
            <Segmented value={s.vehicle} onChange={(v) => set({ vehicle: v })} options={[{ value: 'none', label: 'nothing' }, { value: 'train', label: 'wagon' }, { value: 'light', label: 'light vehicle' }]} />
          </Ctl>
          <Ctl label="rusty rails"><Switch checked={s.rusty} onChange={(v) => set({ rusty: v })} label={s.rusty ? 'rusty' : 'clean'} /></Ctl>
          <Ctl label="broken rail"><Switch checked={s.brokenRail} onChange={(v) => set({ brokenRail: v })} label={s.brokenRail ? 'broken' : 'intact'} /></Ctl>
          <Ctl label="power"><Switch checked={!s.noPower} onChange={(v) => set({ noPower: !v })} label={s.noPower ? 'off' : 'on'} /></Ctl>
          <p className="readout" style={{ flexBasis: '100%' }}>
            really there: <b>{r.truth}</b> · track circuit says: <b>{r.relayUp ? 'clear' : 'occupied'}</b> ·{' '}
            {r.failure === 'none' ? <b className="ok">correct</b> : r.failure === 'right-side' ? <b className="warn">right-side failure: safe, but delays trains</b> : <b className="bad">wrong-side failure: a vehicle the signal can't see</b>}
          </p>
        </>
      }
      caption="Blue is current. With nothing on the track it flows through the relay and holds it up: clear. A wheelset bridges the rails and takes the current away from the relay, which drops: occupied. Try a light vehicle on rusty rails."
    >
      <Diagram scene={scene} viewBox={viewBox} label="A track circuit with a feed, two rails, a relay and a signal" />
    </Figure>
  );
}
