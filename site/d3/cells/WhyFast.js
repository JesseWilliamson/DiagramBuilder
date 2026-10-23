// Why binary search is fast: every step halves what is left, so n values need
// about log2(n) + 1 steps. The slider moves the exponent k, so each notch doubles n.
//
// The d3 ideas:
//  - Chips are joined by their position in the chain (0 = n, 1 = n/2, ...). Moving
//    the slider adds or removes chips at the end while the others keep their
//    elements, so they slide when the row wraps and their number changes in place.
//  - One d3.scaleLinear maps "number of comparisons" to bar length. Both bars
//    share it, domain [0, n], so the linear scan always fills the track and the
//    binary bar shrinks to its minimum visible width as n grows.
//  - d3.format(',') puts the thousands separators in the labels.

const CHIP_W = 36, CHIP_H = 26, GAP = 6, PER_ROW = 11, ROW = 34, BAR = 280, LABEL = 110;
const steps = (n) => Math.floor(Math.log2(n)) + 1;
const short = (v) => (v >= 2 ** 20 ? `${v / 2 ** 20}M` : v >= 1024 ? `${v / 1024}k` : String(v));
const comma = d3.format(',');

let k = 6;

const W = PER_ROW * (CHIP_W + GAP) - GAP;
const heightFor = (rows) => ROW * rows + 18 + 28 + 10;
const fig = kit.figure(W, heightFor(1), { pad: 4 });
const { svg } = fig;
const chipLayer = svg.append('g');
const barLayer = svg.append('g');
const status = kit.status();

function draw() {
  const n = 2 ** k;
  const sizes = d3.range(k + 1).map((i) => ({ id: i, size: n / 2 ** i, last: i === k }));
  const pos = (d) => `translate(${(d.id % PER_ROW) * (CHIP_W + GAP)},${Math.floor(d.id / PER_ROW) * ROW})`;

  chipLayer.selectAll('g.chip').data(sizes, (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'chip').attr('transform', pos).style('opacity', 0);
      g.append('rect').attr('width', CHIP_W).attr('height', CHIP_H).attr('rx', 5);
      g.append('text').attr('class', 'value').attr('x', CHIP_W / 2).attr('y', CHIP_H / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', 12 + 'px');
      return g;
    },
    (update) => update,
    (exit) => kit.tr(exit, 250).style('opacity', 0).remove(),
  ).call((g) => {
    g.select('rect').attr('class', (d) => kit.cls('solid', kit.tone(d.last ? 'success' : null)));
    g.select('text').text((d) => short(d.size));
    kit.tr(g, 400).style('opacity', 1).attr('transform', pos);
  });

  // both bars share one scale
  const x = d3.scaleLinear([0, n], [0, BAR]);
  const rows = Math.ceil(sizes.length / PER_ROW);
  const top = ROW * rows + 18;
  // the viewBox is just a string of four numbers, so a transition on it eases the figure's height too
  kit.tr(svg, 400).attr('viewBox', [-4, -4, W + 8, heightFor(rows) + 8]);
  const bars = [
    { id: 'bin', y: top, v: steps(n), tone: 'success', label: 'Binary search' },
    { id: 'lin', y: top + 28, v: n, tone: 'muted', label: 'Linear scan' },
  ];
  barLayer.selectAll('g.bar').data(bars, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'bar').attr('transform', (d) => `translate(0,${d.y})`);
    g.append('text').attr('class', 'lab').attr('dy', '.35em').style('font-size', 13 + 'px').text((d) => d.label);
    g.append('rect').attr('class', 'panel').attr('x', LABEL).attr('y', -5).attr('width', BAR).attr('height', 10).attr('rx', 5);
    g.append('rect').attr('class', 'fill').attr('x', LABEL).attr('y', -5).attr('height', 10).attr('rx', 5).attr('width', 10);
    g.append('text').attr('class', 'value num').attr('x', LABEL + BAR + 12).attr('dy', '.35em').style('font-size', 13 + 'px');
    return g;
  }).call((g) => {
    g.select('rect.fill').attr('class', (d) => kit.cls('solid fill', kit.tone(d.tone)));
    kit.tr(g, 400).attr('transform', (d) => `translate(0,${d.y})`);
    kit.tr(g.select('rect.fill'), 400).attr('width', (d) => Math.max(10, x(d.v)));
    g.select('text.num').text((d) => comma(d.v));
  });

  status.replaceChildren(
    Object.assign(document.createElement('b'), { textContent: steps(n), style: 'color:var(--success)' }),
    ' comparisons for binary search, up to ',
    Object.assign(document.createElement('b'), { textContent: comma(n) }),
    ' for a linear scan.',
  );
}

const slider = kit.slider({ label: 'Array size', min: 1, max: 20, value: k, format: (v) => `n = ${comma(2 ** v)}`, onInput: (v) => { k = v; draw(); } });
fig.el.prepend(slider);
fig.add(status);
draw();
return fig.el;
