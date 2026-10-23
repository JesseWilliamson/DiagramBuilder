// A loop fragment: the box around the polls grows as each one comes back, and
// stops growing at the message that ends the loop. Step through it.
//
// d3 has no sequence-diagram layout, so the geometry is plain JavaScript:
// `layout(upTo)` turns the message list into bars, arrows and the loop box (plain
// objects, each with a stable `key`), and d3 draws them with one keyed join per layer.
//
// The d3 idea to look at is the loop box. It is ONE datum whose `y1` depends on the
// step. Because the join is keyed, step 3 and step 4 refer to the same element, so
// a transition on `height` grows the box instead of redrawing it. Same for the
// activation bars, which stretch while their call is open.

const people = [
  { id: 'app', label: 'App' },
  { id: 'cloud', label: 'Cloud API' },
  { id: 'vm', label: 'VM' },
];
const messages = [
  { from: 'app', to: 'cloud', label: 'start()', note: 'Ask for a machine. The answer comes back before the machine is ready.' },
  { from: 'cloud', to: 'app', label: 'id', kind: 'return', note: 'An id, and nothing running yet.' },
  { from: 'app', to: 'cloud', label: 'status(id)', note: 'So ask whether it is up…' },
  { from: 'cloud', to: 'app', label: 'PENDING', kind: 'return', note: '…not yet…' },
  { from: 'app', to: 'cloud', label: 'status(id)', note: 'Ask again a moment later.' },
  { from: 'cloud', to: 'app', label: 'RUNNING', kind: 'return', note: 'Running. The loop ends here.' },
  { from: 'app', to: 'vm', label: 'POST /job', note: 'Now the machine can take the work.' },
  { from: 'vm', to: 'app', label: 'result', kind: 'return', note: 'And the result comes back.' },
];
const fragments = [{ kind: 'loop', label: 'until RUNNING', from: 2, to: 5, over: ['app', 'cloud'] }];

const GAP = 170, ROW = 44, HEAD = 34, BAR = 10;
const textW = (s, size) => s.length * size * 0.6; // no text measuring: 0.6 em per character
const X = (p) => people.findIndex((q) => q.id === p) * GAP;
const headW = (p) => Math.max(84, textW(p.label, 13) + 22);

// ── layout: messages in, plain geometry out ──────────────────────────────────

// Activation bars come from the call/return structure: a call pushes a bar onto the
// callee's stack, a return pops it. It is the same stack a running program keeps.
const acts = (() => {
  const out = [], stacks = new Map();
  const stack = (p) => stacks.get(p) ?? (stacks.set(p, []), stacks.get(p));
  messages.forEach((m, i) => {
    const kind = m.kind ?? 'call';
    if (kind === 'call') {
      const a = { participant: m.to, depth: stack(m.to).length, start: i, end: i, key: `bar${out.length}` };
      out.push(a);
      stack(m.to).push(a);
    } else if (kind === 'return') {
      const a = stack(m.from).pop();
      if (a) a.end = Math.max(a.end, i);
    }
  });
  for (const s of stacks.values()) for (const a of s) a.end = messages.length - 1;
  return out;
})();
const depthAt = (p, i) => Math.max(-1, ...acts.filter((a) => a.participant === p && a.start <= i && i <= a.end).map((a) => a.depth));
const barX = (p, depth) => X(p) + depth * BAR * 0.6;

const TOP = HEAD / 2 + 18;
const rowY = (i) => TOP + i * ROW + ROW / 2;
const bottom = TOP + messages.length * ROW + 8;

function layout(upTo) {
  const bars = acts.filter((a) => a.start <= upTo).map((a) => ({
    key: a.key, x: barX(a.participant, a.depth) - BAR / 2, y0: rowY(a.start) - 6,
    y1: a.start === a.end ? rowY(a.start) + ROW * 0.45 : rowY(Math.min(a.end, upTo)) + 6,
  }));
  const edge = (p, i, side) => { const d = depthAt(p, i); return d < 0 ? X(p) : barX(p, d) + (side * BAR) / 2; };
  const msgs = messages.slice(0, upTo + 1).map((m, i) => {
    const y = rowY(i), dir = Math.sign(X(m.to) - X(m.from)), x0 = edge(m.from, i, dir), x1 = edge(m.to, i, -dir);
    return { key: `msg${i}`, kind: m.kind ?? 'call', tone: i === upTo ? 'active' : m.tone, label: m.label, pts: [[x0, y], [x1, y]], lx: (x0 + x1) / 2, ly: y - 10 };
  });
  // The loop box: it exists once its first message has appeared, and its bottom edge
  // follows the current step until the loop's last message (f.to) is reached.
  const frags = fragments.filter((f) => f.from <= upTo).map((f, k) => {
    const pad = GAP * 0.42, tagW = textW(f.kind, 11) + 16;
    const x0 = Math.min(X(f.over[0]), X(f.over[1])) - pad, x1 = Math.max(X(f.over[0]), X(f.over[1])) + pad;
    // the tag strip sits above the first message's label, which is drawn 10px over its arrow
    const y0 = rowY(f.from) - ROW / 2 - 14, y1 = rowY(Math.min(f.to, upTo)) + ROW / 2;
    return { key: `frag${k}`, kind: f.kind, label: `[${f.label}]`, x0, x1, y0, y1, tagW };
  });
  return { bars, msgs, frags };
}

