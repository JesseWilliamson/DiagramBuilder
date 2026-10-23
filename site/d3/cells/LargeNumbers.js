// Roll a die again and again. Early on the frequencies jump around; with more rolls they
// settle toward 1/6 each, and the running average settles toward 3.5.
//
// The d3 ideas: the only state is the list of rolls. Everything on screen is derived from
// it each time it grows: d3.rollup counts faces (the bars), d3.cumsum gives running totals
// (so the running mean is cumsum[i] / (i + 1) with no loop of our own), and d3.randomInt is
// the die. The right-hand x scale's DOMAIN grows with the number of rolls, and d3.axisBottom
// re-draws its ticks from the scale, which is how the plot "zooms out" as you keep rolling.

const roll = d3.randomInt(1, 7); // an integer in [1, 7): 1..6
const faces = d3.range(1, 7);

let rolls = d3.range(12).map(roll);
let auto = false;

// left chart: frequency bars. paddingInner(.3) + paddingOuter(.15) gives 35px slots and 70%-wide bars.
const BAR_W = 210, H = 150;
const bx = d3.scaleBand(faces, [0, BAR_W]).paddingInner(0.3).paddingOuter(0.15);
const by = d3.scaleLinear([0, 0.4], [H, 0]).clamp(true); // clamped so a lucky first roll (100% of 1 roll) can't shoot off the top

// right chart: running mean against roll number
const PW = 230;
const px = d3.scaleLinear([0, 20], [0, PW]);
const py = d3.scaleLinear([1, 6], [H, 0]);
const mean = d3.line().x((d) => px(d[0])).y((d) => py(d[1]));

const fig = kit.figure(540, 210);
fig.svg.attr('viewBox', [-20, -24, 540, 210]);
const bars = fig.svg.append('g');
bars.append('line').attr('class', 'axis').style('stroke-width', 1).attr('x2', BAR_W).attr('y1', H).attr('y2', H);
bars.append('line').attr('class', 'guide').style('stroke-width', 1.25).attr('x2', BAR_W).attr('y1', by(1 / 6)).attr('y2', by(1 / 6)); // expected 1/6
bars.selectAll('text.face').data(faces).join('text').attr('class', 'face muted').style('font-size', '12px').attr('text-anchor', 'middle')
  .attr('x', (d) => bx(d) + bx.bandwidth() / 2).attr('y', H + 18).text((d) => d);
const barLayer = bars.append('g');

const plot = fig.svg.append('g').attr('transform', 'translate(270,0)');
const xAxis = plot.append('g').attr('class', 'axisg').attr('transform', `translate(0,${H})`);
plot.append('g').attr('class', 'axisg').call(d3.axisLeft(py).tickValues(faces).tickSize(5).tickFormat(d3.format('d')));
plot.append('line').attr('class', 'guide').attr('x2', PW).attr('y1', py(3.5)).attr('y2', py(3.5));
plot.append('text').attr('class', 'math').style('font-size', '11px').attr('x', PW + 6).attr('y', py(3.5)).attr('dy', '.35em').text('3.5');
const meanLine = plot.append('path').attr('class', 'curve tone-accent').style('stroke-width', 2);

const readout = kit.stats();
const pct = d3.format('.0%');

function draw() {
  const n = rolls.length;
  const counts = d3.rollup(rolls, (v) => v.length, (r) => r); // Map face → count
  const freq = faces.map((f) => ({ face: f, v: n ? (counts.get(f) ?? 0) / n : 0 }));

  // bars + value labels, keyed by face
  barLayer.selectAll('g.f').data(freq, (d) => d.face).join((enter) => {
    const g = enter.append('g').attr('class', 'f');
    g.append('rect').attr('class', 'solid tone-accent').attr('x', (d) => bx(d.face)).attr('width', bx.bandwidth()).attr('rx', 3).attr('y', H).attr('height', 0);
    g.append('text').attr('class', 'value').style('font-size', '11px').attr('text-anchor', 'middle').attr('x', (d) => bx(d.face) + bx.bandwidth() / 2).attr('y', H - 9);
    return g;
  }).call((g) => {
    kit.tr(g.select('rect'), 200).attr('y', (d) => by(d.v)).attr('height', (d) => H - by(d.v)).style('opacity', (d) => (H - by(d.v) < 0.5 ? 0 : 1));
    kit.tr(g.select('text'), 200).attr('y', (d) => by(d.v) - 9).style('opacity', n ? 1 : 0);
    g.select('text').text((d) => pct(d.v));
  });

  // running mean: cumsum gives the total after each roll; divide by how many rolls that is.
  // Thin to ~200 points so 10,000 rolls stay cheap.
  const total = d3.cumsum(rolls);
  const step = Math.max(1, Math.floor(n / 200));
  const pts = rolls.map((_, i) => [i + 1, total[i] / (i + 1)]).filter((_, i) => i % step === 0 || i === n - 1);
  px.domain([0, Math.max(20, n)]); // the domain grows with the data; the axis follows
  xAxis.call(d3.axisBottom(px).ticks(4).tickSize(5));
  meanLine.attr('d', pts.length > 1 ? mean(pts) : null);
  plot.select('line.guide').attr('x2', PW);

  readout.set([['rolls =', String(n)], ['mean =', n ? d3.format('.3f')(d3.mean(rolls)) : '—'], ['expected =', '3.5']]);
}

const more = (k) => { rolls = rolls.concat(d3.range(k).map(roll)); draw(); };
const timer = d3.interval(() => { if (auto) more(rolls.length < 100 ? 1 : 10); }, 80);
invalidation.then(() => timer.stop());

const autoToggle = kit.toggle({ label: 'Auto', value: auto, onInput: (v) => { auto = v; } });
fig.add(kit.row(
  kit.button('Roll', () => more(1)),
  kit.button('+10', () => more(10)),
  kit.button('+100', () => more(100)),
  kit.button('Reset', () => { rolls = []; auto = false; autoToggle.set(false); draw(); }),
  autoToggle,
));
fig.add(readout);
draw();
return fig.el;
