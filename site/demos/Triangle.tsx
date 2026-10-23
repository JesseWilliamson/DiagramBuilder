// Drag the corners. The angles always add to 180°, and the classic centres
// (circumcentre, incentre, centroid, orthocentre) follow along.
import { useState } from 'react';
import { combine, Vec } from '@figurae/core';
import { angleAt, angleMark, centroid as geomCentroid, circle, circumcircle, footOfPerpendicular, incircle as geomIncircle, orthocenter, pointLabel, polygon, segment, tickMarks, toDegrees } from '@figurae/geom';
import { Diagram, MathText, Switch } from '@figurae/react';

const W = 440, H = 300;
const mid = (a: Vec, b: Vec) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const len = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export default function Triangle() {
  const [pts, setPts] = useState<Vec[]>([{ x: 110, y: 230 }, { x: 330, y: 240 }, { x: 190, y: 60 }]);
  const [show, setShow] = useState({ circum: true, incircle: false, medians: false, altitudes: false });
  const [A, B, C] = pts;
  const [touched, setTouched] = useState(false);
  const set = (k: keyof typeof show) => (v: boolean) => setShow((s) => ({ ...s, [k]: v }));

  const cc = circumcircle(A, B, C);
  const ic = geomIncircle(A, B, C);
  const G = geomCentroid(pts);
  const Hc = orthocenter(A, B, C);
  const angles = [angleAt(C, A, B), angleAt(A, B, C), angleAt(B, C, A)].map(toDegrees);
  // Sides opposite A, B, C: mark equal ones with matching tick marks
  const sides: Array<[Vec, Vec]> = [[B, C], [C, A], [A, B]];
  const L = sides.map(([p, q]) => len(p, q));
  const same = (i: number, j: number) => Math.abs(L[i] - L[j]) < 3;

  const scene = combine(
    show.circum && cc && circle(cc.center, cc.r, { id: 'circum', tone: 'visited', showCenter: true }),
    show.incircle && circle(ic.center, ic.r, { id: 'incircle', tone: 'success', showCenter: true }),
    show.medians && [
      pts.map((p, i) => segment(p, mid(pts[(i + 1) % 3], pts[(i + 2) % 3]), { id: `median${i}`, tone: 'active', dashed: true, width: 1.25 })),
      pointLabel(G, 'G', { id: 'G', tone: 'active' }),
    ],
    show.altitudes && Hc && [
      pts.map((p, i) => {
        const q = pts[(i + 1) % 3], r = pts[(i + 2) % 3];
        return segment(p, footOfPerpendicular(p, q, r), { id: `alt${i}`, tone: 'danger', dashed: true, width: 1.25 });
      }),
      pointLabel(Hc, 'H', { id: 'H', tone: 'danger' }),
    ],
    sides.map(([p, q], i) => {
      const twin = [0, 1, 2].find((j) => j !== i && same(i, j));
      return twin !== undefined && tickMarks(p, q, 1, { id: `tick${i}` });
    }),
    angleMark(C, A, B, { id: 'angA', label: true, tone: 'accent' }),
    angleMark(A, B, C, { id: 'angB', label: true, tone: 'accent' }),
    angleMark(B, C, A, { id: 'angC', label: true, tone: 'accent' }),
    polygon(pts, { id: 'tri', labels: ['A', 'B', 'C'], draggable: true, hint: !touched, fill: false }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={[0, 0, W, H]}
        onDrag={(e) => {
          setTouched(true);
          const i = (e.node.data as { index: number }).index;
          // keep corners (and their labels) 28px inside the frame; snap to a 5px grid so
          // right angles and equal sides are reachable by hand
          const p = { x: Math.round(Math.max(28, Math.min(W - 28, e.x)) / 5) * 5, y: Math.round(Math.max(28, Math.min(H - 28, e.y)) / 5) * 5 };
          setPts((ps) => ps.map((q, j) => (j === i ? p : q)));
        }}
      />
      <div className="row">
        <Switch label="Circumcircle" checked={show.circum} onChange={set('circum')} />
        <Switch label="Incircle" checked={show.incircle} onChange={set('incircle')} />
        <Switch label="Medians" checked={show.medians} onChange={set('medians')} />
        <Switch label="Altitudes" checked={show.altitudes} onChange={set('altitudes')} />
      </div>
      <p className="status formula">
        <MathText tex={`A + B + C = ${angles.map((a) => `${a.toFixed(1)}°`).join(' + ')} =`} /> <b>{angles.reduce((s, a) => s + a, 0).toFixed(1)}°</b>
      </p>
    </>
  );
}
