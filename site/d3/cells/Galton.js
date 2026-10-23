// A Galton board. Every peg is a coin flip: left or right. Add up enough flips and
// the bins fill into a bell shape, the binomial distribution, whatever the bias.
//
// The d3 ideas: d3.randomBernoulli(p) is the coin; a ball's whole route is ten flips drawn
// up front, so its position after `step` rows is just (rights so far - step/2) * spacing.
// Balls are a KEYED join (key = ball id): every tick the data changes (step + 1) and d3
// moves each existing ball one row down with a short transition, creates the new ball, and
// drops the ones that landed. A d3.scaleBand lays out the bins, a linear scale sizes them,
// and d3.line().curve(d3.curveCatmullRom) draws the dashed binomial prediction on top.
// d3.interval is the clock; invalidation stops it when the cell is re-run.

const ROWS = 10, DX = 26, DY = 20;
const binY = ROWS * DY + 8, BH = 110, BW = (ROWS + 1) * DX;

let p = 0.5, queue = 40, auto = false, showCurve = true;
let balls = [];                              // { id, path: [0|1 × ROWS], step }
let bins = Array(ROWS + 1).fill(0);
let nextId = 0;

// pmf of the binomial: choose(n, k) p^k (1-p)^(n-k). d3 has random generators but no pmf, so it is written out.
const choose = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const binomial = (n, k, q) => choose(n, k) * q ** k * (1 - q) ** (n - k);

// scales. paddingInner(.14) + paddingOuter(.07) makes each bar 86% of its slot, centred in it.
const x = d3.scaleBand(d3.range(ROWS + 1), [-BW / 2, BW / 2]).paddingInner(0.14).paddingOuter(0.07);
const y = d3.scaleLinear([0, 8], [binY + BH, binY]); // domain's top is set in draw(): max(8, tallest bin)
const binX = (k) => x(k) + x.bandwidth() / 2;

const fig = kit.figure(320, binY + BH + 50);
fig.svg.attr('viewBox', [-160, -24, 320, binY + BH + 50]); // origin at the top peg, so x = 0 is the middle

// pegs: a triangle of dots. Row r has r + 1 pegs. A flat list, drawn once.
const pegData = d3.range(ROWS).flatMap((r) => d3.range(r + 1).map((i) => ({ r, i })));
fig.svg.append('g').selectAll('circle').data(pegData).join('circle').attr('class', 'fill-ink')
  .attr('cx', (d) => (d.i - d.r / 2) * DX).attr('cy', (d) => d.r * DY + 10).attr('r', 2.2);

const binLayer = fig.svg.append('g');
fig.svg.append('line').attr('class', 'axis').style('stroke-width', 1).attr('x1', -BW / 2).attr('x2', BW / 2).attr('y1', y(0)).attr('y2', y(0));
const curve = fig.svg.append('path').attr('class', 'curve dashed tone-success').style('stroke-width', 2).style('opacity', 0);
const ballLayer = fig.svg.append('g');
const smooth = d3.line().curve(d3.curveCatmullRom);

// where a ball is drawn. step ROWS+1 means "resting on top of its bin".
function ballPos(b) {
  const rights = d3.sum(b.path.slice(0, b.step));
  if (b.step > ROWS) return [binX(rights), y(bins[rights] + 1) - 5];
  return [(rights - b.step / 2) * DX, b.step * DY];
}
const fall = (sel) => sel.transition().duration(110).ease(d3.easeQuadIn); // gravity: accelerating, hence quad-in

function draw() {
  const total = d3.sum(bins);
  y.domain([0, Math.max(8, d3.max(bins))]);

  // bins: keyed by index, so a bar grows in place
  binLayer.selectAll('rect').data(bins.map((n, k) => ({ n, k })), (d) => d.k).join((enter) => enter.append('rect').attr('class', 'solid tone-accent')
    .attr('x', (d) => x(d.k)).attr('width', x.bandwidth()).attr('rx', 3).attr('y', y(0)).attr('height', 0).style('opacity', 0))
    .call((s) => fall(s).attr('y', (d) => y(d.n)).attr('height', (d) => y(0) - y(d.n)).style('opacity', (d) => (d.n ? 1 : 0))); // a 0-high bar would still draw its outline

  // balls: keyed join, so a ball that is already on the board slides to its next row
  ballLayer.selectAll('circle').data(balls, (d) => d.id).join(
    (enter) => enter.append('circle').attr('class', 'solid tone-active').attr('r', 5).style('stroke-width', 1.5)
      .attr('cx', 0).attr('cy', -16),
    (update) => update,
    (exit) => exit.remove(),
  ).call((s) => fall(s).attr('cx', (d) => ballPos(d)[0]).attr('cy', (d) => ballPos(d)[1]));

  // expected counts for this many balls, as a smooth dashed curve over the bin tops
  curve.attr('d', smooth(d3.range(ROWS + 1).map((k) => [binX(k), y(total * binomial(ROWS, k, p))])));
  kit.tr(curve, 200).style('opacity', showCurve && total > 0 ? 1 : 0);
}

// one tick: every ball goes down a row; those resting on a bin are counted; maybe a new ball appears
function tick() {
  const running = auto || queue > 0 || balls.length > 0;
  if (!running) return;
  const next = [];
  for (const b of balls) {
    if (b.step > ROWS) bins[d3.sum(b.path)]++;
    else next.push({ ...b, step: b.step + 1 });
  }
  if (auto || queue > 0) {
    const flip = d3.randomBernoulli(p); // a coin that lands "right" with probability p
    next.push({ id: nextId++, path: d3.range(ROWS).map(flip), step: 0 });
    if (queue > 0) queue--;
  }
  balls = next;
  bins = [...bins];
  draw();
}
const timer = d3.interval(tick, 110);
invalidation.then(() => timer.stop());

const slider = kit.slider({ label: 'Chance of going right', min: 0.1, max: 0.9, step: 0.05, value: p, format: (v) => `p = ${v.toFixed(2)}`, onInput: (v) => { p = v; draw(); } });
const autoToggle = kit.toggle({ label: 'Auto', value: auto, onInput: (v) => { auto = v; } });
fig.add(kit.row(
  kit.button('Drop 1', () => { queue += 1; }),
  kit.button('Drop 25', () => { queue += 25; }),
  autoToggle,
  kit.toggle({ label: 'Binomial', value: showCurve, onInput: (v) => { showCurve = v; draw(); } }),
  kit.button('Reset', () => { bins = Array(ROWS + 1).fill(0); balls = []; queue = 0; auto = false; autoToggle.set(false); draw(); }),
));
fig.add(slider);
draw();
return fig.el;
