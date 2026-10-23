// What merge and rebase do to history. Commits are keyed by hash, so switching
// pictures animates: a merge ADDS one commit with two parents, while a rebase copies the
// feature commits onto main as NEW commits (new hashes, so the old dots fade out and new
// ones fade in) and leaves the old ones unreferenced.
//
// The d3 ideas: (1) a keyed join on the commit hash is the whole animation story: same
// hash = same element, which slides to its new row; new hash = enter; gone = exit.
// (2) Edges are a single d3.line() with curveBumpY through four points (child, where it
// reaches its lane, where it leaves the lane, parent). curveBumpY draws an S with vertical
// tangents between each pair, so one call gives "curve into the lane, run straight down,
// curve into the parent's column". Because every edge has the same four-point shape, d3's
// default string interpolation can morph one edge into another. (3) Lanes come from a
// plain walk down the commit list (`gitLanes`): d3 has no git layout, so that part is hand-written.

const base = [
  { hash: 'c3', parents: ['c2'], label: 'Fix login redirect' },
  { hash: 'f2', parents: ['f1'], label: 'Add dark theme toggle' },
  { hash: 'f1', parents: ['c2'], label: 'Extract theme tokens' },
  { hash: 'c2', parents: ['c1'], label: 'Cache user profile' },
  { hash: 'c1', parents: [], label: 'Initial commit' },
];
const pictures = {
  before: {
    commits: base,
    refs: [{ name: 'main', hash: 'c3', kind: 'branch' }, { name: 'feature', hash: 'f2', kind: 'branch' }, { name: 'HEAD', hash: 'f2', kind: 'head' }],
    note: 'feature forked from main at c2; both moved on since.',
  },
  merge: {
    commits: [{ hash: 'm1', parents: ['c3', 'f2'], label: "Merge branch 'feature'" }, ...base],
    refs: [{ name: 'main', hash: 'm1', kind: 'branch' }, { name: 'HEAD', hash: 'm1', kind: 'head' }, { name: 'feature', hash: 'f2', kind: 'branch' }],
    highlight: ['m1'],
    note: 'git merge feature: one new commit with two parents. Nothing else changes.',
  },
  rebase: {
    commits: [
      { hash: "f2'", parents: ["f1'"], label: 'Add dark theme toggle' },
      { hash: "f1'", parents: ['c3'], label: 'Extract theme tokens' },
      ...base.filter((c) => !c.hash.startsWith('f')),
    ],
    refs: [{ name: 'feature', hash: "f2'", kind: 'branch' }, { name: 'HEAD', hash: "f2'", kind: 'head' }, { name: 'main', hash: 'c3', kind: 'branch' }],
    highlight: ["f1'", "f2'"],
    note: 'git rebase main: f1 and f2 are replayed on top of c3 as new commits, so history is one straight line.',
  },
};

// ── lanes: the first-parent walk ────────────────────────────────────────────
// `lanes[i]` is the commit the line in column i is travelling down to meet (null = free).
// For each commit, newest first:
//   1. every lane waiting for it ends here; the leftmost becomes its column (a branch tip, which
//      nobody waits for, takes the first free column);
//   2. its FIRST parent inherits its column, so a branch's own history runs straight down;
//   3. each further parent (a merge) joins a lane already waiting for it, or opens a new one.
function gitLanes(commits) {
  const rowOf = new Map(commits.map((c, i) => [c.hash, i]));
  const lanes = [];
  const free = (exclude = -1) => {
    for (let i = 0; i < lanes.length; i++) if (lanes[i] === null && i !== exclude) return i;
    return lanes.length;
  };
  return commits.map((c, row) => {
    const incoming = [];
    lanes.forEach((h, i) => h === c.hash && incoming.push(i));
    const lane = incoming.length ? incoming[0] : free();
    for (const i of incoming) lanes[i] = null;
    const edges = c.parents.map((p, k) => {
      let target = lane;
      if (k > 0) { target = lanes.indexOf(p); if (target < 0) target = free(lane); }
      lanes[target] = p;
      return { parent: p, lane: target, row: rowOf.get(p) ?? -1 }; // row -1: parent not in the list
    });
    while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop(); // free columns at the right edge are dropped
    return { hash: c.hash, row, lane, edges };
  });
}

