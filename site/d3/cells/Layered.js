// A build pipeline with no coordinates at all. A layered layout puts every task
// one layer below the last thing it waits for, orders each layer so lines cross
// as little as possible, and bends long edges around the boxes between.
//
// Click a task to "change" it. Its kind says what it IS in the blast radius:
// changed (yellow), upstream (blue: what it needed), downstream (purple: what
// must re-run), test (green: downstream tests). Edges outside the blast radius
// are greyed.
//
// WHAT d3 DOES NOT GIVE YOU: d3 has trees (d3.tree, d3.cluster) and force
// layouts, but no layered / Sugiyama layout for general DAGs (d3-dag is a
// separate package). So `layered()` below is hand-written, a port of dsviz's
// src/layout/layered.ts, in four passes:
//   1. layer = longest path from a source          (d3.group does the lookup)
//   2. dummy nodes: an edge that skips layers gets one invisible stop per layer
//      it crosses, so it can bend around the boxes in between
//   3. order each layer by the barycentre (average position) of its neighbours,
//      sweeping down and up; keep the order with the fewest crossings
//   4. place along each layer: every node wants the average of its neighbours,
//      but nodes must keep their order and a minimum gap. "Closest positions
//      that keep the order" is isotonic regression: pack() solves it exactly
//      (pool-adjacent-violators).
// Left out compared with dsviz: cycle breaking (this input is a DAG; a cycle
// would recurse forever in rankOf).
//
// WHAT d3 DOES GIVE YOU: the drawing. d3.line() with a curve turns each edge's
// waypoints into a path (curveLinear for Straight and Elbow, curveMonotoneY/X
// for Smooth, which curves through the dummy-node stops); keyed joins slide
// nodes when the direction flips; d3.max/min/group/range do the bookkeeping.

const TASKS = ['fetch deps', 'lint', 'typecheck', 'compile', 'unit tests', 'bundle', 'docs', 'e2e tests', 'deploy'];
const DEPS = [
  ['fetch deps', 'lint'], ['fetch deps', 'typecheck'], ['fetch deps', 'compile'], ['typecheck', 'compile'],
  ['compile', 'unit tests'], ['compile', 'bundle'], ['bundle', 'e2e tests'], ['lint', 'deploy'],
  ['unit tests', 'deploy'], ['e2e tests', 'deploy'], ['fetch deps', 'docs'], ['docs', 'deploy'],
];

// Everything reachable from t following edges forward (dir 1) or backward (dir 0).
const reach = (t, dir, out = new Set()) => {
  for (const e of DEPS) if (e[1 - dir] === t && !out.has(e[dir])) (out.add(e[dir]), reach(e[dir], dir, out));
  return out;
};

// ── the layout helper ──────────────────────────────────────────────────────

// Closest positions to `want` that keep their order and at least sep[i] between i-1 and i.
// Subtract the minimum offsets c[i]; the constraint becomes "non-decreasing", and the
// closest non-decreasing sequence comes from pooling neighbours that violate it into their average.
function pack(want, sep) {
  const c = [];
  want.forEach((_, i) => c.push(i === 0 ? 0 : c[i - 1] + sep[i]));
  const blocks = [];
  want.forEach((w, i) => {
    blocks.push({ sum: w - c[i], n: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1], a = blocks[blocks.length - 2];
      if (a.sum / a.n <= b.sum / b.n) break;
      a.sum += b.sum; a.n += b.n; blocks.pop();
    }
  });
  const out = [];
  for (const b of blocks) for (let k = 0; k < b.n; k++) out.push(b.sum / b.n + c[out.length]);
  return out;
}

