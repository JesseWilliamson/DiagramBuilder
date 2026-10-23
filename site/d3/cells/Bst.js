// A binary search tree you can grow. Insert a value, or click a node to search
// for it: the search walks down from the root one node per tick (yellow = where
// we are, purple = already passed, green = found / new).
//
// The d3 ideas:
//  - d3.hierarchy turns a nested object into nodes that know their depth and
//    parent. We still own the tree (plain objects, copy-on-write); d3 only reads it.
//  - a KEYED data join (`d => d.key`): a new key is an *enter*, so the node and
//    its edge start at the parent's position and slide out to their own. Nodes
//    that persist (everything else) just transition to their new place.
//  - two layouts: the default puts node i at x = i (its position in an in-order
//    walk, so the row is sorted left to right, like the array you'd get from an
//    in-order traversal); the toggle swaps in d3.tree(), the Reingold-Tilford
//    layout, which packs the same tree into less width. Flip it and everything glides.
//
// Note on d3.tree vs dsviz's layout.tidy: d3.tree puts a lone child straight under
// its parent, so you can't tell a left child from a right one. For a BST that
// matters, so below we give every one-child node an invisible "ghost" sibling to
// hold the empty side (dsviz does the same with an empty slot). d3.tree is a
// proper Walker/Buchheim layout, so it keeps subtrees apart with no known
// spacing bug; with nodeSize and a constant separation it centres each parent
// over its children.

const R = 18, DX = 40, DY = 58, PAD = 14;

// ── the tree: plain objects, never mutated ─────────────────────────────────
const insert = (n, key) => {
  if (!n) return { key, left: null, right: null };
  if (key < n.key) return { ...n, left: insert(n.left, key) }; // copy on write
  if (key > n.key) return { ...n, right: insert(n.right, key) };
  return n;
};
const searchPath = (root, key) => {
  const path = [];
  for (let n = root; n; n = key < n.key ? n.left : n.right) {
    path.push(n.key);
    if (n.key === key) break;
  }
  return path;
};

// ── layout: tree -> [{ key, x, y, parent }] ────────────────────────────────
function layout(root, mode) {
  if (!root) return [];
  let h;
  if (mode === 'tidy') {
    // ghosts hold the empty side of a node that has exactly one child
    const kids = (n) => (n.ghost ? null : n.left || n.right ? [n.left ?? { key: `~${n.key}L`, ghost: true }, n.right ?? { key: `~${n.key}R`, ghost: true }] : null);
    h = d3.hierarchy(root, kids);
    d3.tree().nodeSize([DX, DY]).separation(() => 1)(h); // sets h.x, h.y on every node
  } else {
    h = d3.hierarchy(root, (n) => [n.left, n.right].filter(Boolean));
    // in-order: left subtree, node, right subtree. d3.hierarchy has no in-order
    // iterator (each / eachBefore / eachAfter are breadth / pre / post order), so a
    // three-line walk over our own objects numbers the nodes, and the hierarchy
    // supplies the depth.
    const order = new Map();
    const walk = (n) => { if (!n) return; walk(n.left); order.set(n.key, order.size); walk(n.right); };
    walk(root);
    h.each((n) => { n.x = (order.get(n.data.key) - (order.size - 1) / 2) * DX; });
  }
  return h.descendants().filter((n) => !n.data.ghost).map((n) => ({
    key: n.data.key, x: n.x, y: n.depth * DY + R, parent: n.parent?.data.key ?? null, depth: n.depth,
  }));
}

// ── state ──────────────────────────────────────────────────────────────────
let root = [50, 30, 70, 20, 40, 60, 85, 35].reduce(insert, null);
let value = 45, mode = 'inorder';
let tones = {}; // key -> tone, set while a search walks
const timers = [];
invalidation.then(() => timers.forEach(clearTimeout));

const W0 = 360, H0 = 3 * DY + 2 * R + 2 * PAD; // minimum size so a small tree doesn't jump around
const fig = kit.figure(W0, H0);
const { svg } = fig;
const edgeLayer = svg.append('g');
const nodeLayer = svg.append('g');

