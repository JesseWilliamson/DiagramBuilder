// Two dice: 36 equally likely outcomes. An event is a set of cells; its probability is
// (cells in the event) / 36. Click a cell or a bar to pick the sum, and choose = / ≥ / ≤.
//
// The d3 ideas: ONE array of data drives two charts. The 36 outcomes are a plain list;
// d3.rollup counts them by sum, and that count is the bar chart. A d3.scaleBand gives
// each sum its slot on the x axis. Both views are keyed joins, so changing the event
// only changes a class (the colour fades) and never rebuilds anything.

// 1. the data: every (die 1, die 2) pair, and how many ways there are to make each sum
const outcomes = d3.cross(d3.range(1, 7), d3.range(1, 7), (a, b) => ({ a, b, sum: a + b, id: `${a}-${b}` }));
const ways = d3.rollup(outcomes, (v) => v.length, (d) => d.sum); // Map {2 => 1, 3 => 2, … 7 => 6, … 12 => 1}
const sums = d3.range(2, 13).map((s) => ({ sum: s, n: ways.get(s) }));

// (Text sizes are set with .style('font-size', …): the kit's stylesheet sets one for all svg text, and CSS beats the attribute.)

// 2. geometry. The grid starts at x = 30 / y = 32 to leave room for the die faces as headers.
const CELL = 32, GAP = 4, GX = 30, GY = 32;
const cellX = (i) => GX + i * (CELL + GAP);
const cellY = (i) => GY + i * (CELL + GAP);
const BX = 282, BY = 56, BW = 230, BH = 150;
const x = d3.scaleBand(d3.range(2, 13), [BX, BX + BW]).padding(0.3); // slot per sum; x.bandwidth() is the bar width
const y = d3.scaleLinear([0, 6.5], [BY + BH, BY]);

let k = 7, mode = '=';
const inEvent = (s) => (mode === '=' ? s === k : mode === '≥' ? s >= k : s <= k);

const fig = kit.figure(BX + BW, BY + BH + 24, { pad: 6 });
const { svg } = fig;

// die faces: a rounded square plus pips. The pip layout is a lookup table in a 3x3 grid (-1, 0, 1).
const PIPS = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];
function die(parent, face, cx, cy, size = 22) {
  const g = parent.append('g').attr('transform', `translate(${cx},${cy})`);
  g.append('rect').attr('class', 'solid').style('stroke', 'var(--fg)').style('stroke-width', 1.5).attr('x', -size / 2).attr('y', -size / 2).attr('width', size).attr('height', size).attr('rx', size * 0.2);
  g.selectAll('circle').data(PIPS[face]).join('circle').attr('class', 'fill-ink')
    .attr('cx', (d) => d[0] * size * 0.26).attr('cy', (d) => d[1] * size * 0.26).attr('r', size * 0.08);
}
d3.range(1, 7).forEach((f) => {
  die(svg, f, cellX(f - 1) + CELL / 2, 8);            // column header
  die(svg, f, 8, cellY(f - 1) + CELL / 2);            // row header
});

// 3. the sample space: 36 keyed cells. Rows are die 1, columns are die 2.
const cells = svg.append('g').selectAll('g.cell').data(outcomes, (d) => d.id).join((enter) => {
  const g = enter.append('g').attr('class', 'cell click').attr('transform', (d) => `translate(${cellX(d.b - 1)},${cellY(d.a - 1)})`);
  g.append('rect').attr('width', CELL).attr('height', CELL).attr('rx', 4);
  g.append('text').attr('class', 'value').attr('x', CELL / 2).attr('y', CELL / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '13px').text((d) => d.sum);
  return g;
}).on('click', (e, d) => pick(d.sum));

// 4. the distribution: bars keyed by sum, plus value labels, axis labels and a baseline
const bars = svg.append('g').selectAll('g.bar').data(sums, (d) => d.sum).join((enter) => {
  const g = enter.append('g').attr('class', 'bar click');
  g.append('rect').attr('x', (d) => x(d.sum)).attr('width', x.bandwidth()).attr('rx', 3)
    .attr('y', (d) => y(d.n)).attr('height', (d) => y(0) - y(d.n));
  g.append('text').attr('class', 'value').attr('x', (d) => x(d.sum) + x.bandwidth() / 2).attr('y', (d) => y(d.n) - 8).attr('text-anchor', 'middle').style('font-size', '11px').text((d) => d.n);
  g.append('text').attr('class', 'muted').attr('x', (d) => x(d.sum) + x.bandwidth() / 2).attr('y', y(0) + 16).attr('text-anchor', 'middle').style('font-size', '12px').text((d) => d.sum);
  return g;
}).on('click', (e, d) => pick(d.sum));
svg.append('line').attr('class', 'axis').attr('x1', BX).attr('x2', BX + BW).attr('y1', y(0)).attr('y2', y(0)).style('stroke-width', 1);

const formula = kit.el('p', { class: 'status', style: 'font-family: var(--math); font-size: 16px' });
const span = (text, color) => kit.el('span', { style: color ? `color: var(--${color}); font-weight: 600` : '' }, text);

function draw() {
  const tone = (s) => kit.cls('solid', kit.tone(inEvent(s) ? 'accent' : 'muted'));
  cells.select('rect').attr('class', (d) => tone(d.sum));
  cells.select('text').attr('class', (d) => kit.cls('value', !inEvent(d.sum) && 'muted'));
  // a bar outside the event stays outlined in ink, like a plain bar chart
  bars.select('rect').attr('class', (d) => tone(d.sum)).style('stroke', (d) => (inEvent(d.sum) ? null : 'var(--fg)')).style('stroke-width', (d) => (inEvent(d.sum) ? null : 1.5));

  // P(event) = favourable / 36: just add up the rolled-up counts of the sums that qualify
  const hits = d3.sum(sums, (d) => (inEvent(d.sum) ? d.n : 0));
  formula.replaceChildren(
    kit.el('i', {}, `P(sum ${mode} ${k}) = `), span(hits, 'accent'), `/36 = `, kit.el('b', {}, d3.format('.3f')(hits / 36)),
  );
}
function pick(s) { k = s; draw(); }

fig.add(kit.el('div', { class: 'row spread' },
  kit.el('span', { class: 'ctl' }, 'Sum', kit.segmented({ options: ['=', '≥', '≤'], value: mode, label: 'Sum', onInput: (v) => { mode = v; draw(); } })),
  formula,
));
draw();
return fig.el;
