// Two signals, A in rear of B. Choose what the interlocking wants B to show, fail
// B's lamps one at a time, and watch both what B can actually show and what A does about it.
import { useMemo, useState } from 'react';
import { circle, combine, fitViewBox, path, rect, text, type Scene } from 'dsviz';
import { Diagram, Segmented, Switch } from 'dsviz/react';
import { track, train } from '../rail/draw';
import { lampOf, rearAspect, shown, type Lamp, type Shown } from '../rail/lampProving';
import { Ctl, Figure } from '../ui/blocks';

const Y = 150;
const LAMPS: Lamp[] = ['red', 'yellow', 'green'];
const toneOf = { red: 'danger', yellow: 'active', green: 'success' } as const;
const word: Record<Shown, string> = { stop: 'Stop', caution: 'Caution', clear: 'Clear', dark: 'Dark' };

/** A three-lamp head on a post, with a hood over each lamp and a cross over any failed one. */
function head(id: string, x: number, show: Shown, failed: ReadonlySet<Lamp>, label: string): Scene {
  const top = Y - 110;
  const lit = show === 'dark' ? null : lampOf[show];
  return combine(
    path({ id: `${id}:post`, points: [[x, Y - 4], [x, top + 66]], role: 'post' }),
    rect({ id: `${id}:board`, x, y: top + 30, w: 34, h: 76, rx: 8 }),
    LAMPS.flatMap((l, i) => {
      const cy = top + 8 + i * 22;
      return [
        path({ id: `${id}:hood${i}`, points: [[x - 12, cy - 7], [x - 10, cy - 11], [x + 10, cy - 11], [x + 12, cy - 7]], role: 'post' }),
        circle({ id: `${id}:${l}`, x, y: cy, r: 7.5, role: 'lamp', tone: lit === l ? toneOf[l] : undefined }),
        failed.has(l) && path({ id: `${id}:x${i}a`, points: [[x - 6, cy - 6], [x + 6, cy + 6]], role: 'post' }),
        failed.has(l) && path({ id: `${id}:x${i}b`, points: [[x + 6, cy - 6], [x - 6, cy + 6]], role: 'post' }),
      ];
    }),
    text({ id: `${id}:label`, x: x + 26, y: top + 4, text: label, size: 12, anchor: 'start', role: 'code', weight: 600 }),
    text({ id: `${id}:shows`, x: x + 26, y: top + 20, text: word[show], size: 11, anchor: 'start', role: 'label', tone: show === 'clear' ? 'success' : show === 'caution' ? 'active' : 'danger' }),
  );
}

function draw(want: 'stop' | 'caution' | 'clear', failed: ReadonlySet<Lamp>): Scene {
  const b = shown(want, failed);
  const a = rearAspect(b);
  return combine(
    track('line', [[0, Y], [640, Y]]),
    head('A', 200, a, new Set(), 'A'),
    head('B', 480, b, failed, 'B'),
    train({ id: 'train', x1: 20, x2: 120, y: Y - 12, label: 'driver →', h: 14 }),
    text({ id: 'note', x: 340, y: Y + 26, text: b === 'dark' ? 'B is dark: A is held at stop' : `B proved at ${word[b].toLowerCase()}: A shows ${word[a].toLowerCase()}`, size: 11.5, anchor: 'middle', role: 'code', tone: b === 'dark' ? 'danger' : 'muted' }),
  );
}

const viewBox = fitViewBox([draw('stop', new Set(LAMPS)), draw('clear', new Set())], 16);

export function LampProving() {
  const [want, setWant] = useState<'stop' | 'caution' | 'clear'>('clear');
  const [failed, setFailed] = useState<Set<Lamp>>(new Set());
  const scene = useMemo(() => draw(want, failed), [want, failed]);
  const b = shown(want, failed);
  const toggle = (l: Lamp, on: boolean) => setFailed((f) => {
    const n = new Set(f);
    if (on) n.add(l); else n.delete(l);
    return n;
  });
  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="interlocking wants B to show">
            <Segmented value={want} onChange={setWant} options={[{ value: 'stop', label: 'Stop' }, { value: 'caution', label: 'Caution' }, { value: 'clear', label: 'Clear' }]} />
          </Ctl>
          {LAMPS.map((l) => (
            <Ctl key={l} label={`B ${l} lamp`}>
              <Switch checked={failed.has(l)} onChange={(v) => toggle(l, v)} label={failed.has(l) ? 'failed' : 'working'} />
            </Ctl>
          ))}
          <p className="readout" style={{ flexBasis: '100%' }}>
            B asked for <b>{word[want]}</b>, proved <b className={b === 'dark' ? 'bad' : b === want ? 'ok' : 'warn'}>{word[b]}</b>
            {b !== want && b !== 'dark' ? ': stepped down to the next lamp it can prove' : ''}
            {b === 'dark' ? ': no lamp that it may show is proved, so A is held at stop' : ''}.
          </p>
        </>
      }
      caption="A is the signal in rear of B. A crossed-out lamp has failed. The interlocking only counts a lamp as showing if it can prove current flowing through it. Fail B's green while it should be clear, then fail its red while it should be at stop."
    >
      <Diagram scene={scene} viewBox={viewBox} label="Two signals, A in rear of B, with lamps that can be failed" />
    </Figure>
  );
}
