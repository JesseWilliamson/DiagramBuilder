// Reversing a linked list. Each node is [value | dot], each dot has an arrow to
// the next node. Step through and watch `curr.next = prev` swing one arrow round
// instead of deleting it and drawing another. prev / curr / nxt are pointers
// that slide along the row, and a code panel follows the current line.
//
// The d3 ideas:
//  - The arrow's key is the node it LEAVES. When `next` changes, the data join
//    finds the same element and a transition on its `d` attribute morphs the
//    curve from the old target to the new one. Both forward and backward arrows
//    are written as quadratic curves "M a Q control b" (a forward arrow has its
//    control point on the line), so the two shapes have the same number of
//    numbers and d3's string interpolation can blend them.
//  - Boxes are laid out by a fixed `order`, not by following `next`, otherwise
//    they would shuffle mid-reversal. The data describes the pointers; the
//    layout describes the places.
//  - A pointer to null aims at an empty slot just past either end of the row.

const values = [4, 8, 15, 16];
const code = [
  'prev, curr = None, head',
  'while curr:',
  '    nxt = curr.next',
  '    curr.next = prev',
  '    prev, curr = curr, nxt',
  'return prev',
];

// nodes n0..n3, each knowing its `next`; the generator yields snapshots
function* reverse() {
  const nodes = values.map((value, i) => ({ key: `n${i}`, value, next: i + 1 < values.length ? `n${i + 1}` : null }));
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const snap = (prev, curr, nxt, line) => ({ nodes: nodes.map((n) => ({ ...n })), prev, curr, nxt, line });
  let prev = null, curr = nodes[0].key;
  yield snap(prev, curr, undefined, 0);
  while (curr !== null) {
    yield snap(prev, curr, undefined, 1);
    const nxt = byKey.get(curr).next;
    yield snap(prev, curr, nxt, 2);
    byKey.get(curr).next = prev;
    yield snap(prev, curr, nxt, 3);
    prev = curr;
    curr = nxt;
    yield snap(prev, curr, undefined, 4);
  }
  yield snap(prev, null, undefined, 5);
}

// geometry: [ value box 44 x 38 | pointer compartment ] then a 34px gap
const VW = 44, BH = 38, GAP = 34;
const PW = BH * 0.62, STEP = VW + PW + GAP;
const slotX = (i) => i * STEP + VW / 2; // centre of slot i's value box (i = -1 and 4 are the null slots)
const ORIGIN = [100, 55];
const W = 545, H = 150;

const fig = kit.figure(W, H, { pad: 4 });
const { svg } = fig;
const mk = kit.markers(svg);
const root = svg.append('g').attr('transform', `translate(${ORIGIN})`);
const arrowLayer = root.append('g');
const nodeLayer = root.append('g');
const nullLayer = root.append('g');
const pointerLayer = root.append('g');

const slotOf = (key) => values.findIndex((_, i) => `n${i}` === key);

// the one place the arrow shape is decided: where it starts, where it ends, how far it bows
function arrowPath(n) {
  const from = slotOf(n.key), to = slotOf(n.next);
  const px = slotX(from) + VW / 2 + PW / 2; // the dot's x
  const a = to > from ? [px, BH / 2] : [px, BH];
  const b = to > from ? [slotX(to) - VW / 2 - 3, BH / 2] : [slotX(to), BH + 3];
  // backward arrows leave the bottom of the pointer box and loop under the row
  const bend = to > from ? 0 : -(26 + Math.abs(b[0] - px) * 0.18);
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const c = [(a[0] + b[0]) / 2 + (-dy / len) * bend, (a[1] + b[1]) / 2 + (dx / len) * bend];
  return `M${a}Q${c} ${b}`;
}

