// Two dice: 36 equally likely outcomes. An event is a set of cells; its probability is
// (cells in the event) / 36. Click a cell or a bar to pick the sum.
import { useState } from 'react';
import { combine, prob } from 'dsviz';
import { Diagram, Segmented } from 'dsviz/react';

const counts = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]; // ways to roll 2, 3, …, 12
type Mode = '=' | '≥' | '≤';

export default function Dice() {
  const [k, setK] = useState(7);
  const [mode, setMode] = useState<Mode>('=');
  const inEvent = (s: number) => (mode === '=' ? s === k : mode === '≥' ? s >= k : s <= k);
  const hits = counts.reduce((n, c, i) => n + (inEvent(i + 2) ? c : 0), 0);

  const space = prob.sampleSpace(6, 6, {
    x: 0, y: 32, cell: 32, gap: 4,
    text: (r, c) => String(r + c + 2),
    tones: (r, c) => (inEvent(r + c + 2) ? 'accent' : 'muted'),
    interactive: true,
  });
  // die faces as headers: pips, not numbers
  const dieHeaders = Array.from({ length: 6 }, (_, i) => [
    prob.diePips(i + 1, space.center(0, i).x, 8, { id: `col-die-${i}`, size: 22 }),
    prob.diePips(i + 1, -22, space.center(i, 0).y, { id: `row-die-${i}`, size: 22 }),
  ]);
  const chart = prob.bars(counts, {
    id: 'dist', x: 252, y: 56, width: 230, height: 150,
    labels: counts.map((_, i) => i + 2), showValues: true, max: 6.5,
    tones: (i) => (inEvent(i + 2) ? 'accent' : 'muted'),
    interactive: true,
  });

  return (
    <>
      <Diagram
        scene={combine(space, dieHeaders, chart)}
        onClick={(e) => {
          const d = e.node.data as { r?: number; c?: number; index?: number } | undefined;
          if (d?.r !== undefined && d.c !== undefined) setK(d.r + d.c + 2);
          else if (d?.index !== undefined) setK(d.index + 2);
        }}
      />
      <div className="row spread">
        <Segmented label="Sum" value={mode} onChange={setMode} options={['=', '≥', '≤']} />
        <p className="status formula">
          P(sum {mode} {k}) = <b className="tone-accent">{hits}</b>/36 = <b>{(hits / 36).toFixed(3)}</b>
        </p>
      </div>
    </>
  );
}