// ── turn a picture into drawable data ───────────────────────────────────────
const ROW = 34, LANE = 22, R = 6;
const TONES = ['accent', 'success', 'visited', 'orange', 'danger', 'active'];
const toneOf = (lane) => TONES[lane % TONES.length];
const textWidth = (s, size) => s.length * size * 0.6; // headless DOM can't measure text; estimate
const curve = d3.line().curve(d3.curveBumpY);

function layout(pic) {
  const placed = gitLanes(pic.commits);
  const byHash = new Map(placed.map((p) => [p.hash, p]));
  const X = (lane) => LANE / 2 + lane * LANE, Y = (row) => ROW / 2 + row * ROW;
  const lanes = d3.max(placed, (p) => d3.max([p.lane + 1, ...p.edges.map((e) => e.lane + 1)]));
  const labelX = lanes * LANE + 10;
  const hi = pic.highlight ? new Set(pic.highlight) : null;
  // with a highlight set, everything not part of it is dimmed
  const dim = (...hashes) => (hi && !hashes.every((h) => hi.has(h)) ? 0.3 : 1);

  const edges = [], dots = [], pills = [], labels = [];
  for (const p of placed) {
    const c = pic.commits[p.row];
    const at = [X(p.lane), Y(p.row)];
    for (const e of p.edges) {
      const stub = e.row < 0; // a parent outside the list: a short dashed stub down its lane
      const endRow = stub ? p.row + 0.6 : e.row;
      const end = [X(stub ? e.lane : byHash.get(e.parent).lane), Y(endRow)];
      // always four points, so edges can morph into each other (see the header)
      const pts = endRow - p.row <= 1 ? [at, at, at, end] : [at, [X(e.lane), Y(p.row + 1)], [X(e.lane), Y(endRow - 1)], end];
      edges.push({ id: `${p.hash}-${e.parent}`, d: curve(pts), tone: toneOf(e.lane), dashed: stub, dim: dim(p.hash, e.parent) });
    }
    const tone = c.tone ?? toneOf(p.lane);
    dots.push({ id: p.hash, x: at[0], y: at[1], tone, merge: c.parents.length > 1, halo: !!hi?.has(p.hash), dim: dim(p.hash) });

    // labels sit in one row right of every lane: ref pills first, then the commit's text
    let x = labelX;
    for (const ref of pic.refs.filter((f) => f.hash === p.hash)) {
      const w = textWidth(ref.name, 11) + 14;
      pills.push({ id: ref.name, x: x + w / 2, y: at[1], w, kind: ref.kind, tone: ref.kind === 'tag' ? 'muted' : toneOf(p.lane), dim: dim(p.hash) });
      x += w + 6;
    }
    if (c.label) labels.push({ id: p.hash, x, y: at[1], text: c.label, dim: dim(p.hash) });
  }
  return { edges, dots, pills, labels, rows: pic.commits.length, right: d3.max([...pills.map((q) => q.x + q.w / 2), ...labels.map((l) => l.x + textWidth(l.text, 12.5))]) };
}

const laid = Object.fromEntries(Object.entries(pictures).map(([k, pic]) => [k, layout(pic)]));
const W = d3.max(Object.values(laid), (l) => l.right) + 8, H = d3.max(Object.values(laid), (l) => l.rows) * ROW;

const fig = kit.figure(W, H, { pad: 4 });
const { svg } = fig;
const edgeLayer = svg.append('g'), dotLayer = svg.append('g'), labelLayer = svg.append('g');
const settle = (sel) => kit.tr(sel).style('opacity', (d) => d.dim); // fade to this datum's opacity
const moveTo = (d) => `translate(${d.x},${d.y})`;

