// The six UML relationships, each next to the code that creates it.
// Click a row to highlight it. The markers come from connector(): RELATION_STYLE maps kind -> line + ends.
import { useState } from 'react';
import { combine, connector, rect, text } from '@dsviz/core';
import { Diagram } from '@dsviz/react';
import { RELATION_STYLE, RelationKind } from '@dsviz/uml';

const rows: Array<{ kind: RelationKind; a: string; b: string; code: string; reads: string }> = [
  { kind: 'inherits', a: 'Square', b: 'Rectangle', code: 'class Square extends Rectangle', reads: 'is a' },
  { kind: 'implements', a: 'Circle', b: 'Shape', code: 'class Circle implements Shape', reads: 'implements' },
  { kind: 'composition', a: 'Car', b: 'Engine', code: 'engine = new Engine()  // made inside', reads: 'owns (dies with it)' },
  { kind: 'aggregation', a: 'Team', b: 'Player', code: 'constructor(players: Player[])', reads: 'has (can outlive it)' },
  { kind: 'association', a: 'Order', b: 'Customer', code: 'customer: Customer  // a field', reads: 'knows about' },
  { kind: 'dependency', a: 'Report', b: 'Printer', code: 'print(p: Printer)  // just a parameter', reads: 'uses' },
];

const ROW = 62, W = 92, H = 32, BX = 250;

export default function UmlArrows() {
  const [sel, setSel] = useState(0);
  const scene = combine(
    rows.map((r, i) => {
      const y = i * ROW, on = sel === i;
      const tone = on ? 'active' : undefined;
      const s = RELATION_STYLE[r.kind];
      const box = (k: string, x: number, label: string) => [
        rect({ id: `${k}${i}`, x, y, w: W, h: H, rx: 6, role: 'card', tone, interactive: true, data: { row: i } }),
        text({ id: `${k}${i}:t`, x, y, text: label, size: 12.5, role: 'class-name' }),
      ];
      return [
        connector({ id: `rel${i}`, from: { x: W / 2, y, w: W, h: H }, to: { x: BX, y, w: W, h: H }, ...s, tone }),
        box('a', W / 2, r.a),
        box('b', BX, r.b),
        text({ id: `kind${i}`, x: BX + W / 2 + 24, y: y - 9, text: `${r.kind}: ${r.a} ${r.reads} ${r.b}`, size: 12.5, role: 'value', anchor: 'start', tone }),
        text({ id: `code${i}`, x: BX + W / 2 + 24, y: y + 10, text: r.code, size: 11.5, role: 'member', anchor: 'start' }),
      ];
    }),
  );
  return (
    <>
      <Diagram scene={scene} viewBox={[-12, -ROW / 2, 640, ROW * rows.length]} onClick={(e) => setSel((e.node.data as { row: number }).row)} />
      <p className="hint">Diamonds sit at the owner's end; triangles point at the parent. Dashed means "weaker": an interface instead of a class, a parameter instead of a field.</p>
    </>
  );
}
