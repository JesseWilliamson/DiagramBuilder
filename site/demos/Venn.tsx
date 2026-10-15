// Two events as regions of a sample space. Drag a circle by its centre dot; click regions to shade them.
// P(region) is its area as a fraction of the rectangle U.
import { useState } from 'react';
import { prob, Vec } from 'dsviz';
import { Button, Diagram, MathText } from 'dsviz/react';

type Region = prob.VennRegion;
const U: [number, number, number, number] = [0, 0, 440, 250];
const names: Record<string, string> = {
  // TeX-lite strings: <MathText> sets them in maths type (italic A, B; spaced ∩)
  '': '∅', both: 'A \\cap B', aOnly: 'A - B', bOnly: 'B - A', neither: '(A \\cup B)^c',
  'aOnly,both': 'A', 'both,bOnly': 'B', 'aOnly,bOnly': 'A \\triangle B', 'aOnly,both,bOnly': 'A \\cup B',
  'aOnly,neither': 'B^c', 'bOnly,neither': 'A^c', 'both,neither': '(A \\triangle B)^c', 'aOnly,bOnly,neither': '(A \\cap B)^c',
  'aOnly,both,neither': 'A \\cup B^c', 'both,bOnly,neither': 'A^c \\cup B', 'aOnly,both,bOnly,neither': 'U',
};
const order: Region[] = ['aOnly', 'both', 'bOnly', 'neither'];
const presets: Region[][] = [['both'], ['aOnly', 'both', 'bOnly'], ['aOnly'], ['aOnly', 'bOnly'], ['neither']];

export default function Venn() {
  const [a, setA] = useState({ x: 170, y: 130, r: 85 });
  const [b, setB] = useState({ x: 275, y: 125, r: 72 });
  const [sel, setSel] = useState<Region[]>(['both']);
  const [touched, setTouched] = useState(false);

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
        scene={prob.venn2(a, b, { highlight: sel, universe: U, interactive: true, draggable: true, hint: !touched })}
        viewBox={[-10, -10, U[2] + 20, U[3] + 20]}
        onDrag={(e) => (setTouched(true), (e.node.data as { set: 'a' | 'b' }).set === 'a' ? setA((d) => place(d, e)) : setB((d) => place(d, e)))}
        // only regions toggle; a tap on a drag handle is not a click on what's under it
        onClick={(e) => { const r = (e.node.data as { region?: Region } | undefined)?.region; if (r) toggle(r); }}
      />
      <div className="row">
        {presets.map((regions) => (
          <Button key={regions.join()} onClick={() => setSel(regions)}><MathText tex={names[regions.join(',')]} /></Button>
        ))}
      </div>
      <p className="status formula">
        Shaded: <span className="tone-accent"><MathText tex={names[key] ?? key} /></span>, <MathText tex="P =" /> <b>{sel.reduce((s, r) => s + P[r], 0).toFixed(3)}</b>
      </p>
      <div className="stats formula">
        <span><MathText tex="P(A) =" /> <b>{pA.toFixed(3)}</b></span>
        <span><MathText tex="P(B) =" /> <b>{pB.toFixed(3)}</b></span>
        <span><MathText tex="P(A \cap B) =" /> <b>{P.both.toFixed(3)}</b></span>
        <span className={independent ? 'tone-success' : ''}><MathText tex="P(A) P(B) =" /> <b>{(pA * pB).toFixed(3)}</b>{independent && ' (independent!)'}</span>
      </div>
    </>
  );
}
