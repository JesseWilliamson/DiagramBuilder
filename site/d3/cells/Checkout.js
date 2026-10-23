// A checkout with two outcomes, as a sequence diagram. An alt fragment draws one
// box with a dashed divider and a guard per branch; the failure path is toned red
// message by message; the note takes a row of its own. Turn off the activation
// bars for a lighter, overview-style diagram.
//
// d3 has no sequence-diagram layout, so the geometry is plain JavaScript: a
// `layout()` function turns the message list into rows (y), bars, fragment boxes
// and note cards: plain objects with a stable `key`. Then the d3 part is small:
// one keyed join per layer. Flip "Activation bars" and the bars grow in or fade
// out, and the arrows slide to the lifeline, because the join matches by key.
//
// The d3 ideas: layers (one <g> per z-order level), keyed joins with enter / update
// / exit, nested joins (the guards inside a fragment), d3.line for every connector.

const people = [
  { id: 'user', label: 'Shopper', kind: 'actor' },
  { id: 'web', label: 'Web app' },
  { id: 'pay', label: 'Payments' },
  { id: 'bank', label: 'Card network' },
];
const messages = [
  { from: 'user', to: 'web', label: 'Pay £42' },
  { from: 'web', to: 'pay', label: 'charge(order, card)' },
  { from: 'pay', to: 'bank', label: 'authorise' },
  { from: 'bank', to: 'pay', label: 'approved', kind: 'return', tone: 'success' },
  { from: 'pay', to: 'web', label: 'receipt', kind: 'return', tone: 'success' },
  { from: 'bank', to: 'pay', label: 'declined', kind: 'return', tone: 'danger' },
  { from: 'pay', to: 'web', label: '402 card declined', kind: 'return', tone: 'danger' },
  { from: 'web', to: 'user', label: 'show result', kind: 'return' },
];
const fragments = [
  { kind: 'alt', from: 3, to: 6, over: ['web', 'bank'], sections: [{ label: 'approved', from: 3, to: 4 }, { label: 'else', from: 5, to: 6 }] },
];
const notes = [{ over: 'pay', text: 'idempotency key = order id:\na retry never charges twice', at: 2 }];

const GAP = 160, ROW = 44, HEAD = 34, BAR = 10, NOTE_LINE = 15;
const textW = (s, size) => s.length * size * 0.6; // no text measuring: 0.6 em per character
let showBars = true;

// ── layout: messages in, plain geometry out ──────────────────────────────────

// Activation bars come from the call/return structure: a call pushes a bar onto
// the callee's stack, a return pops it. It is the same stack a running program keeps.
// The branches of an alt are alternatives, not a sequence, so each later branch
// starts from the stacks as they were when the first branch began.
function activations() {
  const out = [];
  let stacks = new Map();
  const stack = (p) => stacks.get(p) ?? (stacks.set(p, []), stacks.get(p));
  const copy = (m) => new Map([...m].map(([k, v]) => [k, [...v]]));
  const saved = new Map(); // fragment -> stacks when its first branch began
  messages.forEach((m, i) => {
    for (const f of fragments) {
      if (f.sections?.[0].from === i) saved.set(f, copy(stacks));
      if (f.sections?.slice(1).some((s) => s.from === i)) stacks = copy(saved.get(f));
    }
    const kind = m.kind ?? 'call';
    if (kind === 'call') {
      const a = { participant: m.to, depth: stack(m.to).length, start: i, end: i };
      out.push(a);
      if (m.from !== m.to) stack(m.to).push(a);
    } else if (kind === 'return') {
      const a = stack(m.from).pop();
      if (a) a.end = Math.max(a.end, i);
    }
  });
  for (const s of stacks.values()) for (const a of s) a.end = messages.length - 1;
  return out.map((a, k) => ({ ...a, key: `bar${k}` }));
}