function draw(view) {
  const { edges, dots, pills, labels } = laid[view];

  edgeLayer.selectAll('path').data(edges, (d) => d.id).join(
    (enter) => enter.append('path').attr('d', (d) => d.d).style('opacity', 0),
    (update) => update,
    (exit) => kit.tr(exit, 300).style('opacity', 0).remove(),
  ).attr('class', (d) => kit.cls('line', d.dashed && 'dashed', kit.tone(d.tone))).style('stroke-width', '2.5px')
    .call(settle).call((s) => kit.tr(s).attr('d', (d) => d.d));

  // commits: one <g> per hash that slides to its new place. A highlighted one gets a halo ring.
  dotLayer.selectAll('g.commit').data(dots, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'commit').style('opacity', 0).attr('transform', moveTo);
    g.append('circle').attr('class', 'halo-dot').attr('r', R + 5).style('stroke-width', '1.5px');
    g.append('circle').attr('class', 'dot').attr('r', R);
    return g;
  }, (update) => update, (exit) => kit.tr(exit, 300).style('opacity', 0).remove())
    .call((g) => {
      g.attr('class', (d) => kit.cls('commit', kit.tone(d.tone)));
      g.select('.halo-dot').style('fill', 'color-mix(in srgb, var(--c) 18%, transparent)').style('stroke', 'var(--c)')
        .style('display', (d) => (d.halo ? null : 'none'));
      // a merge commit is a ring, a normal commit a solid dot
      g.select('.dot').style('fill', (d) => (d.merge ? 'var(--surface)' : 'var(--c)')).style('stroke', (d) => (d.merge ? 'var(--c)' : 'var(--surface)'))
        .style('stroke-width', (d) => (d.merge ? '2.5px' : '2px'));
    })
    .call(settle).call((g) => kit.tr(g).attr('transform', moveTo));

  // branch / tag / HEAD pills, keyed by ref name: moving a branch slides its pill
  labelLayer.selectAll('g.pill').data(pills, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'pill').style('opacity', 0).attr('transform', moveTo);
    g.append('rect').attr('height', 18).attr('y', -9).attr('rx', (d) => (d.kind === 'tag' ? 3 : 9)).style('stroke-width', '1.5px');
    g.append('text').attr('class', 'mono').attr('text-anchor', 'middle').attr('dy', '.35em').style('font-size', '11px').text((d) => d.id);
    return g;
  }, (update) => update, (exit) => kit.tr(exit, 300).style('opacity', 0).remove())
    .call((g) => {
      g.attr('class', (d) => kit.cls('pill', kit.tone(d.tone)));
      g.select('rect').attr('width', (d) => d.w).attr('x', (d) => -d.w / 2)
        .style('fill', (d) => (d.kind === 'head' ? 'var(--c)' : 'color-mix(in srgb, var(--cf, var(--muted-fill)) 50%, var(--surface))'))
        .style('stroke', 'var(--c, var(--faint))').style('stroke-dasharray', (d) => (d.kind === 'remote' ? '3 2' : null));
      g.select('text').style('fill', (d) => (d.kind === 'head' ? 'var(--surface)' : null));
    })
    .call(settle).call((g) => kit.tr(g).attr('transform', moveTo));

  labelLayer.selectAll('text.msg').data(labels, (d) => d.id).join(
    (enter) => enter.append('text').attr('class', 'msg').attr('x', (d) => d.x).attr('y', (d) => d.y).attr('dy', '.35em').style('font-size', '12.5px').style('opacity', 0).text((d) => d.text),
    (update) => update,
    (exit) => kit.tr(exit, 300).style('opacity', 0).remove(),
  ).call(settle).call((t) => kit.tr(t).attr('x', (d) => d.x).attr('y', (d) => d.y));

  status.set(pictures[view].note);
}

const status = kit.status();
fig.add(status);
fig.add(kit.segmented({ value: 'before', options: [{ value: 'before', label: 'Before' }, { value: 'merge', label: 'Merge' }, { value: 'rebase', label: 'Rebase' }], onInput: draw }));
draw('before');
return fig.el;
