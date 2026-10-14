import { useEffect, useState } from 'react';
import { combine, handle, path, text } from 'dsviz';
import { Diagram, useTicker } from 'dsviz/react';

// A square inside a square: the four corner triangles plus the tilted square
// always fill the big one. Drag the point (or watch it breathe on its own):
// (a + b)² = 4 · ab/2 + c², which rearranges to a² + b² = c².
const S = 260;

export function Hero() {
  const [a, setA] = useState(80);
  const [touched, setTouched] = useState(false);
  const tick = useTicker(1800, !touched);
  useEffect(() => { if (!touched) setA([80, 150, 105, 60, 125][tick % 5]); }, [tick, touched]);

  const P = [[a, 0], [S, a], [S - a, S], [0, S - a]] as Array<[number, number]>;
  const corners = [[0, 0], [S, 0], [S, S], [0, S]] as Array<[number, number]>;
  const scene = combine(
    // the four right triangles (purple), then the tilted square on top
    corners.map((c, i) => path({ id: `tri${i}`, points: [c, P[i], P[(i + 3) % 4]], closed: true, tone: 'visited', role: 'region' })),
    path({ id: 'inner', points: P, closed: true, width: 1.5 }),
    path({ id: 'outer', points: corners, closed: true, width: 1.5, role: 'outline' }),
    path({ id: 'gv', points: [[a, -22], [a, S + 22]], role: 'glow' }),
    path({ id: 'gh', points: [[-22, S - a], [S + 22, S - a]], role: 'glow' }),
    text({ id: 'la', x: a / 2, y: -14, text: 'a', size: 18, role: 'math' }),
    text({ id: 'lb', x: a + (S - a) / 2, y: -14, text: 'b', size: 18, role: 'math' }),
    text({ id: 'lc', x: (a + S) / 2 + 12, y: a / 2 - 10, text: 'c', size: 18, role: 'math' }),
    handle({ id: 'P', x: a, y: 0, r: 8, hit: 22, hint: !touched, tone: 'accent' }),
  );
  return (
    <div className="hero-card">
      <Diagram
        scene={scene}
        height={420}
        viewBox={[-40, -46, S + 80, S + 86]}
        duration={touched ? 300 : 1200}
        onDrag={(e) => { setTouched(true); setA(Math.max(20, Math.min(S - 20, e.x))); }}
        label="A tilted square inside a square, showing why a² + b² = c²"
      />
      <div className="hero-cap"><span className="math-ital">a</span>² + <span className="math-ital">b</span>² = <span className="math-ital">c</span>²</div>
    </div>
  );
}