// nodes: [{ id, w, h }], edges: [{ from, to }]  ->  { pos(id), route(from, to, style), box }
function layered(nodes, edges, { direction = 'down', rankGap = 56, nodeGap = 28, sweeps = 6 } = {}) {
  const right = direction === 'right';
  // "along" is the size of a box along its layer, "across" the size in the flow direction
  const items = new Map(nodes.map((n) => [n.id, { id: n.id, along: right ? n.h : n.w, across: right ? n.w : n.h, dummy: false }]));

  // 1. layers: longest path from a source
  const into = d3.group(edges, (e) => e.to);
  const rank = new Map();
  const rankOf = (id) => (rank.has(id) ? rank.get(id) : (rank.set(id, d3.max(into.get(id) ?? [], (e) => rankOf(e.from) + 1) ?? 0), rank.get(id)));
  nodes.forEach((n) => rankOf(n.id));

  // 2. dummy nodes: a chain per edge, [from, d1, d2, ..., to]
  const chains = new Map();
  const down = new Map(), up = new Map(); // neighbours one layer below / above
  const link = (a, b) => ((down.get(a) ?? down.set(a, []).get(a)).push(b), (up.get(b) ?? up.set(b, []).get(b)).push(a));
  for (const e of edges) {
    const chain = [e.from];
    for (let r = rank.get(e.from) + 1; r < rank.get(e.to); r++) {
      const d = `~${e.from}>${e.to}#${r}`;
      items.set(d, { id: d, along: 0, across: 0, dummy: true });
      rank.set(d, r);
      chain.push(d);
    }
    chain.push(e.to);
    chain.forEach((id, i) => i && link(chain[i - 1], id));
    chains.set(`${e.from}>${e.to}`, chain);
  }
  const depth = d3.max(rank.values()) + 1;
  let layers = d3.range(depth).map(() => []);
  for (const id of items.keys()) layers[rank.get(id)].push(id);

  // 3. order: sort each layer by the average index of its neighbours in the reference layer
  const indexIn = (layer) => new Map(layer.map((id, i) => [id, i]));
  const reorder = (layer, ref, adj) => {
    const at = indexIn(ref);
    return layer
      .map((id, i) => {
        const ns = (adj.get(id) ?? []).map((n) => at.get(n));
        return { id, i, b: ns.length ? d3.mean(ns) : i * (ref.length / Math.max(1, layer.length)) };
      })
      .sort((a, b) => a.b - b.b || a.i - b.i) // stable: ties keep their order
      .map((s) => s.id);
  };
  const crossings = (ls) => d3.sum(d3.range(ls.length - 1), (r) => {
    const below = indexIn(ls[r + 1]);
    const pairs = ls[r].flatMap((id, i) => (down.get(id) ?? []).map((s) => [i, below.get(s)]));
    let n = 0;
    for (let i = 0; i < pairs.length; i++) for (let j = i + 1; j < pairs.length; j++) if ((pairs[i][0] - pairs[j][0]) * (pairs[i][1] - pairs[j][1]) < 0) n++;
    return n;
  });
  let best = layers.map((l) => [...l]), bestCross = crossings(best);
  for (let s = 0; s < sweeps && bestCross > 0; s++) {
    for (let r = 1; r < depth; r++) layers[r] = reorder(layers[r], layers[r - 1], up);
    for (let r = depth - 2; r >= 0; r--) layers[r] = reorder(layers[r], layers[r + 1], down);
    const c = crossings(layers);
    if (c < bestCross) (best = layers.map((l) => [...l]), (bestCross = c));
  }
  layers = best;

  // 4. coordinates. Across: layers stacked, rankGap between the thickest boxes of neighbours.
  const thick = layers.map((l) => d3.max(l, (id) => items.get(id).across) ?? 0);
  const acrossAt = [];
  thick.forEach((t, r) => acrossAt.push(r === 0 ? 0 : acrossAt[r - 1] + thick[r - 1] / 2 + rankGap + t / 2));
  // Along: start packed, then pull each node towards its neighbours a few times.
  const along = new Map();
  const sepOf = (l) => l.map((id, i) => {
    if (i === 0) return 0;
    const a = items.get(l[i - 1]), b = items.get(id);
    return (a.along + b.along) / 2 + (a.dummy && b.dummy ? nodeGap / 2 : nodeGap); // dummies are only lines: less room
  });
  const place = (l, want) => pack(want, sepOf(l)).forEach((v, i) => along.set(l[i], v));
  layers.forEach((l) => place(l, l.map(() => 0)));
  const pull = (l, adj) => place(l, l.map((id) => { const ns = adj.get(id) ?? []; return ns.length ? d3.mean(ns, (n) => along.get(n)) : along.get(id); }));
  for (let it = 0; it < 4; it++) {
    for (let r = 1; r < depth; r++) pull(layers[r], up);
    for (let r = depth - 2; r >= 0; r--) pull(layers[r], down);
  }
  // centre the real nodes on 0
  const reals = [...items.values()].filter((it) => !it.dummy);
  const shift = -(d3.min(reals, (it) => along.get(it.id) - it.along / 2) + d3.max(reals, (it) => along.get(it.id) + it.along / 2)) / 2;
  const P = new Map([...items.keys()].map((id) => {
    const a = along.get(id) + shift, c = acrossAt[rank.get(id)];
    return [id, right ? [c, a] : [a, c]];
  }));

  // where a route leaves / enters a box: the middle of the side that faces along the flow
  const face = (id, sign) => { const [x, y] = P.get(id), { across } = items.get(id); return right ? [x + (sign * across) / 2, y] : [x, y + (sign * across) / 2]; };
  // waypoints of an edge: box side, one stop per layer skipped, box side.
  // 'elbow' turns at right angles, halfway across each gap between consecutive points.
  const route = (from, to, style) => {
    const chain = chains.get(`${from}>${to}`);
    const pts = [face(from, 1), ...chain.slice(1, -1).map((id) => P.get(id)), face(to, -1)];
    if (style !== 'elbow') return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (Math.abs(right ? a[1] - b[1] : a[0] - b[0]) < 0.5) { out.push(b); continue; }
      const mid = right ? (a[0] + b[0]) / 2 : (a[1] + b[1]) / 2;
      out.push(right ? [mid, a[1]] : [a[0], mid], right ? [mid, b[1]] : [b[0], mid], b);
    }
    return out;
  };
  const boxes = reals.map((it) => { const [x, y] = P.get(it.id); const w = right ? it.across : it.along, h = right ? it.along : it.across; return [x - w / 2, y - h / 2, x + w / 2, y + h / 2]; });
  const box = { x0: d3.min(boxes, (b) => b[0]), y0: d3.min(boxes, (b) => b[1]), x1: d3.max(boxes, (b) => b[2]), y1: d3.max(boxes, (b) => b[3]) };
  return { pos: (id) => P.get(id), route, box, crossings: bestCross };
}