function layout() {
  const X = (p) => people.findIndex((q) => q.id === p) * GAP;
  const hasActor = people.some((p) => p.kind === 'actor');
  const top = (hasActor ? 44 : HEAD / 2) + 18;
  // Rows are "slots": a note takes one, a message takes one. y of everything is the sum of the slots above it.
  const ns = notes.map((n, k) => ({ ...n, key: `note${k}`, lines: n.text.split('\n') }));
  const noteH = (n) => n.lines.length * NOTE_LINE + 12;
  const msgTop = [], noteTop = new Map();
  let y = top;
  for (let i = 0; i <= messages.length; i++) {
    const opens = fragments.some((f) => f.from === i); // a fragment's top edge sits 14px into the row above
    for (const n of ns) if (n.at === i) (noteTop.set(n.key, y), (y += noteH(n) + 14 + (opens ? 14 : 0)));
    if (i < messages.length) (msgTop.push(y), (y += ROW));
  }
  const rowY = (i) => msgTop[i] + ROW / 2;
  const bottom = y + 8;

  const acts = showBars ? activations() : [];
  const depthAt = (p, i) => Math.max(-1, ...acts.filter((a) => a.participant === p && a.start <= i && i <= a.end).map((a) => a.depth));
  const barX = (p, depth) => X(p) + depth * BAR * 0.6;
  const bars = acts.map((a) => ({ key: a.key, x: barX(a.participant, a.depth) - BAR / 2, y0: rowY(a.start) - 6, y1: a.start === a.end ? rowY(a.start) + ROW * 0.45 : rowY(a.end) + 6 }));

  // arrows start and end at the edge of the bars (if any), not at the dashed lifeline
  const edge = (p, i, side) => { const d = depthAt(p, i); return d < 0 ? X(p) : barX(p, d) + (side * BAR) / 2; };
  const msgs = messages.map((m, i) => {
    const y = rowY(i), dir = Math.sign(X(m.to) - X(m.from));
    const x0 = edge(m.from, i, dir), x1 = edge(m.to, i, -dir);
    return { key: `msg${i}`, kind: m.kind ?? 'call', tone: m.tone, label: m.label, pts: [[x0, y], [x1, y]], lx: (x0 + x1) / 2, ly: y - 10 };
  });

  const frags = fragments.map((f, k) => {
    const pad = GAP * 0.42;
    const x0 = Math.min(X(f.over[0]), X(f.over[1])) - pad, x1 = Math.max(X(f.over[0]), X(f.over[1])) + pad;
    const y0 = rowY(f.from) - ROW / 2 - 14, y1 = rowY(f.to) + ROW / 2;
    const tagW = textW(f.kind, 11) + 16;
    const guards = [{ key: 'g0', x: x0 + tagW + 8, y: y0 + 9, text: `[${f.sections[0].label}]` }];
    const dividers = f.sections.slice(1).map((s, j) => {
      const dy = rowY(s.from) - ROW / 2 - 4;
      guards.push({ key: `g${j + 1}`, x: x0 + 8, y: dy + 10, text: `[${s.label}]` });
      return { key: `d${j}`, y: dy };
    });
    return { key: `frag${k}`, kind: f.kind, x0, x1, y0, y1, tagW, guards, dividers };
  });

  const noteBoxes = ns.map((n) => {
    const [a, b] = [X(n.over), X(n.over)];
    const w = Math.max(Math.max(...n.lines.map((l) => textW(l, 12))) + 20, 70);
    const L = (a + b) / 2 - w / 2, R = L + w, t = noteTop.get(n.key) + 7, B = t + noteH(n), d = 9;
    return { key: n.key, lines: n.lines, L, t, path: [[L, t], [R - d, t], [R, t + d], [R, B], [L, B]] };
  });

  // for the camera: the horizontal extent of everything
  const xs = [...people.flatMap((p) => [X(p.id) - Math.max(84, textW(p.label, 13) + 22) / 2, X(p.id) + Math.max(84, textW(p.label, 13) + 22) / 2]),
    ...frags.flatMap((f) => [f.x0, f.x1]), ...noteBoxes.flatMap((n) => [n.L, n.L + 70])];
  return { X, bottom, bars, msgs, frags, notes: noteBoxes, lifeTop: (p) => (p.kind === 'actor' ? 44 : HEAD / 2), extent: d3.extent(xs) };
}

