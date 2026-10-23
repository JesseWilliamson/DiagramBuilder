// The inscribed angle theorem: wherever P sits on the circle, ∠APB is half the arc AB
// that P doesn't sit on. Drag P (and A, B) around the circle.
import { useState } from 'react';
import { combine, path, Vec } from '@figurae/core';
import { angleAt, angleMark, arcPoints, circle, pointLabel, segment, toDegrees } from '@figurae/geom';
import { Diagram, MathText } from '@figurae/react';

const O = { x: 220, y: 155 }, R = 115;
const TAU = 2 * Math.PI;
const on = (t: number): Vec => ({ x: O.x + R * Math.cos(t), y: O.y + R * Math.sin(t) });
const norm = (t: number) => ((t % TAU) + TAU) % TAU;

export default function Inscribed() {
  const [t, setT] = useState({ A: 2.6, B: 0.45, P: 4.6 });
  const [touched, setTouched] = useState(false);
  const A = on(t.A), B = on(t.B), P = on(t.P);

  // The arc from A counter-clockwise to B either contains P or it doesn't; we want the one that doesn't.
  const sweep = norm(t.B - t.A);
  const containsP = norm(t.P - t.A) < sweep;
  const [from, arc] = containsP ? [t.B, TAU - sweep] : [t.A, sweep];
  const inscribed = toDegrees(angleAt(A, P, B));

  const scene = combine(
    circle(O, R, { id: 'circle', tone: 'muted' }),
    // the arc AB (not containing P), drawn on the circle and as a wedge at the centre
    path({ id: 'arc', points: arcPoints(O, R, from, from + arc, 64), role: 'curve', tone: 'visited', width: 4 }),
    path({ id: 'central', points: [[O.x, O.y], ...arcPoints(O, 30, from, from + arc, 48)], closed: true, role: 'region', tone: 'visited' }),
    segment(O, A, { id: 'OA', tone: 'visited', width: 1.25 }),
    segment(O, B, { id: 'OB', tone: 'visited', width: 1.25 }),
    segment(P, A, { id: 'PA', tone: 'accent' }),
    segment(P, B, { id: 'PB', tone: 'accent' }),
    angleMark(A, P, B, { id: 'angP', label: true, tone: 'accent', r: 26, rightSquare: true }),
    pointLabel(O, 'O', { id: 'O', offset: { x: -16, y: -10 } }),
    (['A', 'B', 'P'] as const).map((k) => {
      const q = on(t[k]);
      const out = { x: (q.x - O.x) / R * 18, y: (q.y - O.y) / R * 18 };
      return pointLabel(q, k, { id: k, draggable: true, hint: !touched && k === 'P', tone: k === 'P' ? 'accent' : 'visited', offset: out, data: { k } });
    }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={[60, 10, 320, 290]}
        onDrag={(e) => {
          setTouched(true);
          const k = (e.node.data as { k: 'A' | 'B' | 'P' }).k;
          setT((s) => ({ ...s, [k]: Math.atan2(e.y - O.y, e.x - O.x) }));
        }}
      />
      <p className="status formula">
        <span className="tone-accent"><MathText tex={`\\angle APB = ${inscribed.toFixed(1)}°`} /></span> = ½ × <span className="tone-visited"><MathText tex={`\\text{arc } AB = ${toDegrees(arc).toFixed(1)}°`} /></span>
      </p>
      <p className="hint">Slide P anywhere on the far side: the angle doesn't change. Make AB a diameter and you get Thales: 90°.</p>
    </>
  );
}