// ── drawing ────────────────────────────────────────────────────────────────
const R = 20, PAD = 14;
// no text measuring: estimate the label width (about 0.6 em per character at 14px)
const size = (id) => ({ id, w: Math.max(2 * R, Math.ceil(id.length * 14 * 0.6 + 24)), h: Math.round(1.5 * R) });
const nodes = TASKS.map(size);
const edges = DEPS.map(([from, to]) => ({ from, to, id: `${from}>${to}` }));

let direction = 'down', route = 'elbow', changed = 'typecheck', shown = '';

const fig = kit.figure(520, 330);
const { svg } = fig;
const mk = kit.markers(svg);
const edgeLayer = svg.append('g');
const nodeLayer = svg.append('g');
const msg = kit.status();

const curves = { straight: d3.curveLinear, elbow: d3.curveLinear };
function draw() {
  const L = layered(nodes, edges, { direction, rankGap: 44, nodeGap: 20 });
  const up = reach(changed, 0), down = reach(changed, 1);
  // kind -> tone. The kinds are what the diagram means; the tone is how we choose to show them.
  const kind = (t) => (t === changed ? 'changed' : t.endsWith('tests') && down.has(t) ? 'test' : down.has(t) ? 'downstream' : up.has(t) ? 'upstream' : null);
  const TONE = { changed: 'active', upstream: 'accent', downstream: 'visited', test: 'success' };

  // camera
  const { x0, y0, x1, y1 } = L.box;
  kit.tr(svg).attr('viewBox', [x0 - PAD, y0 - PAD, x1 - x0 + 2 * PAD, y1 - y0 + 2 * PAD].join(' ')).attr('width', x1 - x0 + 2 * PAD);

  // edges: d3.line() over the waypoints. Smooth uses a monotone curve in the flow direction.
  const curve = route === 'smooth' ? (direction === 'right' ? d3.curveMonotoneX : d3.curveMonotoneY) : curves[route];
  const line = d3.line().curve(curve);
  const moved = edgeLayer.selectAll('path').data(edges, (d) => d.id).join('path')
    .attr('marker-end', mk('arrow'))
    .attr('class', (d) => kit.cls('line', !(kind(d.from) && kind(d.to)) && 'muted'))
    .attr('d', (d) => line(L.route(d.from, d.to, route)));
  // the path's point count changes with the layout, so tweening `d` would look like soup:
  // fade the edges in once the boxes have settled instead
  if (shown && shown !== direction + route) moved.style('opacity', 0).transition().delay(250).duration(300).style('opacity', 1);

  // nodes: keyed by task, so a new direction slides them
  nodeLayer.selectAll('g.node').data(nodes, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'node click').each(function (d) { this.__xy = L.pos(d.id); })
      .attr('transform', function () { return `translate(${this.__xy})`; });
    g.append('rect').attr('rx', 6).attr('x', (d) => -d.w / 2).attr('y', (d) => -d.h / 2).attr('width', (d) => d.w).attr('height', (d) => d.h);
    g.append('text').attr('class', 'value').attr('text-anchor', 'middle').attr('dy', '.35em').text((d) => d.id);
    g.on('click', (e, d) => { changed = d.id; draw(); });
    return g;
  })
    .call((g) => g.select('rect').attr('class', (d) => kit.cls('solid', kit.tone(TONE[kind(d.id)]))))
    .call((g) => kit.tr(g).attrTween('transform', function (d) {
      const i = d3.interpolate(this.__xy, L.pos(d.id));
      return (t) => (this.__xy = i(t), `translate(${this.__xy})`);
    }));

  const b = document.createElement('b');
  b.textContent = changed;
  msg.replaceChildren('Changing ', b, ` re-runs ${down.size ? [...down].join(', ') : 'nothing else'}.`);
  shown = direction + route;
}

draw();
fig.add(msg);
fig.add(kit.row(
  kit.segmented({ options: [{ value: 'down', label: 'Down' }, { value: 'right', label: 'Right' }], value: direction, onInput: (v) => { direction = v; draw(); } }),
  kit.segmented({ options: [{ value: 'straight', label: 'Straight' }, { value: 'elbow', label: 'Elbow' }, { value: 'smooth', label: 'Smooth' }], value: route, onInput: (v) => { route = v; draw(); } }),
));
return fig.el;
