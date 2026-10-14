// A square inside a square. The four right triangles plus the tilted square
// always fill the big square: (a + b)² = 4 · ab/2 + c², so a² + b² = c².
import { useState } from 'react';
import { combine, handle, path, text } from 'dsviz';
import { Diagram } from 'dsviz/react';

const S = 240; // side of the big square

export default function Pythagoras() {
  const [a, setA] = useState(80);
  const [touched, setTouched] = useState(false);
  const b = S - a;

  // corners of the tilted square, one on each side of the big one
  const P: Array<[number, number]> = [[a, 0], [S, a], [b, S], [0, b]];
  const corners: Array<[number, number]> = [[0, 0], [S, 0], [S, S], [0, S]];

  const scene = combine(
    corners.map((c, i) => path({ id: `tri${i}`, points: [c, P[i], P[(i + 3) % 4]], closed: true, role: 'region', tone: 'visited' })),
    path({ id: 'inner', points: P, closed: true }),
    path({ id: 'outer', points: corners, closed: true, role: 'outline' }),
    text({ id: 'a', x: a / 2, y: -14, text: 'a', size: 16, role: 'math' }),
    text({ id: 'b', x: a + b / 2, y: -14, text: 'b', size: 16, role: 'math' }),
    text({ id: 'c', x: (a + S) / 2 + 10, y: a / 2 - 8, text: 'c', size: 16, role: 'math' }),
    handle({ id: 'P', x: a, y: 0, hint: !touched, tone: 'accent' }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={[-20, -36, S + 40, S + 56]}
        onDrag={(e) => { setTouched(true); setA(Math.round(Math.max(24, Math.min(S - 24, e.x)))); }}
      />
      <p className="status formula" style={{ textAlign: 'center' }}>
        <span className="math-ital">a</span>² + <span className="math-ital">b</span>² = {Math.round(a * a + b * b).toLocaleString()} = <span className="math-ital">c</span>²
      </p>
    </>
  );
}