// ── the camera: fixed, fitted once to the last frame ──
const xs = [...people.flatMap((p) => [X(p.id) - headW(p) / 2, X(p.id) + headW(p) / 2]), ...layout(messages.length - 1).frags.flatMap((f) => [f.x0, f.x1])];
const [minX, maxX] = d3.extent(xs);
const fig = kit.figure(maxX - minX + 48, bottom + 17 + 48);
const { svg } = fig;
const mk = kit.markers(svg, 'polling');
const root = svg.append('g').attr('transform', `translate(${24 - minX},${24 + 17})`);
// z-order: lifelines < loop box < bars < messages < loop tag < heads
const layer = Object.fromEntries(['life', 'frame', 'bars', 'msgs', 'tags', 'heads'].map((n) => [n, root.append('g')]));
const line = d3.line();

layer.life.selectAll('path').data(people).join('path').attr('class', 'line muted dashed').attr('d', (p) => line([[X(p.id), HEAD / 2], [X(p.id), bottom]]));
const heads = layer.heads.selectAll('g').data(people).join('g').attr('transform', (p) => `translate(${X(p.id)},0)`);
heads.append('rect').attr('class', 'solid').attr('x', (p) => -headW(p) / 2).attr('y', -HEAD / 2).attr('width', headW).attr('height', HEAD).attr('rx', 6);
heads.append('text').attr('class', 'value').attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '13px').text((p) => p.label);

const fade = (exit) => kit.tr(exit, 250).style('opacity', 0).remove();

function draw(upTo) {
  const { bars, msgs, frags } = layout(upTo);

  // the loop box: enters with no height, then every step transitions its bottom edge down
  layer.frame.selectAll('rect').data(frags, (f) => f.key).join(
    (enter) => enter.append('rect').attr('rx', 3).attr('x', (f) => f.x0).attr('width', (f) => f.x1 - f.x0).attr('y', (f) => f.y0).attr('height', 0)
      .style('fill', 'none').style('stroke', 'var(--muted)').style('stroke-width', '1.5px'),
    (update) => update,
    fade,
  ).call((s) => kit.tr(s, 350).attr('y', (f) => f.y0).attr('height', (f) => f.y1 - f.y0));

  layer.bars.selectAll('rect').data(bars, (b) => b.key).join(
    (enter) => enter.append('rect').attr('rx', 2).attr('width', BAR).attr('x', (b) => b.x).attr('y', (b) => b.y0).attr('height', 0)
      .style('fill', 'var(--muted-fill)').style('stroke', 'var(--outline)').style('stroke-width', '2px'),
    (update) => update,
    fade,
  ).call((s) => kit.tr(s, 350).attr('x', (b) => b.x).attr('y', (b) => b.y0).attr('height', (b) => b.y1 - b.y0));

  layer.msgs.selectAll('g.msg').data(msgs, (m) => m.key).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'msg').style('opacity', 0);
      g.append('path').attr('d', (m) => line(m.pts));
      g.append('text').attr('text-anchor', 'middle').style('font-size', '12px').style('font-weight', 500).attr('x', (m) => m.lx).attr('y', (m) => m.ly).attr('dy', '.35em').text((m) => m.label);
      return g;
    },
    (update) => update,
    fade,
  ).each(function (m) {
    const g = d3.select(this);
    g.select('path').attr('class', kit.cls('line', m.kind === 'return' && 'dashed', kit.tone(m.tone))).attr('marker-end', mk(m.kind === 'call' ? 'arrow' : 'open'));
    g.select('text').attr('class', kit.cls('mono halo', kit.tone(m.tone)));
    kit.tr(g, 350).style('opacity', 1);
    kit.tr(g.select('path'), 350).attr('d', line(m.pts));
  });

  // the operator tag ("loop") and the guard, drawn above the bars. They do not move once placed.
  layer.tags.selectAll('g.frag').data(frags, (f) => f.key).join((enter) => {
    const g = enter.append('g').attr('class', 'frag').style('opacity', 0);
    g.append('path').style('fill', 'var(--muted-fill)').style('stroke', 'var(--muted)').style('stroke-width', '1.5px')
      .attr('d', (f) => line([[f.x0, f.y0], [f.x0 + f.tagW, f.y0], [f.x0 + f.tagW, f.y0 + 11], [f.x0 + f.tagW - 6, f.y0 + 17], [f.x0, f.y0 + 17]]) + 'Z');
    g.append('text').attr('class', 'mono').attr('dy', '.35em').style('font-size', '11px').style('font-weight', 700).attr('x', (f) => f.x0 + 6).attr('y', (f) => f.y0 + 9).text((f) => f.kind);
    // a backing box behind the guard keeps a lifeline from cutting through the text
    g.append('rect').attr('height', 14).attr('rx', 2).style('fill', 'var(--surface)')
      .attr('x', (f) => f.x0 + f.tagW + 5).attr('y', (f) => f.y0 + 2).attr('width', (f) => textW(f.label, 11) + 6);
    g.append('text').attr('class', 'mono muted').attr('dy', '.35em').style('font-size', '11px').attr('x', (f) => f.x0 + f.tagW + 8).attr('y', (f) => f.y0 + 9).text((f) => f.label);
    return g;
  }, (update) => update, fade).call((s) => kit.tr(s, 350).style('opacity', 1));

  note.set(messages[upTo].note);
}

const note = kit.status();
const player = kit.player(messages.map((_, i) => i), { interval: 1100, onFrame: draw, invalidation });
fig.add(note);
fig.add(kit.transport(player));
return fig.el;
