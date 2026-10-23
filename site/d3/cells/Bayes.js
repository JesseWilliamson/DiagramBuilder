// A test that is "99% accurate" can still be wrong most of the time it says yes.
// The tree multiplies along each path; Bayes' rule is just "of the + leaves, how much is sick?"
// Drag the three sliders and watch the red (false positive) leaf swallow the green one.
//
// The d3 ideas: d3.hierarchy turns the nested probabilities into a tree of nodes, and
// d3.tree() lays it out (parents centred over their children) in one call. A leaf's
// probability is the product of the branch probabilities above it, which is a one-liner
// over node.ancestors(). Everything is a keyed join (key = the node's path, like 'all/sick/pos'),
// so moving a slider only changes labels and the width of the bar, never the structure.

const pct = (p) => `${+(p * 100).toFixed(p < 0.01 ? 2 : 1)}%`;

let prior = 1, sens = 99, spec = 95; // percentages, as on the sliders

// the model as nested data; `p` is the probability of the branch INTO that node
function model() {
  const p = prior / 100, se = sens / 100, sp = spec / 100;
  return {
    key: 'all', label: 'person', children: [
      { key: 'sick', label: 'sick', p, children: [{ key: 'pos', label: '+', p: se }, { key: 'neg', label: '−', p: 1 - se }] },
      { key: 'well', label: 'healthy', p: 1 - p, children: [{ key: 'pos', label: '+', p: 1 - sp }, { key: 'neg', label: '−', p: sp }] },
    ],
  };
}
const TONES = { 'all/sick/pos': 'success', 'all/well/pos': 'danger' }; // the two leaves that say "+"

// layout: tree().nodeSize([dy, dx]) works top-down, so its x is our vertical position.
// separation 1 everywhere keeps the leaves evenly spaced (the default puts cousins 2 apart).
const LEVEL = 140, LEAF = 40;
const layout = d3.tree().nodeSize([LEAF, LEVEL]).separation(() => 1);
const boxW = (label) => (label === 'person' ? 62 : label === 'healthy' ? 62 : label === 'sick' ? 42 : 34); // fixed widths: no text measuring

const BAR_W = 380, BAR_Y = 160;
const fig = kit.figure(430, 200, { pad: 4 });
const root = fig.svg.append('g').attr('transform', 'translate(36,16)');
const edgeLayer = root.append('g');
const nodeLayer = root.append('g');

