// The six UML relationships, each beside the code that creates it. Click a row to
// highlight it.
//
// d3 has no connector or UML support, so this cell shows what you do about that:
// the boxes are plain <rect>s, the line is a two-point d3.line() path, and the
// ends are SVG <marker>s (kit.markers draws them once in <defs>; a line picks one
// with marker-start / marker-end). A small table, `STYLE`, says which marker goes
// where, which is the whole "grammar" of UML relationships.
//
// The d3 ideas: one data join builds a <g> per row; classes (not hand-set
// colours) carry the "selected" state, so a CSS transition fades it for free.

const rows = [
  { kind: 'inherits', a: 'Square', b: 'Rectangle', code: 'class Square extends Rectangle', reads: 'is a' },
  { kind: 'implements', a: 'Circle', b: 'Shape', code: 'class Circle implements Shape', reads: 'implements' },
  { kind: 'composition', a: 'Car', b: 'Engine', code: 'engine = new Engine()  // made inside', reads: 'owns (dies with it)' },
  { kind: 'aggregation', a: 'Team', b: 'Player', code: 'constructor(players: Player[])', reads: 'has (can outlive it)' },
  { kind: 'association', a: 'Order', b: 'Customer', code: 'customer: Customer  // a field', reads: 'knows about' },
  { kind: 'dependency', a: 'Report', b: 'Printer', code: 'print(p: Printer)  // just a parameter', reads: 'uses' },
];

// kind -> line style and which kit marker sits at which end.
// Diamonds sit at the owner's end (the start), triangles at the parent (the end).
const STYLE = {
  inherits: { dashed: false, end: 'tri' },
  implements: { dashed: true, end: 'tri' },
  composition: { dashed: false, start: 'diaf' },
  aggregation: { dashed: false, start: 'dia' },
  association: { dashed: false, end: 'open' },
  dependency: { dashed: true, end: 'open' },
};

const ROW = 62, BW = 92, BH = 32, AX = BW / 2, BX = 250; // box width/height; centre x of the left and right box
const W = 640, H = ROW * rows.length;

const fig = kit.figure(W, H);
const { svg } = fig;
const mk = kit.markers(svg, 'uml-arrows');
// content is centred on y = row * ROW, so shift it down half a row (and in from the left edge)
const root = svg.append('g').attr('transform', `translate(12,${ROW / 2})`);

let sel = 0;

const g = root.selectAll('g.row').data(rows).join('g').attr('class', 'row click').attr('transform', (d, i) => `translate(0,${i * ROW})`)
  .on('click', (event, d) => { sel = rows.indexOf(d); draw(); });

// a transparent hit area so the whole row is clickable, not just the two boxes
g.append('rect').attr('class', 'hit').attr('x', -12).attr('y', -ROW / 2).attr('width', W).attr('height', ROW);

// The connector. Both boxes sit on the same y, so the line is horizontal: it
// runs from the right edge of box A to the left edge of box B. (ClassDiagram
// shows the general case, where the line has to find the edge of a rotated pair.)
g.append('path').attr('class', (d) => 'rel line' + (STYLE[d.kind].dashed ? ' dashed' : ''))
  .attr('d', d3.line()([[AX + BW / 2, 0], [BX - BW / 2, 0]]))
  .attr('marker-start', (d) => (STYLE[d.kind].start ? mk(STYLE[d.kind].start) : null))
  .attr('marker-end', (d) => (STYLE[d.kind].end ? mk(STYLE[d.kind].end) : null));

// the two class boxes: same shape, different x and label. Selected ones turn yellow (tone-active).
for (const [part, cx] of [['a', AX], ['b', BX]]) {
  const box = g.append('g').attr('class', `box ${part}`).attr('transform', `translate(${cx},0)`);
  box.append('rect').attr('class', 'solid').attr('x', -BW / 2).attr('y', -BH / 2).attr('width', BW).attr('height', BH).attr('rx', 6);
  box.append('text').attr('class', 'name').attr('text-anchor', 'middle').attr('dy', '.35em').style('font-size', '12.5px').style('font-weight', 700).text((d) => d[part]);
}

// the labels to the right: what the relationship means, and the code that makes it
g.append('text').attr('class', 'value what').attr('x', BX + BW / 2 + 24).attr('y', -9).attr('dy', '.35em').style('font-size', '12.5px').style('font-weight', 600)
  .text((d) => `${d.kind}: ${d.a} ${d.reads} ${d.b}`);
g.append('text').attr('class', 'mono').attr('x', BX + BW / 2 + 24).attr('y', 10).attr('dy', '.35em').style('font-size', '11.5px').style('font-weight', 400)
  .text((d) => d.code);

function draw() {
  const on = (d) => rows[sel] === d;
  g.select('path.rel').attr('class', (d) => kit.cls('rel line', STYLE[d.kind].dashed && 'dashed', on(d) && 'tone-active'));
  // UML cards are a pale tint of the tone (55% mixed with the surface), not the full flat fill
  g.selectAll('rect.solid').attr('class', (d) => kit.cls('solid', on(d) && 'tone-active'))
    .style('fill', (d) => (on(d) ? 'color-mix(in srgb, var(--cf) 55%, var(--surface))' : null));
  g.select('text.what').attr('class', (d) => kit.cls('value what', on(d) && 'tone-active'));
}
draw();

const hint = fig.add(Object.assign(document.createElement('p'), {
  className: 'status',
  textContent: 'Diamonds sit at the owner\'s end; triangles point at the parent. Dashed means "weaker": an interface instead of a class, a parameter instead of a field.',
}));
hint.style.color = 'var(--muted)';
return fig.el;
