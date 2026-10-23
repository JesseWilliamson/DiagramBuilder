// Logging in, as a sequence diagram. Step through it: the activation bars grow and
// shrink with the call stack, because they are derived from the calls and returns.
//
// d3 has no sequence-diagram layout, so the geometry is plain JavaScript: `layout(upTo)`
// turns the message list into rows, bars and arrows (plain objects, each with a
// stable `key`). The d3 part is then small: one keyed join per layer. Step forward
// and a new message enters while the open bars stretch; step back and they exit.
//
// The d3 ideas: layers (one <g> per z-order level), keyed joins with enter / update
// / exit, d3.line for every arrow, and kit.player to drive "draw frame i".

const people = [
  { id: 'user', label: 'User', kind: 'actor' },
  { id: 'web', label: 'Browser' },
  { id: 'api', label: 'API' },
  { id: 'auth', label: 'AuthService' },
  { id: 'db', label: 'Database' },
];
const messages = [
  { from: 'user', to: 'web', label: 'submit(email, pw)', note: 'The user submits the form.' },
  { from: 'web', to: 'api', label: 'POST /login', note: 'The browser calls the API and waits: a synchronous call (solid head).' },
  { from: 'api', to: 'auth', label: 'verify(email, pw)', note: 'The API delegates to the auth service. Three bars are open now: three calls are waiting.' },
  { from: 'auth', to: 'db', label: 'findUser(email)', note: 'Auth looks the user up.' },
  { from: 'db', to: 'auth', label: 'user row', kind: 'return', note: 'Replies are dashed. The database bar closes: its call is finished.' },
  { from: 'auth', to: 'auth', label: 'checkHash(pw)', note: 'A self-call: auth calls its own method, so a bar nests inside its bar.' },
  { from: 'auth', to: 'api', label: 'ok', kind: 'return', note: 'Auth answers the API.' },
  { from: 'api', to: 'db', label: 'audit("login")', kind: 'async', note: 'Fire and forget (open head): the API does not wait for the audit log.' },
  { from: 'api', to: 'web', label: '200 + token', kind: 'return', note: 'The API replies with a token.' },
  { from: 'web', to: 'user', label: 'show dashboard', kind: 'return', note: 'Every call has been answered, so every bar has closed.' },
];

const GAP = 140, ROW = 44, HEAD = 34, BAR = 10;
const textW = (s, size) => s.length * size * 0.6; // no text measuring: 0.6 em per character
const X = (p) => people.findIndex((q) => q.id === p) * GAP;
const headW = (p) => Math.max(84, textW(p.label, 13) + 22);

// ── layout: messages in, plain geometry out ──────────────────────────────────

// Activation bars come from the call/return structure: a call pushes a bar onto the
// callee's stack, a return pops it. It is the same stack a running program keeps.
// A self-call is a one-row bar nested inside the caller's current bar.
const acts = (() => {
  const out = [], stacks = new Map();
  const stack = (p) => stacks.get(p) ?? (stacks.set(p, []), stacks.get(p));
  messages.forEach((m, i) => {
    const kind = m.kind ?? 'call';
    if (kind === 'call') {
      const a = { participant: m.to, depth: stack(m.to).length, start: i, end: i, key: `bar${out.length}` };
      out.push(a);
      if (m.from !== m.to) stack(m.to).push(a);
    } else if (kind === 'return') {
      const a = stack(m.from).pop();
      if (a) a.end = Math.max(a.end, i);
    }
  });
  for (const s of stacks.values()) for (const a of s) a.end = messages.length - 1; // still open: runs to the end
  return out;
})();
const depthAt = (p, i) => Math.max(-1, ...acts.filter((a) => a.participant === p && a.start <= i && i <= a.end).map((a) => a.depth));
const barX = (p, depth) => X(p) + depth * BAR * 0.6;

const TOP = 44 + 18; // there is an actor, so leave room for the stick figure
const rowY = (i) => TOP + i * ROW + ROW / 2;
const bottom = TOP + messages.length * ROW + 8;

