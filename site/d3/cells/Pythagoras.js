// A square inside a square. Four right triangles plus a tilted square always fill
// the big square, so (a + b)² = 4 · ab/2 + c², which simplifies to a² + b² = c².
// Drag the point on the top edge: a and b trade places, but the sum stays put.
//
// The d3 ideas: the whole picture is five numbers (the corners of the tilted
// square), so a keyed data join over four triangles lets d3 re-use the same
// <path> for "triangle 2" every time and only change its `d`. d3.line() turns
// corner lists into path strings, and kit.draggable turns the pointer into `a`.

const S = 240; // side of the big square

const corners = [[0, 0], [S, 0], [S, S], [0, S]];
const line = d3.line();
// close a polygon: d3.line() leaves it open unless we say so
const poly = (pts) => line(pts) + 'Z';

let a = 80, touched = false;

const fig = kit.figure(S, S, { pad: 30 });
const { svg } = fig;
svg.style('align-self', 'center');

const tris = svg.append('g');
const inner = svg.append('path').attr('class', 'line');
svg.append('path').attr('class', 'line').attr('d', poly(corners));
const labels = svg.append('g');
const p = kit.handle(svg, { hint: true, tone: 'accent', r: 8 });

const formula = kit.status();
formula.style.textAlign = 'center';
formula.style.fontFamily = 'var(--math)';
formula.style.fontSize = '17px';

function draw() {
  const b = S - a;
  // corners of the tilted square, one on each side of the big one
  const P = [[a, 0], [S, a], [b, S], [0, b]];

  // One triangle per corner of the big square, between that corner and its two neighbours on the tilted square.
  // Key = which corner (0..3), so a triangle keeps its element and just reshapes.
  tris.selectAll('path').data(corners.map((c, i) => ({ id: i, pts: [c, P[i], P[(i + 3) % 4]] })), (d) => d.id)
    .join('path').attr('class', 'area tone-visited').attr('d', (d) => poly(d.pts));
  inner.attr('d', poly(P));

  // side labels sit above the top edge, centred on each piece of it
  const L = [
    { id: 'a', x: a / 2, y: -14 },
    { id: 'b', x: a + b / 2, y: -14 },
    { id: 'c', x: (a + S) / 2 + 10, y: a / 2 - 8 },
  ];
  labels.selectAll('text').data(L, (d) => d.id).join('text')
    .attr('class', 'math').attr('font-style', 'italic').attr('font-size', 16).attr('text-anchor', 'middle').attr('dy', '.35em')
    .attr('x', (d) => d.x).attr('y', (d) => d.y).text((d) => d.id);

  p.attr('transform', `translate(${a},0)`);
  p.select('.halo-ring').style('display', touched ? 'none' : null);
  formula.innerHTML = `<i>a</i><sup>2</sup> + <i>b</i><sup>2</sup> = ${Math.round(a * a + b * b).toLocaleString()} = <i>c</i><sup>2</sup>`;
}

// The pointer's x is a (rounded, and kept 24 away from the corners so no triangle collapses); y is ignored.
p.call(kit.draggable(([x]) => { touched = true; a = Math.round(kit.clamp(x, 24, S - 24)); draw(); }, { step: 4 }));

fig.add(formula);
draw();
return fig.el;
