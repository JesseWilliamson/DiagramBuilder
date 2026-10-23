// An order's lifecycle as a state machine. Only the events that are legal in the
// current state are enabled: that list IS the state machine. Press one and the
// machine moves; the arrow it just took lights up.
//
// The d3 ideas: the whole machine is two arrays (states, transitions), and a join
// turns each into SVG, so the data IS the diagram. "Where are we" is just a class
// on a state, and a CSS transition fades the colour. d3.path draws the one curved
// transition (a quadratic Bézier) and d3.line the straight and looping ones.
//
// d3 has no connector, so `rectEdge` (where a line leaves a box) is hand-written below.

const states = [
  { id: 'start', kind: 'initial', x: 0, y: 60 },
  { id: 'Pending', x: 120, y: 60 },
  { id: 'Paid', x: 320, y: 60 },
  { id: 'Shipped', x: 520, y: 60 },
  { id: 'Delivered', x: 520, y: 210 },
  { id: 'Cancelled', x: 120, y: 210 },
  { id: 'end', kind: 'final', x: 320, y: 300 },
];
const transitions = [
  { from: 'start', to: 'Pending' },
  { from: 'Pending', to: 'Pending', label: 'addItem' },
  { from: 'Pending', to: 'Paid', label: 'pay [in stock]' },
  { from: 'Paid', to: 'Shipped', label: 'ship' },
  { from: 'Shipped', to: 'Delivered', label: 'deliver' },
  { from: 'Pending', to: 'Cancelled', label: 'cancel' },
  { from: 'Paid', to: 'Cancelled', label: 'cancel / refund', bend: -30 },
  { from: 'Delivered', to: 'end', label: 'after 30 days' },
  { from: 'Cancelled', to: 'end', label: 'after 30 days' },
];

// A label reads `event [guard] / action`: the event is everything before the guard or action.
const eventOf = (t) => t.label?.split(/\s*[[/]/)[0] ?? '';
const events = [...new Set(transitions.map(eventOf).filter(Boolean))];

// ── geometry (hand-written: d3 has no connectors) ────────────────────────────
const textW = (s, size) => s.length * size * 0.6; // no text measuring: 0.6 em per character
for (const s of states) {
  // the frame of each state: centre + size. Pills are as wide as their name; the dots are fixed.
  s.w = s.kind === 'initial' ? 16 : s.kind === 'final' ? 22 : Math.max(84, textW(s.id, 13) + 28);
  s.h = s.kind === 'initial' ? 16 : s.kind === 'final' ? 22 : 38;
}
const byId = new Map(states.map((s) => [s.id, s]));
// Where the ray from a box's centre toward `p` leaves the box: it hits the vertical sides at
// t = (w/2)/|dx| and the horizontal ones at t = (h/2)/|dy|; whichever comes first is the exit.
function rectEdge(f, p) {
  const dx = p[0] - f.x, dy = p[1] - f.y;
  const t = Math.min(dx ? f.w / 2 / Math.abs(dx) : Infinity, dy ? f.h / 2 / Math.abs(dy) : Infinity);
  return [f.x + dx * t, f.y + dy * t];
}
// the dots are round, so they use their radius instead
function exit(f, p) {
  if (!f.kind) return rectEdge(f, p);
  const dx = p[0] - f.x, dy = p[1] - f.y, len = Math.hypot(dx, dy) || 1;
  return [f.x + (dx / len) * (f.w / 2 + 1), f.y + (dy / len) * (f.w / 2 + 1)];
}
const shorten = (a, b, gap) => { // pull both ends of a line in by `gap`, so arrowheads don't touch the box
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  return [[a[0] + u[0] * gap, a[1] + u[1] * gap], [b[0] - u[0] * gap, b[1] - u[1] * gap]];
};

// Each transition becomes { d: path data, label position }. Three shapes:
// a loop over the top (self-transition), a bent line (a quadratic curve), a straight line.
function route(t) {
  const a = byId.get(t.from), b = byId.get(t.to);
  if (a === b) {
    const y0 = a.y - a.h / 2, l = a.x - 14, r = a.x + 14;
    return { d: d3.line()([[l, y0], [l - 6, y0 - 26], [r + 6, y0 - 26], [r, y0]]), lx: a.x, ly: y0 - 36 };
  }
  const bend = t.bend ?? 0;
  if (Math.abs(bend) > 0.5) {
    // aim both ends at the control point, then curve through it. d3.path writes the Bézier for us.
    const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    const len = Math.hypot(b.x - a.x, b.y - a.y), perp = [-(b.y - a.y) / len, (b.x - a.x) / len];
    const ctrl = [mid[0] + perp[0] * bend, mid[1] + perp[1] * bend];
    const p0 = exit(a, ctrl), p1 = exit(b, ctrl);
    const path = d3.path();
    path.moveTo(...p0);
    path.quadraticCurveTo(...ctrl, ...p1);
    // the label sits on the outside of the bulge, at the curve's middle (t = .5)
    const m = [0.25 * p0[0] + 0.5 * ctrl[0] + 0.25 * p1[0], 0.25 * p0[1] + 0.5 * ctrl[1] + 0.25 * p1[1]];
    const out = [(ctrl[0] - mid[0]) / Math.abs(bend), (ctrl[1] - mid[1]) / Math.abs(bend)];
    const side = Math.abs(out[0]) > 0.3 ? (out[0] > 0 ? 'start' : 'end') : 'middle';
    return { d: path.toString(), lx: side === 'middle' ? m[0] : m[0] + out[0] * 6, ly: side === 'middle' ? m[1] : m[1] + out[1] * 6, anchor: side };
  }
  const [p0, p1] = shorten(exit(a, [b.x, b.y]), exit(b, [a.x, a.y]), 2);
  return { d: d3.line()([p0, p1]), lx: (p0[0] + p1[0]) / 2, ly: (p0[1] + p1[1]) / 2 };
}
transitions.forEach((t) => Object.assign(t, route(t)));

// ── drawing ──────────────────────────────────────────────────────────────────
const fig = kit.figure(640, 340);
const { svg } = fig;
const mk = kit.markers(svg, 'fsm');
const root = svg.append('g').attr('transform', 'translate(30,10)'); // the original camera starts at (-30,-10)

// transitions underneath, states on top
const lines = root.append('g').selectAll('g.t').data(transitions).join('g').attr('class', 't');
lines.append('path').attr('d', (t) => t.d).attr('marker-end', mk('arrow'));
lines.append('text').attr('class', 'halo').attr('x', (t) => t.lx).attr('y', (t) => t.ly).attr('dy', '.35em').attr('text-anchor', (t) => t.anchor ?? 'middle')
  .style('font-size', '12px').style('font-weight', 600).style('stroke-width', '5px').text((t) => t.label ?? '');

const nodes = root.append('g').selectAll('g.s').data(states, (s) => s.id).join('g').attr('class', 's').attr('transform', (s) => `translate(${s.x},${s.y})`);
nodes.filter((s) => !s.kind).each(function (s) {
  const g = d3.select(this);
  g.append('rect').attr('class', 'solid').attr('x', -s.w / 2).attr('y', -s.h / 2).attr('width', s.w).attr('height', s.h).attr('rx', s.h / 2);
  g.append('text').attr('class', 'value').attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '13px').text(s.id);
});
nodes.filter((s) => s.kind === 'initial').append('circle').attr('class', 'dot').attr('r', 8);
nodes.filter((s) => s.kind === 'final').each(function () {
  const g = d3.select(this);
  g.append('circle').attr('class', 'ring').attr('r', 11).style('fill', 'none').style('stroke', 'var(--fg)').style('stroke-width', '2px');
  g.append('circle').attr('class', 'dot').attr('r', 6.5);
});