function draw() {
  const tree = layout(d3.hierarchy(model()));
  const top = d3.min(tree.leaves(), (d) => d.x); // nodeSize centres the root on 0; shift so the first leaf sits at y = 0
  const pathOf = (d) => d.ancestors().reverse().map((a) => a.data.key).join('/');
  const nodes = tree.descendants().map((d) => ({
    id: pathOf(d), d, x: d.y, y: d.x - top,
    prob: d3.reduce(d.ancestors(), (acc, a) => acc * (a.data.p ?? 1), 1), // the multiplication rule: product of branch probabilities up to the root
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links = tree.links().map((l) => ({ id: pathOf(l.target), a: byId.get(pathOf(l.source)), b: byId.get(pathOf(l.target)) }));

  // edges: a line plus its probability label, in one group per branch
  edgeLayer.selectAll('g.edge').data(links, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'edge');
    g.append('line');
    g.append('text').attr('text-anchor', 'middle').style('font-size', '11px').attr('class', 'halo');
    return g;
  }).each(function (l) {
    const tone = TONES[l.id], g = d3.select(this);
    const x1 = l.a.x + boxW(l.a.d.data.label) / 2 + 2, x2 = l.b.x - boxW(l.b.d.data.label) / 2 - 4;
    g.select('line').attr('class', kit.cls('line', kit.tone(tone))).attr('x1', x1).attr('y1', l.a.y).attr('x2', x2).attr('y2', l.b.y);
    g.select('text').attr('class', kit.cls('halo value', kit.tone(tone))).attr('x', (x1 + x2) / 2)
      .attr('y', (l.a.y + l.b.y) / 2 + (l.b.y > l.a.y ? 10 : -10)).attr('dy', '.35em').text(pct(l.b.d.data.p));
  });

  // nodes: box + label; leaves also get their product to the right
  nodeLayer.selectAll('g.node').data(nodes, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'node');
    g.append('rect').attr('height', 24).attr('rx', 6).attr('y', -12);
    g.append('text').attr('class', 'value').attr('text-anchor', 'middle').attr('dy', '.35em').style('font-size', '12px');
    g.append('text').attr('class', 'prod value').style('font-size', '11px').attr('dy', '.35em');
    return g;
  }).each(function (n) {
    const tone = TONES[n.id], g = d3.select(this), w = boxW(n.d.data.label), leaf = !n.d.children;
    g.attr('transform', `translate(${n.x},${n.y})`);
    g.select('rect').attr('class', kit.cls('solid', kit.tone(tone))).attr('x', -w / 2).attr('width', w);
    g.select('text.value:not(.prod)').attr('class', kit.cls('value', kit.tone(tone))).text(n.d.data.label);
    g.select('.prod').attr('class', kit.cls('prod value', kit.tone(tone ?? 'muted'))).attr('x', w / 2 + 10)
      .style('fill', tone ? null : 'var(--muted)').text(leaf ? pct(n.prob) : '');
  });

  // Bayes: among everyone who tests +, the share who are sick = true positives / all positives
  const tp = byId.get('all/sick/pos').prob, fp = byId.get('all/well/pos').prob;
  const posterior = tp / (tp + fp);
  const split = BAR_W * posterior;
  const bar = [
    { id: 'tp', x: 0, w: split, tone: 'success' },
    { id: 'fp', x: split, w: BAR_W - split, tone: 'danger' },
  ];
  root.selectAll('rect.share').data(bar, (d) => d.id).join((enter) => enter.append('rect').attr('class', (d) => kit.cls('share solid', kit.tone(d.tone)))
    .attr('y', BAR_Y).attr('height', 18).attr('rx', 3).attr('x', (d) => d.x).attr('width', (d) => d.w))
    .call((r) => kit.tr(r, 200).attr('x', (d) => d.x).attr('width', (d) => Math.max(0, d.w)));
  root.selectAll('text.cap').data([
    { id: 't', x: 0, y: BAR_Y - 12, anchor: 'start', text: 'everyone who tests +', cls: 'muted' },
    { id: 'tp', x: 4, y: BAR_Y + 30, anchor: 'start', text: `sick ${pct(posterior)}`, cls: 'value tone-success' },
    { id: 'fp', x: BAR_W - 4, y: BAR_Y + 30, anchor: 'end', text: `healthy ${pct(1 - posterior)}`, cls: 'value tone-danger' },
  ], (d) => d.id).join('text').attr('class', (d) => `cap ${d.cls}`).style('font-size', '12px')
    .attr('x', (d) => d.x).attr('y', (d) => d.y).attr('text-anchor', (d) => d.anchor).text((d) => d.text);

  const c = (v, tone) => kit.el('span', { style: `color: var(--${tone})` }, v.toFixed(4));
  formula.replaceChildren(
    kit.el('i', { style: 'font-family: var(--math); font-size: 16px' }, 'P(sick | +) = '), c(tp, 'success'), ' / (', c(tp, 'success'), ' + ', c(fp, 'danger'), ') = ', kit.el('b', {}, pct(posterior)),
  );
}

const formula = kit.status();
fig.add(kit.slider({ label: 'Prevalence', min: 0.1, max: 20, step: 0.1, value: prior, format: (v) => `${v}%`, onInput: (v) => { prior = v; draw(); } }));
fig.add(kit.slider({ label: 'Sensitivity', min: 50, max: 100, step: 0.5, value: sens, format: (v) => `${v}%`, onInput: (v) => { sens = v; draw(); } }));
fig.add(kit.slider({ label: 'Specificity', min: 50, max: 100, step: 0.5, value: spec, format: (v) => `${v}%`, onInput: (v) => { spec = v; draw(); } }));
fig.add(formula);
fig.add(kit.el('p', { class: 'status', style: 'color: var(--muted); font-size: 13px' }, 'With 1% prevalence, most positives are false. What has to change for a positive to mean “probably sick”?'));
draw();
return fig.el;