// ── drawing ──────────────────────────────────────────────────────────────────
const first = layout();
const [minX, maxX] = first.extent;
const fig = kit.figure(maxX - minX + 48, first.bottom + 17 + 48);
const { svg } = fig;
const mk = kit.markers(svg, 'checkout');
const root = svg.append('g').attr('transform', `translate(${24 - minX},${24 + 17})`);
// one group per z-level: lifelines < fragment boxes < bars < messages < notes < fragment tags < heads
const layer = Object.fromEntries(['life', 'frame', 'bars', 'msgs', 'notes', 'tags', 'heads'].map((n) => [n, root.append('g')]));
const line = d3.line();

// lifelines and participant heads never change: a join, once
layer.life.selectAll('path').data(people).join('path').attr('class', 'line muted dashed').attr('d', (p) => line([[first.X(p.id), first.lifeTop(p)], [first.X(p.id), first.bottom]]));
const heads = layer.heads.selectAll('g').data(people).join('g').attr('transform', (p) => `translate(${first.X(p.id)},0)`);
heads.filter((p) => p.kind !== 'actor').each(function (p) {
  const g = d3.select(this), w = Math.max(84, textW(p.label, 13) + 22);
  g.append('rect').attr('class', 'solid').attr('x', -w / 2).attr('y', -HEAD / 2).attr('width', w).attr('height', HEAD).attr('rx', 6);
  g.append('text').attr('class', 'value').attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '13px').text(p.label);
});
heads.filter((p) => p.kind === 'actor').each(function (p) {
  // a stick figure: head, body, arms, legs
  const g = d3.select(this);
  g.append('circle').attr('r', 7).attr('cy', -10).style('fill', 'var(--surface)').style('stroke', 'var(--fg)').style('stroke-width', '1.5px');
  g.append('path').attr('class', 'line').style('stroke', 'var(--fg)').attr('d', 'M0,-3V12M-10,3H10M-8,24L0,12L8,24');
  g.append('text').attr('class', 'value').attr('y', 36).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '12px').text(p.label);
});

const fade = (exit) => kit.tr(exit, 250).style('opacity', 0).remove();