// ── state of the machine ─────────────────────────────────────────────────────
let current = 'Pending', fired = 0;
let log = ['created → Pending'];

function draw() {
  // "where are we" and "what just fired" are classes: the stylesheet fades between them
  nodes.select('rect').attr('class', (s) => kit.cls('solid', s.id === current && 'tone-active'));
  nodes.selectAll('.dot').attr('class', (s) => kit.cls('dot fill-ink', s.id === current && 'tone-active'));
  nodes.select('.ring').style('stroke', (s) => (s.id === current ? 'var(--active)' : 'var(--fg)'));
  lines.select('path').attr('class', (t, i) => kit.cls('line', fired === i && 'tone-active'));
  lines.select('text').attr('class', (t, i) => kit.cls('halo', fired === i && 'tone-active'));

  // legal events = the events of transitions leaving the current state
  const legal = new Set(transitions.filter((t) => t.from === current).map(eventOf));
  for (const [ev, btn] of buttons) {
    btn.disabled = !legal.has(ev);
    // legal events are drawn as filled (primary) buttons, illegal ones fade via the disabled style
    btn.style.background = legal.has(ev) ? 'var(--fg)' : '';
    btn.style.color = legal.has(ev) ? 'var(--surface)' : '';
  }
  status.set(log.join('   ·   '));
}

function fire(ev) {
  const i = transitions.findIndex((t) => t.from === current && eventOf(t) === ev);
  if (i < 0) return;
  const t = transitions[i];
  fired = i;
  current = t.to;
  log = [...log.slice(-3), `${t.label}: ${t.from} → ${t.to === 'end' ? 'archived' : t.to}`];
  draw();
}

const buttons = new Map(events.map((ev) => [ev, kit.button(ev, () => fire(ev))]));
const reset = kit.button('Reset', () => { current = 'Pending'; fired = 0; log = ['created → Pending']; draw(); });
const status = kit.status();
draw();

fig.add(kit.row(...buttons.values(), reset));
fig.add(status);
return fig.el;
