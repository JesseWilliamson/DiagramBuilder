// Absolute Signal Blocking from the controller's side. A worksite lies beyond S14;
// the Protection Officer asks for S14 to be held at stop with blocking applied.
// Whether that protects anyone depends entirely on where the trains are when you do it.
import { useMemo, useState } from 'react';
import { combine, fitViewBox, rect, text, type Scene } from 'dsviz';
import { Button, Diagram, Slider } from 'dsviz/react';
import { aspects, occupied, type Line } from '../rail/blocks';
import { band, signal, track, train } from '../rail/draw';
import { Ctl, Figure } from '../ui/blocks';

const line: Line = { signals: [40, 200, 360, 520], end: 700 };
const names = ['S10', 'S12', 'S14', 'S16'];
const PROTECT = 2; // S14
const WORK: [number, number] = [430, 500];
const Y = 70, LEN = 70, MAX = 760;

type Verdict = { kind: 'ok' | 'warn' | 'bad'; text: string };

export function judge(front: number): Verdict {
  const tail = front - LEN, s12 = line.signals[1], s14 = line.signals[PROTECT];
  if (front <= s12 - 20) return { kind: 'ok', text: 'Safe to block. The track between S14 and the worksite is clear and 7SP3 is well back, behind S12. S14 stays at stop, S12 shows Caution, and the train will stop at S14. Issue the ASB number to the Protection Officer.' };
  if (front <= s14) return { kind: 'warn', text: "Hold on. 7SP3 is between S12 and S14 and may already have passed S12 showing a proceed aspect. Throw S14 back to stop now and the driver may not be able to stop at it. Let the train pass and clear the worksite, then block." };
  if (tail < WORK[1]) return { kind: 'bad', text: "Unsafe. 7SP3 has passed S14 and hasn't cleared the worksite. Blocking S14 now protects the workers from the trains behind, but not from this one, which is already inside the protection. This is the gap that the 2015 investigation found the rules didn't manage." };
  return { kind: 'ok', text: 'Safe to block. 7SP3 has passed right through the worksite and is beyond it. Nothing is between S14 and the work, so holding S14 at stop protects it.' };
}

function draw(front: number, blocked: boolean): Scene {
  const occ = occupied(line, [{ front, length: LEN }], new Set());
  const asp = aspects(occ);
  if (blocked) {
    asp[PROTECT] = 'stop';
    for (let i = PROTECT - 1; i >= 0; i--) asp[i] = occ[i] ? 'stop' : asp[i + 1] === 'stop' ? 'caution' : 'clear';
  }
  const x1 = Math.max(front - LEN, 0), x2 = Math.min(front, line.end);
  const s14 = line.signals[PROTECT];
  return combine(
    band('between', s14 + 4, WORK[0], Y + 24, 10, 'danger'),
    band('work', WORK[0], WORK[1], Y + 24, 10, 'orange'),
    text({ id: 'work:l', x: (WORK[0] + WORK[1]) / 2, y: Y + 42, text: 'worksite', size: 10.5, anchor: 'middle', role: 'code' }),
    text({ id: 'between:l', x: (s14 + WORK[0]) / 2, y: Y + 42, text: 'must be clear', size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
    line.signals.map((s, i) => track(`tc${i}`, [[s + 3, Y], [(line.signals[i + 1] ?? line.end) - 3, Y]], occ[i] ? 'danger' : undefined)),
    line.signals.map((s, i) => signal({ id: names[i], x: s, y: Y, aspect: asp[i], label: names[i] })),
    blocked && rect({ id: 'collar', x: s14 - 9, y: Y - 26, w: 20, h: 20, rx: 10, tone: 'ghost' }),
    blocked && text({ id: 'collar:l', x: s14 - 9, y: Y - 56, text: 'blocked', size: 10.5, anchor: 'middle', role: 'label', tone: 'danger', weight: 600 }),
    x2 > x1 + 4 && train({ id: 'train', x1, x2, y: Y - 2, label: x2 - x1 > 40 ? '7SP3 →' : undefined, h: 14 }),
  );
}

const viewBox = fitViewBox([draw(MAX / 2, true), draw(LEN + 5, true)], 16);

export function BlockingCheck({ onSafe }: { onSafe?: () => void }) {
  const [front, setFront] = useState(300);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const scene = useMemo(() => draw(front, verdict?.kind === 'ok' || verdict?.kind === 'bad'), [front, verdict]);
  return (
    <Figure
      wide
      panel={
        <>
          <Ctl label="where 7SP3 is when the call comes">
            <Slider value={front} onChange={(v) => (setFront(v), setVerdict(null))} min={LEN + 5} max={MAX} step={5} format={() => ''} />
          </Ctl>
          <div className="btn-row" style={{ alignSelf: 'flex-end' }}>
            <Button variant="primary" onClick={() => {
              const v = judge(front);
              setVerdict(v);
              if (v.kind === 'ok') onSafe?.();
            }}>Block S14 and issue ASB</Button>
          </div>
          <p className={`status ${verdict?.kind ?? ''}`} aria-live="polite" style={{ flexBasis: '100%' }}>
            {verdict ? verdict.text : 'The Protection Officer asks for S14 to be blocked to protect the worksite. Put the train somewhere, then decide.'}
          </p>
        </>
      }
      caption="The red band is the track between the protecting signal and the worksite. It must be proven clear before the blocking means anything. Try the train well back, just behind S14, just past it, and beyond the worksite."
    >
      <Diagram scene={scene} viewBox={viewBox} label="A line with four signals, a worksite beyond S14, and a train whose position you set" />
    </Figure>
  );
}