function draw() {
  const L = layout();

  // activation bars: keyed. A new bar grows down from its top edge; a removed one fades.
  layer.bars.selectAll('rect').data(L.bars, (b) => b.key).join(
    (enter) => enter.append('rect').attr('rx', 2).attr('width', BAR).attr('x', (b) => b.x).attr('y', (b) => b.y0).attr('height', 0)
      .style('fill', 'var(--muted-fill)').style('stroke', 'var(--outline)').style('stroke-width', '2px'),
    (update) => update,
    fade,
  ).call((s) => kit.tr(s, 350).attr('x', (b) => b.x).attr('y', (b) => b.y0).attr('height', (b) => b.y1 - b.y0));

  // messages: one <g> each (arrow + label). The arrow end follows the bar edge, so `d` is transitioned.
  layer.msgs.selectAll('g.msg').data(L.msgs, (m) => m.key).join((enter) => {
    const g = enter.append('g').attr('class', 'msg');
    g.append('path').attr('marker-end', (m) => mk(m.kind === 'call' ? 'arrow' : 'open')).attr('d', (m) => line(m.pts));
    g.append('text').attr('text-anchor', 'middle').style('font-size', '12px').style('font-weight', 500).attr('x', (m) => m.lx).attr('y', (m) => m.ly).attr('dy', '.35em').text((m) => m.label);
    return g;
  }).each(function (m) {
    const g = d3.select(this);
    g.select('path').attr('class', kit.cls('line', m.kind === 'return' && 'dashed', kit.tone(m.tone)));
    g.select('text').attr('class', kit.cls('mono halo', kit.tone(m.tone)));
    kit.tr(g.select('path'), 350).attr('d', line(m.pts));
    kit.tr(g.select('text'), 350).attr('x', m.lx).attr('y', m.ly);
  });

  // fragment frame (under the bars) and its dividers
  layer.frame.selectAll('g.frag').data(L.frags, (f) => f.key).join((enter) => {
    const g = enter.append('g').attr('class', 'frag');
    g.append('rect').attr('rx', 3).style('fill', 'none').style('stroke', 'var(--muted)').style('stroke-width', '1.5px');
    return g;
  }).each(function (f) {
    const g = d3.select(this);
    g.select('rect').attr('x', f.x0).attr('y', f.y0).attr('width', f.x1 - f.x0).attr('height', f.y1 - f.y0);
    g.selectAll('line').data(f.dividers, (d) => d.key).join('line').attr('class', 'dashed')
      .style('stroke', 'var(--muted)').style('stroke-width', '1.5px').attr('x1', f.x0).attr('x2', f.x1).attr('y1', (d) => d.y).attr('y2', (d) => d.y);
  });

  // notes: a pale card with a folded corner, text left-aligned inside
  layer.notes.selectAll('g.note').data(L.notes, (n) => n.key).join((enter) => {
    const g = enter.append('g').attr('class', 'note');
    g.append('path').attr('d', (n) => line(n.path) + 'Z').style('fill', 'var(--band)').style('stroke', 'var(--active-outline)').style('stroke-width', '1.5px');
    g.selectAll('text').data((n) => n.lines.map((text, j) => ({ text, x: n.L + 10, y: n.t + 6 + NOTE_LINE / 2 + j * NOTE_LINE }))).join('text')
      .attr('x', (d) => d.x).attr('y', (d) => d.y).attr('dy', '.35em').style('font-size', '12px').text((d) => d.text);
    return g;
  });

  // fragment tag (the operator) and the guards, on top of the bars and lifelines
  layer.tags.selectAll('g.frag').data(L.frags, (f) => f.key).join((enter) => {
    const g = enter.append('g').attr('class', 'frag');
    g.append('path').style('fill', 'var(--muted-fill)').style('stroke', 'var(--muted)').style('stroke-width', '1.5px');
    g.append('text').attr('class', 'mono').attr('dy', '.35em').style('font-size', '11px').style('font-weight', 700);
    return g;
  }).each(function (f) {
    const g = d3.select(this);
    g.select('path').attr('d', line([[f.x0, f.y0], [f.x0 + f.tagW, f.y0], [f.x0 + f.tagW, f.y0 + 11], [f.x0 + f.tagW - 6, f.y0 + 17], [f.x0, f.y0 + 17]]) + 'Z');
    g.select('text').attr('x', f.x0 + 6).attr('y', f.y0 + 9).text(f.kind);
    // nested join: one backing box + one label per guard. The backing box keeps a lifeline from cutting through the text.
    g.selectAll('g.guard').data(f.guards, (d) => d.key).join((enter) => {
      const q = enter.append('g').attr('class', 'guard');
      q.append('rect').attr('height', 14).attr('rx', 2).attr('y', (d) => d.y - 7).style('fill', 'var(--surface)');
      q.append('text').attr('class', 'mono muted').attr('dy', '.35em').style('font-size', '11px').attr('y', (d) => d.y);
      return q;
    }).each(function (d) {
      const q = d3.select(this);
      q.select('rect').attr('x', d.x - 3).attr('width', textW(d.text, 11) + 6);
      q.select('text').attr('x', d.x).text(d.text);
    });
  });
}
draw();

fig.add(kit.row(kit.toggle({ label: 'Activation bars', value: true, onInput: (v) => { showBars = v; draw(); } })));
return fig.el;
