// Colour the map: click a region (node) to cycle its colour. Neighbours
// (connected nodes) must differ. Conflicts light up red as you go.
//
// The d3 ideas: this one is almost all data join. The colouring is a plain
// object (id -> 0..3), and one `paint()` turns it into classes: the node's fill
// from its colour, an edge red when both its ends share a colour. Nothing is
// "updated in place"; you change the data and run the same join again.
// The colour change itself animates for free: the kit's `.solid` has a CSS
// transition on fill, so changing the class fades the colour.

const POS = {
  A: [-160, -80], B: [-40, -125], C: [90, -95], D: [190, 5], E: [-170, 45],
  F: [-35, -5], G: [85, 45], H: [-60, 120], I: [130, 135],
};
const EDGES = [
  ['A', 'B'], ['A', 'E'], ['A', 'F'], ['B', 'F'], ['B', 'C'], ['C', 'F'], ['C', 'G'], ['C', 'D'],
  ['D', 'G'], ['D', 'I'], ['E', 'F'], ['E', 'H'], ['F', 'G'], ['F', 'H'], ['G', 'H'], ['G', 'I'],
];
const PALETTE = ['accent', 'active', 'success', 'visited']; // colour 0..3
const IDS = Object.keys(POS);

let colour = {}; // id -> palette index; absent = uncoloured

const fig = kit.figure(440, 330);
const { svg } = fig;
svg.attr('viewBox', '-215 -160 440 330');

const edgeSel = svg.append('g').selectAll('line').data(EDGES.map(([u, v]) => ({ u, v }))).join('line')
  .attr('x1', (d) => POS[d.u][0]).attr('y1', (d) => POS[d.u][1]).attr('x2', (d) => POS[d.v][0]).attr('y2', (d) => POS[d.v][1]);
const nodeSel = svg.append('g').selectAll('g').data(IDS, (d) => d).join((enter) => {
  const g = enter.append('g').attr('class', 'click').attr('transform', (d) => `translate(${POS[d]})`);
  g.append('circle').attr('r', 20);
  g.append('text').attr('class', 'value').attr('text-anchor', 'middle').attr('dy', '.35em').attr('font-size', 15).text((d) => d);
  return g;
}).on('click', (e, id) => { colour = { ...colour, [id]: ((colour[id] ?? -1) + 1) % PALETTE.length }; paint(); });

const msg = kit.status();

function paint() {
  const clash = (u, v) => colour[u] !== undefined && colour[u] === colour[v];
  const conflicts = EDGES.filter(([u, v]) => clash(u, v)).length;
  const used = new Set(Object.values(colour)).size;
  const solved = IDS.every((id) => colour[id] !== undefined) && conflicts === 0;

  nodeSel.select('circle').attr('class', (id) => kit.cls('solid', colour[id] === undefined ? '' : kit.tone(PALETTE[colour[id]])));
  edgeSel.attr('class', (d) => kit.cls('line', clash(d.u, d.v) && 'tone-danger'));
  msg.set(solved ? `Solved with ${used} colours.` : conflicts ? `${conflicts} clash${conflicts > 1 ? 'es' : ''}: two neighbours share a colour.` : 'Click a node to colour it.');
}

paint();
fig.add(kit.el('div', { class: 'row spread' }, msg, kit.button('Clear', () => { colour = {}; paint(); })));
return fig.el;
