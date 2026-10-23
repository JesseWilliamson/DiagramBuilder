// An n-ary tree (a project's folders) laid out two ways. "One column per leaf"
// gives every leaf its own column: simple, never overlaps, but wide. "Tidy"
// (Reingold-Tilford) pushes each subtree left until its outline almost touches
// the one before it, so the same tree fits in far less width. Add files and
// watch the subtrees make room; nodes are keyed by path, so everything slides.
//
// The d3 ideas:
//  - d3.hierarchy + d3.tree() IS the tidy layout. dsviz needed ~150 lines for
//    layout/tidy.ts; here it is one call. d3.tree is the linear-time Walker /
//    Buchheim version, so it also fixes the limit noted in dsviz's tidy.ts:
//    small subtrees between two big ones are spread out evenly instead of
//    piling up on the left.
//  - nodeSize([1, dy]) makes d3.tree work in pixels, and then `separation(a, b)`
//    returns the *pixel* gap between two neighbours. Boxes have different
//    widths (file names), so the separation is half of each width plus a gap.
//  - d3.cluster() is the "one column per leaf" layout (leaves evenly spaced,
//    parents over their children). It also parks every leaf on the bottom row,
//    so we overwrite y with depth * dy. A parent sits at the MEAN of its
//    children's x, where dsviz's version uses the midpoint of the first and last,
//    so lopsided subtrees differ by a few pixels. (dsviz's columns are a fixed
//    46px, which lets wide file names overlap; here a column is as wide as the
//    widest box, so the layout does what it promises: never overlaps, but wide.)
//  - one keyed join (key = path) drives both layouts: switching layout is just
//    new x,y for the same keys.

const R = 16, GAP = 14, DY = 64, BOX_H = R * 1.5, PAD = 14;

const start = {
  key: 'src', children: [
    { key: 'src/ds', label: 'ds', children: [{ key: 'src/ds/array', label: 'array.ts' }, { key: 'src/ds/tree', label: 'tree.ts' }] },
    { key: 'src/layout', label: 'layout', children: [{ key: 'src/layout/layered', label: 'layered.ts' }, { key: 'src/layout/tidy', label: 'tidy.ts' }] },
    { key: 'src/index', label: 'index.ts' },
    { key: 'src/react', label: 'react', children: [{ key: 'src/react/Diagram', label: 'Diagram.tsx' }] },
  ],
};

// Add a file to the n-th folder (round robin), without mutating the old tree.
function addFile(t, count) {
  const folders = t.children.filter((c) => c.children);
  const target = folders[count % folders.length];
  return { ...t, children: t.children.map((c) => (c === target ? { ...c, children: [...c.children, { key: `${c.key}/new${count}`, label: `new${count}.ts` }] } : c)) };
}

const label = (d) => d.label ?? d.key;
// No text measuring in an Observable cell we can trust, so estimate: about 0.6 em per character.
const width = (d) => Math.max(2 * R, label(d).length * 14 * 0.6 + 20);

function layout(root, mode) {
  const h = d3.hierarchy(root);
  if (mode === 'tidy') {
    d3.tree().nodeSize([1, DY]).separation((a, b) => (width(a.data) + width(b.data)) / 2 + GAP)(h);
  } else {
    const column = d3.max(h.descendants(), (n) => width(n.data)) + GAP; // wide enough for the widest box, so nothing overlaps
    d3.cluster().nodeSize([column, DY]).separation(() => 1)(h);
    h.each((n) => (n.y = n.depth * DY));
  }
  return h.descendants().map((n) => ({ key: n.data.key, data: n.data, x: n.x, y: n.y + BOX_H / 2, w: width(n.data), parent: n.parent?.data.key ?? null }));
}

let root = start, count = 0, mode = 'tidy';

const fig = kit.figure(480, 220);
const { svg } = fig;
const edgeLayer = svg.append('g');
const nodeLayer = svg.append('g');

function draw() {
  const nodes = layout(root, mode);
  const at = new Map(nodes.map((n) => [n.key, n]));

  // the camera: fit the viewBox to the tree and animate it
  const x0 = d3.min(nodes, (n) => n.x - n.w / 2) - PAD, x1 = d3.max(nodes, (n) => n.x + n.w / 2) + PAD;
  const y1 = d3.max(nodes, (n) => n.y) + BOX_H / 2 + PAD;
  kit.tr(svg).attr('viewBox', [x0, -PAD, x1 - x0, y1 + PAD].join(' ')).attr('width', x1 - x0);

  // edges: keyed by the child, drawn from the parent. A new edge starts with zero length at the parent.
  edgeLayer.selectAll('line').data(nodes.filter((n) => n.parent !== null), (d) => d.key).join(
    (enter) => enter.append('line')
      .attr('x1', (d) => at.get(d.parent).x).attr('y1', (d) => at.get(d.parent).y)
      .attr('x2', (d) => at.get(d.parent).x).attr('y2', (d) => at.get(d.parent).y),
    (update) => update,
    (exit) => exit.remove(),
  )
    .attr('class', 'line')
    .call((s) => kit.tr(s).attr('x1', (d) => at.get(d.parent).x).attr('y1', (d) => at.get(d.parent).y).attr('x2', (d) => d.x).attr('y2', (d) => d.y));

  // nodes: rect + label per key
  nodeLayer.selectAll('g.node').data(nodes, (d) => d.key).join((enter) => {
    const g = enter.append('g').attr('class', 'node').style('opacity', 0)
      .each(function (d) { const p = d.parent === null ? d : at.get(d.parent); this.__xy = [p.x, p.y]; })
      .attr('transform', function () { return `translate(${this.__xy})`; });
    g.append('rect').attr('rx', 6).attr('height', BOX_H).attr('y', -BOX_H / 2);
    g.append('text').attr('class', 'value').attr('text-anchor', 'middle').attr('dy', '.35em').text((d) => label(d.data));
    return g;
  })
    .call((g) => g.select('rect').attr('class', (d) => kit.cls('solid', d.key === 'src' && 'tone-accent')).attr('width', (d) => d.w).attr('x', (d) => -d.w / 2))
    .call((g) => kit.tr(g).attrTween('transform', function (d) {
      // tween translate(x,y) between two numbers; the position is remembered on the element
      const i = d3.interpolate(this.__xy, [d.x, d.y]);
      return (t) => (this.__xy = i(t), `translate(${this.__xy})`);
    }).style('opacity', 1));
}

const controls = kit.row(
  kit.segmented({ options: [{ value: 'tidy', label: 'Tidy' }, { value: 'leaves', label: 'One column per leaf' }], value: mode, onInput: (v) => { mode = v; draw(); } }),
  kit.button('Add a file', () => { root = addFile(root, count++); draw(); }),
  kit.button('Reset', () => { root = start; count = 0; draw(); }),
);

draw();
fig.add(controls);
return fig.el;