function draw() {
  const nodes = layout(root, mode);
  const at = new Map(nodes.map((n) => [n.key, n]));
  const toneOf = (k) => kit.tone(tones[k]);

  // the camera: grow the viewBox to fit the tree, and animate it
  const xs = nodes.map((n) => n.x), maxDepth = d3.max(nodes, (n) => n.depth) ?? 0;
  const half = Math.max(W0 / 2, (d3.max(xs, Math.abs) ?? 0) + R + PAD);
  const w = 2 * half, h = Math.max(H0, maxDepth * DY + 2 * R + 2 * PAD);
  kit.tr(svg).attr('viewBox', [-half, -PAD, w, h].join(' ')).attr('width', w);

  // edges: one per node except the root, keyed by the CHILD. After a layout change
  // the same edge just re-attaches to the new parent position.
  const pos = (d) => ({ x1: at.get(d.parent).x, y1: at.get(d.parent).y, x2: d.x, y2: d.y });
  edgeLayer.selectAll('line').data(nodes.filter((n) => n.parent !== null), (d) => d.key).join(
    (enter) => enter.append('line')
      .attr('x1', (d) => at.get(d.parent).x).attr('y1', (d) => at.get(d.parent).y)
      .attr('x2', (d) => at.get(d.parent).x).attr('y2', (d) => at.get(d.parent).y), // zero length, at the parent
    (update) => update,
    (exit) => exit.remove(),
  )
    .attr('class', (d) => kit.cls('line', toneOf(d.key)))
    .call((s) => kit.tr(s).attr('x1', (d) => pos(d).x1).attr('y1', (d) => pos(d).y1).attr('x2', (d) => pos(d).x2).attr('y2', (d) => pos(d).y2));

  // nodes: a group per key holding the circle and its label. The line above is
  // drawn first, so the opaque circle hides the part of it inside the node.
  // slide: tween the translate() from wherever the node is now to its new x,y. We
  // remember the position on the element (this.__xy) and interpolate the two
  // numbers ourselves; it is exact, and cheaper than parsing the transform string back.
  function slide(d) {
    const i = d3.interpolate(this.__xy, [d.x, d.y]);
    return (t) => (this.__xy = i(t), `translate(${this.__xy})`);
  }
  nodeLayer.selectAll('g.node').data(nodes, (d) => d.key).join((enter) => {
    const g = enter.append('g').attr('class', 'node click').style('opacity', 0)
      .each(function (d) { this.__xy = d.parent === null ? [d.x, d.y] : [at.get(d.parent).x, at.get(d.parent).y]; }) // start at the parent
      .attr('transform', function () { return `translate(${this.__xy})`; });
    g.append('circle').attr('r', R);
    g.append('text').attr('class', 'value').attr('text-anchor', 'middle').attr('dy', '.35em').attr('font-size', 15).text((d) => d.key);
    g.on('click', (e, d) => walk(d.key, () => { tones = { [d.key]: 'success' }; draw(); }));
    return g;
  })
    .call((g) => g.select('circle').attr('class', (d) => kit.cls('solid', toneOf(d.key))))
    .call((g) => kit.tr(g).attrTween('transform', slide).style('opacity', 1));
}

// ── interaction ────────────────────────────────────────────────────────────
const msg = kit.status('Insert a value, or click a node to search for it.');

// Walk the search path one node per tick, then call done().
function walk(key, done) {
  timers.forEach(clearTimeout);
  timers.length = 0;
  const path = searchPath(root, key);
  path.forEach((k, i) => timers.push(setTimeout(() => {
    tones = { ...Object.fromEntries(path.slice(0, i).map((p) => [p, 'visited'])), [k]: 'active' };
    msg.set(k === key ? `Found ${k}.` : `${key} ${key < k ? '<' : '>'} ${k}: go ${key < k ? 'left' : 'right'}.`);
    draw();
  }, i * 420)));
  timers.push(setTimeout(done, path.length * 420));
}

function add(key) {
  const root0 = root;
  walk(key, () => {
    const exists = searchPath(root0, key).includes(key);
    root = insert(root, key);
    tones = { [key]: exists ? 'active' : 'success' };
    msg.set(exists ? `${key} is already in the tree.` : `Inserted ${key}.`);
    draw();
  });
}

const stepper = kit.stepper({ label: 'Value', value, min: 1, max: 99, onInput: (v) => (value = v) });
const controls = kit.row(
  stepper,
  kit.button('Insert', () => add(value)),
  kit.button('Random', () => { value = 1 + Math.floor(Math.random() * 99); stepper.set(value); add(value); }),
  kit.button('Clear', () => { timers.forEach(clearTimeout); root = null; tones = {}; msg.set('Empty tree.'); draw(); }),
  kit.segmented({ options: [{ value: 'inorder', label: 'In-order columns' }, { value: 'tidy', label: 'd3.tree' }], value: mode, onInput: (v) => { mode = v; draw(); } }),
);

draw();
fig.add(msg);
fig.add(controls);
return fig.el;