// Everything drawn after message `upTo` has appeared. Bars that are still open stop at the current row.
function layout(upTo) {
  const bars = acts.filter((a) => a.start <= upTo).map((a) => ({
    key: a.key, x: barX(a.participant, a.depth) - BAR / 2, y0: rowY(a.start) - 6,
    y1: a.start === a.end ? rowY(a.start) + ROW * 0.45 : rowY(Math.min(a.end, upTo)) + 6,
  }));
  // arrows start and end at the edge of the bars (if any), not at the dashed lifeline
  const edge = (p, i, side) => { const d = depthAt(p, i); return d < 0 ? X(p) : barX(p, d) + (side * BAR) / 2; };
  const msgs = messages.slice(0, upTo + 1).map((m, i) => {
    const y = rowY(i), label = `${i + 1}. ${m.label}`;
    const tone = i === upTo ? 'active' : m.tone; // the current step is highlighted
    const base = { key: `msg${i}`, kind: m.kind ?? 'call', tone, label };
    if (m.from === m.to) {
      // self-call: out to the right, down a little, back into the nested bar
      const d = depthAt(m.from, i), x0 = barX(m.from, Math.max(0, d - 1)) + BAR / 2, x1 = barX(m.from, d) + BAR / 2;
      return { ...base, pts: [[x0, y - 8], [x0 + 34, y - 8], [x0 + 34, y + 8], [x1, y + 8]], lx: x0 + 42, ly: y - 8, anchor: 'start' };
    }
    const dir = Math.sign(X(m.to) - X(m.from)), x0 = edge(m.from, i, dir), x1 = edge(m.to, i, -dir);
    return { ...base, pts: [[x0, y], [x1, y]], lx: (x0 + x1) / 2, ly: y - 10, anchor: 'middle' };
  });
  return { bars, msgs };
}

// ── the camera: fixed, fitted once to the last frame (the diagram only grows downward) ──
const xs = [...people.flatMap((p) => [X(p.id) - headW(p) / 2, X(p.id) + headW(p) / 2]),
  ...layout(messages.length - 1).msgs.flatMap((m) => (m.anchor === 'start' ? [m.lx + textW(m.label, 12)] : [m.lx - textW(m.label, 12) / 2, m.lx + textW(m.label, 12) / 2]))];
const [minX, maxX] = d3.extent(xs);
const fig = kit.figure(maxX - minX + 48, bottom + 17 + 48);
const { svg } = fig;
const mk = kit.markers(svg, 'sequence');
const root = svg.append('g').attr('transform', `translate(${24 - minX},${24 + 17})`);
// one group per z-level: lifelines < bars < messages < heads
const layer = Object.fromEntries(['life', 'bars', 'msgs', 'heads'].map((n) => [n, root.append('g')]));
const line = d3.line();

// lifelines and participant heads never change: a join, once
layer.life.selectAll('path').data(people).join('path').attr('class', 'line muted dashed')
  .attr('d', (p) => line([[X(p.id), p.kind === 'actor' ? 44 : HEAD / 2], [X(p.id), bottom]]));
const heads = layer.heads.selectAll('g').data(people).join('g').attr('transform', (p) => `translate(${X(p.id)},0)`);
heads.filter((p) => p.kind !== 'actor').each(function (p) {
  const g = d3.select(this);
  g.append('rect').attr('class', 'solid').attr('x', -headW(p) / 2).attr('y', -HEAD / 2).attr('width', headW(p)).attr('height', HEAD).attr('rx', 6);
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

function draw(upTo) {
  const { bars, msgs } = layout(upTo);

  // activation bars: keyed. A new bar grows down from its top edge; an open one keeps stretching;
  // when stepping back, a bar that has not started yet fades out.
  layer.bars.selectAll('rect').data(bars, (b) => b.key).join(
    (enter) => enter.append('rect').attr('rx', 2).attr('width', BAR).attr('x', (b) => b.x).attr('y', (b) => b.y0).attr('height', 0)
      .style('fill', 'var(--muted-fill)').style('stroke', 'var(--outline)').style('stroke-width', '2px'),
    (update) => update,
    fade,
  ).call((s) => kit.tr(s, 350).attr('x', (b) => b.x).attr('y', (b) => b.y0).attr('height', (b) => b.y1 - b.y0));

  // messages: one <g> each (arrow + label). They fade in; the tone (current step = yellow) is just a class.
  layer.msgs.selectAll('g.msg').data(msgs, (m) => m.key).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'msg').style('opacity', 0);
      g.append('path').attr('d', (m) => line(m.pts));
      g.append('text').attr('text-anchor', (m) => m.anchor).style('font-size', '12px').style('font-weight', 500).attr('x', (m) => m.lx).attr('y', (m) => m.ly).attr('dy', '.35em').text((m) => m.label);
      return g;
    },
    (update) => update,
    fade,
  ).each(function (m) {
    const g = d3.select(this);
    g.select('path').attr('class', kit.cls('line', m.kind === 'return' && 'dashed', kit.tone(m.tone))).attr('marker-end', mk(m.kind === 'call' ? 'arrow' : 'open'));
    g.select('text').attr('class', kit.cls('mono halo', kit.tone(m.tone)));
    kit.tr(g, 350).style('opacity', 1);
    kit.tr(g.select('path'), 350).attr('d', line(m.pts)); // arrow ends move when a bar nests in or closes
  });

  note.set(messages[upTo].note);
}

const note = kit.status();
const player = kit.player(messages.map((_, i) => i), { interval: 1300, onFrame: draw, invalidation });
fig.add(note);
fig.add(kit.transport(player));
return fig.el;
