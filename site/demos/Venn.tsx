// Two events as regions of a sample space. Drag the circles; click regions to shade them.
// P(region) is its area as a fraction of the rectangle U.
import { useState } from 'react';
import { prob, Vec } from 'dsviz';
import { Button, Challenge, Diagram } from 'dsviz/react';

type Region = prob.VennRegion;
const U: [number, number, number, number] = [0, 0, 440, 250];
const names: Record<string, string> = {
  '': '∅', both: 'A ∩ B', aOnly: 'A − B', bOnly: 'B − A', neither: '(A ∪ B)ᶜ',
  'aOnly,both': 'A', 'both,bOnly': 'B', 'aOnly,bOnly': 'A △ B', 'aOnly,both,bOnly': 'A ∪ B',
  'aOnly,neither': 'Bᶜ', 'bOnly,neither': 'Aᶜ', 'both,neither': '(A △ B)ᶜ', 'aOnly,bOnly,neither': '(A ∩ B)ᶜ',
  'aOnly,both,neither': 'A ∪ Bᶜ', 'both,bOnly,neither': 'Aᶜ ∪ B', 'aOnly,both,bOnly,neither': 'U',
};
const order: Region[] = ['aOnly', 'both', 'bOnly', 'neither'];
const presets: Array<[string, Region[]]> = [['A ∩ B', ['both']], ['A ∪ B', ['aOnly', 'both', 'bOnly']], ['A − B', ['aOnly']], ['A △ B', ['aOnly', 'bOnly']], ['(A ∪ B)ᶜ', ['neither']]];

export default function Venn() {
  const [a, setA] = useState({ x: 170, y: 130, r: 85 });
  const [b, setB] = useState({ x: 275, y: 125, r: 72 });
  const [sel, setSel] = useState<Region[]>(['both']);

  const areas = prob.vennAreas(a, b);
  const total = U[2] * U[3];
  const P = { aOnly: areas.aOnly / total, bOnly: areas.bOnly / total, both: areas.both / total, neither: 1 - (areas.a + areas.b - areas.both) / total };
  const pA = P.aOnly + P.both, pB = P.bOnly + P.both;
  const key = order.filter((r) => sel.includes(r)).join(',');
  const independent = Math.abs(P.both - pA * pB) < 0.004;

  const toggle = (r: Region) => setSel((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  // keep circles inside U
  const place = (d: { r: number }, w: Vec) => ({ ...d, x: Math.max(d.r, Math.min(U[2] - d.r, w.x)), y: Math.max(d.r, Math.min(U[3] - d.r, w.y)) });

  return (
    <>
      <Diagram
        scene={prob.venn2(a, b, { highlight: sel, universe: U, interactive: true, draggable: true })}
        height={270}
        viewBox={[-10, -10, U[2] + 20, U[3] + 20]}
        onDrag={(e) => ((e.node.data as { set: 'a' | 'b' }).set === 'a' ? setA((d) => place(d, e)) : setB((d) => place(d, e)))}
        onClick={(e) => toggle(prob.vennRegionAt(e, a, b))}
      />
      <div className="row">
        {presets.map(([label, regions]) => (
          <Button key={label} onClick={() => setSel(regions)}>{label}</Button>
        ))}
      </div>
      <p className="status formula">
        Shaded: <b className="tone-accent">{names[key] ?? key}</b>, P = <b>{sel.reduce((s, r) => s + P[r], 0).toFixed(3)}</b>
      </p>
      <div className="stats">
        <span>P(A) = <b>{pA.toFixed(3)}</b></span>
        <span>P(B) = <b>{pB.toFixed(3)}</b></span>
        <span>P(A ∩ B) = <b>{P.both.toFixed(3)}</b></span>
        <span className={independent ? 'tone-success' : ''}>P(A)·P(B) = <b>{(pA * pB).toFixed(3)}</b>{independent && ' (independent!)'}</span>
      </div>
      <Challenge
        goals={[
          { label: 'Make A and B mutually exclusive (no overlap)', done: P.both < 1e-6 },
          { label: 'Put B entirely inside A', done: Math.hypot(a.x - b.x, a.y - b.y) <= a.r - b.r },
          { label: 'Make A and B independent: P(A ∩ B) = P(A)·P(B)', done: independent && P.both > 0.005 },
        ]}
      />
    </>
  );
}
