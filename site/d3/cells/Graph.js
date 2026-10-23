// BFS and DFS on a graph you can drag. Click a node to start from it, step with
// the transport bar. Yellow = the node being processed, purple = done, blue =
// waiting in the queue / stack (shown as a row under the graph), purple edges =
// the search tree found so far.
//
// The d3 ideas:
//  - d3.drag on the nodes: positions are plain data (POS), and a drag only
//    writes a new x,y and calls place(), which re-sets the node transforms and
//    the edge endpoints. The edges are not "attached" to the nodes; they are
//    recomputed from the same data, which is why nothing can come loose.
//  - the graph itself never changes, so its nodes and edges are joined ONCE,
//    and each frame only re-classes them (paint). The queue/stack row does
//    change, so it gets a keyed join with real enter and exit transitions.
//  - the key of a queue cell is a push counter, not the node's name. DFS can
//    push the same node twice; two cells with the same key is the classic
//    keyed-join bug (d3 would silently keep only one).
//  - the algorithm is a generator (like BinarySearch): one frame per yield, and
//    the player just draws frame i.
//  - d3.drag already ignores the click that follows a drag, so "drag to move,
//    click to start here" needs no extra code.

const POS = {
  A: [-150, -100], B: [0, -125], C: [150, -100], D: [-185, 15], E: [-45, -5],
  F: [105, 10], G: [190, 95], H: [-110, 110], I: [40, 115],
};
const EDGES = [['A', 'B'], ['A', 'D'], ['B', 'C'], ['B', 'E'], ['C', 'F'], ['D', 'E'], ['D', 'H'], ['E', 'F'], ['E', 'I'], ['F', 'G'], ['H', 'I'], ['I', 'G']];
const adj = {};
for (const [u, v] of EDGES) (adj[u] ??= []).push(v), (adj[v] ??= []).push(u);
for (const k in adj) adj[k].sort();

function* traverse(from, mode) {
  let pushes = 0;
  const frontier = [{ v: from, key: `p${pushes++}` }];
  const seen = new Set([from]);
  const done = [];
  const tree = [];
  const parent = {};
  const snap = (cur, msg) => ({ frontier: [...frontier], done: [...done], tree: [...tree], cur, msg });
  yield snap(null, `start at ${from}`);
  while (frontier.length) {
    const { v } = mode === 'BFS' ? frontier.shift() : frontier.pop();
    if (done.includes(v)) { yield snap(null, `${v} was already visited, skip`); continue; }
    if (mode === 'DFS') { seen.add(v); if (parent[v]) tree.push(parent[v]); }
    yield snap(v, `${mode === 'BFS' ? 'dequeue' : 'pop'} ${v}`);
    for (const w of mode === 'BFS' ? adj[v] : [...adj[v]].reverse()) {
      if (seen.has(w)) continue;
      if (mode === 'BFS') { seen.add(w); tree.push([v, w]); } else parent[w] = [v, w];
      frontier.push({ v: w, key: `p${pushes++}` });
    }
    done.push(v);
    yield snap(v, `${mode === 'BFS' ? 'enqueue' : 'push'} unvisited neighbours of ${v}`);
  }
  yield snap(null, `done: ${done.join(' → ')}`);
}

const R = 22, CELL = 30, CGAP = 4, ROW = [-150, 168]; // queue row: left edge, top edge

let from = 'A', mode = 'BFS', f = null;

const fig = kit.figure(480, 380);
const { svg } = fig;
svg.attr('viewBox', '-240 -165 480 380');
const edgeLayer = svg.append('g');
const nodeLayer = svg.append('g');
const rowLayer = svg.append('g');
const rowLabel = svg.append('text').attr('class', 'muted').attr('font-size', 12).attr('text-anchor', 'end').attr('x', -162).attr('y', 183);

// Static parts, joined once.
const edgeSel = edgeLayer.selectAll('line').data(EDGES.map(([u, v]) => ({ u, v }))).join('line');
const nodeSel = nodeLayer.selectAll('g.node').data(Object.keys(POS).map((id) => ({ id })), (d) => d.id).join((enter) => {
  const g = enter.append('g').attr('class', 'node drag click');
  g.append('circle').attr('r', R);
  g.append('text').attr('class', 'value').attr('text-anchor', 'middle').attr('dy', '.35em').attr('font-size', 15).text((d) => d.id);
  return g;
});