function draw(f) {

  // arrows: keyed by the node they leave; only nodes with a next have one
  const arrows = f.nodes.filter((n) => n.next !== null);
  arrowLayer.selectAll('path.next').data(arrows, (d) => d.key).join(
    (enter) => enter.append('path').attr('class', 'next line').attr('marker-end', mk('arrow')).style('stroke-width', '2px')
      .attr('d', (d) => arrowPath(d)).style('opacity', 0),
    (update) => update,
    (exit) => kit.tr(exit, 250).style('opacity', 0).remove(),
  ).attr('class', (d) => kit.cls('next line', d.key === f.curr && 'tone-active'))
    .call((p) => kit.tr(p, 450).style('opacity', 1).attr('d', (d) => arrowPath(d))); // fade-in and morph in ONE transition (a second one would cancel the first)

  // node boxes, drawn once: they never move. Only the dot / null mark changes.
  nodeLayer.selectAll('g.node').data(f.nodes, (d) => d.key).join((enter) => {
    const g = enter.append('g').attr('class', 'node').attr('transform', (d) => `translate(${slotX(slotOf(d.key)) - VW / 2},0)`);
    g.append('rect').attr('class', 'solid').attr('width', VW).attr('height', BH).attr('rx', 6);
    g.append('text').attr('class', 'value').attr('x', VW / 2).attr('y', BH / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '15px').text((d) => d.value);
    g.append('rect').attr('class', 'solid').attr('x', VW).attr('width', PW).attr('height', BH).attr('rx', 6);
    g.append('circle').attr('class', 'dot fill-ink').attr('cx', VW + PW / 2).attr('cy', BH / 2).attr('r', 3.5);
    g.append('text').attr('class', 'muted nul').attr('x', VW + PW / 2).attr('y', BH / 2 + 1).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '14px').text('∅');
    return g;
  }).call((g) => {
    kit.tr(g.select('circle.dot'), 250).style('opacity', (d) => (d.next === null ? 0 : 1));
    kit.tr(g.select('text.nul'), 250).style('opacity', (d) => (d.next === null ? 1 : 0));
  });

  // "None" in the empty slot left of the head / right of the tail
  const nulls = [
    f.prev === null && { id: 'left', slot: -1 },
    (f.curr === null || f.nxt === null) && { id: 'right', slot: values.length },
  ].filter(Boolean);
  nullLayer.selectAll('text').data(nulls, (d) => d.id).join(
    (enter) => enter.append('text').attr('class', 'muted').attr('x', (d) => slotX(d.slot)).attr('y', BH / 2).attr('dy', '.35em').attr('text-anchor', 'middle')
      .style('font-size', '12px').style('opacity', 0).text('None'),
    (update) => update,
    (exit) => kit.tr(exit, 200).style('opacity', 0).remove(),
  ).call((t) => kit.tr(t, 250).style('opacity', 1));

  // pointers: where does each one aim? top of a node, or an empty slot for null
  const aim = (key, side, nullSlot) => {
    if (key === null) return [slotX(nullSlot), side === 'top' ? BH / 2 - 22 : BH / 2 + 22];
    return [slotX(slotOf(key)) + PW / 2, side === 'top' ? 0 : BH];
  };
  const ps = [
    { id: 'prev', side: 'top', tone: 'visited', at: aim(f.prev, 'top', -1) },
    { id: 'curr', side: 'top', tone: 'active', at: aim(f.curr, 'top', values.length) },
    f.nxt !== undefined && { id: 'nxt', side: 'bottom', tone: 'accent', at: aim(f.nxt, 'bottom', values.length) },
  ].filter(Boolean);
  const dir = (d) => (d.side === 'top' ? -1 : 1);
  const place = (d) => `translate(${d.at[0]},${d.at[1] + dir(d) * 4})`; // 4px gap before the target
  pointerLayer.selectAll('g.ptr').data(ps, (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').attr('class', (d) => `ptr tone-${d.tone}`).attr('transform', place).style('opacity', 0);
      g.append('line').attr('class', 'line').attr('marker-end', mk('arrow')).attr('y1', (d) => dir(d) * 26).attr('y2', 0).style('stroke-width', 2);
      g.append('text').attr('class', (d) => `mono tone-${d.tone}`).attr('y', (d) => dir(d) * 39).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '13px').text((d) => d.id);
      return g;
    },
    (update) => update,
    (exit) => kit.tr(exit, 250).style('opacity', 0).remove(),
  ).call((g) => kit.tr(g, 450).style('opacity', 1).attr('transform', place));

  trace.set(f.line);
}

const trace = kit.codeTrace(code);
const player = kit.player([...reverse()], { interval: 800, onFrame: draw, invalidation });

fig.add(trace);
fig.add(kit.transport(player));
return fig.el;