// Positions: called on every drag. No transition: the node should stay under the pointer.
function place() {
  nodeSel.attr('transform', (d) => `translate(${POS[d.id]})`);
  edgeSel.attr('x1', (d) => POS[d.u][0]).attr('y1', (d) => POS[d.u][1]).attr('x2', (d) => POS[d.v][0]).attr('y2', (d) => POS[d.v][1]);
}

nodeSel.call(kit.draggable(([x, y], d) => { POS[d.id] = [x, y]; place(); }))
  .on('click', (e, d) => { from = d.id; player.pause(); player.replace([...traverse(from, mode)]); });

// tween translate(x,y) between two numbers; the element remembers where it is (this.__xy)
function slideTo(sel, to) {
  return sel.attrTween('transform', function (d) {
    const i = d3.interpolate(this.__xy, to.call(this, d));
    return (t) => (this.__xy = i(t), `translate(${this.__xy})`);
  });
}

function paint(frame) {
  f = frame;
  const inFrontier = new Set(f.frontier.map((x) => x.v));
  const isTree = (u, v) => f.tree.some(([a, b]) => (a === u && b === v) || (a === v && b === u));
  nodeSel.select('circle').attr('class', (d) => kit.cls('solid', kit.tone(d.id === f.cur ? 'active' : f.done.includes(d.id) ? 'visited' : inFrontier.has(d.id) ? 'accent' : null)));
  edgeSel.attr('class', (d) => kit.cls('line', kit.tone(isTree(d.u, d.v) ? 'visited' : null)));

  // the queue / stack row: cell i sits at x = i * (CELL + CGAP). The next one out is blue.
  const next = mode === 'BFS' ? 0 : f.frontier.length - 1;
  const cellXY = (d) => [ROW[0] + d.i * (CELL + CGAP) + CELL / 2, ROW[1] + CELL / 2];
  const items = f.frontier.map((x, i) => ({ ...x, i }));
  const exitTo = mode === 'BFS' ? [-40, 0] : [30, -20]; // BFS items leave to the left, DFS items pop upwards
  rowLayer.selectAll('g.cell').data(items, (d) => d.key).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'cell').style('opacity', 0)
        .each(function (d) { const [x, y] = cellXY(d); this.__xy = [x + 30, y]; }) // slide in from the right
        .attr('transform', function () { return `translate(${this.__xy})`; });
      g.append('rect').attr('x', -CELL / 2).attr('y', -CELL / 2).attr('width', CELL).attr('height', CELL).attr('rx', 6);
      g.append('text').attr('class', 'value').attr('text-anchor', 'middle').attr('dy', '.35em').text((d) => d.v);
      return g;
    },
    (update) => update,
    (exit) => exit
      .call((g) => slideTo(kit.tr(g, 350), function () { return [this.__xy[0] + exitTo[0], this.__xy[1] + exitTo[1]]; }).style('opacity', 0).remove()),
  )
    .call((g) => g.select('rect').attr('class', (d) => kit.cls('solid', kit.tone(d.i === next ? 'accent' : null))))
    .call((g) => slideTo(kit.tr(g, 350), cellXY).style('opacity', 1));
  rowLabel.text(mode === 'BFS' ? 'queue' : 'stack');
  msg.set(f.msg);
}

const msg = kit.status();
const player = kit.player([...traverse(from, mode)], { interval: 650, onFrame: paint, invalidation });
place();

const hint = kit.el('p', { class: 'status' }, 'Drag nodes around. Click one to start from it.');
hint.style.color = 'var(--muted)';
fig.add(msg);
fig.add(kit.transport(player));
fig.add(kit.row(
  kit.segmented({ options: ['BFS', 'DFS'], value: mode, onInput: (v) => { mode = v; player.pause(); player.replace([...traverse(from, mode)]); } }),
  hint,
));
return fig.el;
