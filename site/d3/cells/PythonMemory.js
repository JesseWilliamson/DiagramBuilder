// Names, objects and aliasing, Python-Tutor style. `b = a` doesn't copy the list:
// it draws a second arrow to the same object. Step through and watch what changes.
//
// The d3 ideas: one keyed join per kind of thing (stack frames, variable slots, heap
// objects, list cells, reference arrows). The keys are the *names* ("Global.a", "L1",
// "ref:Global.b"), so between two steps d3 can tell what stayed, what is new and what
// went away: the new arrow fades in, the removed `grow` frame fades out, and the
// frame that stays simply changes height. Reference arrows are quadratic curves
// built with d3.path whose `d` is transitioned, so an arrow glides when its target moves.
// Layout is written by hand (d3 has no "stack and heap" layout): it is a few rows and columns.

const code = [
  'a = [1, 2]',
  'b = a',
  'b.append(3)',
  'c = list(a)',
  'c[0] = 99',
  'def grow(xs):',
  '    xs.append(4)',
  'grow(c)',
  'print(a, c)',
];

// A step = which line is highlighted, the stack frames, the heap objects, which things to tint, and a sentence.
// A variable's value is a number/string, or { ref: id } for an arrow to a heap object.
const ref = (id) => ({ ref: id });
const fn = { id: 'fn', kind: 'function grow', items: [] };
const G = (...vars) => ({ name: 'Global', vars: vars.map(([name, value]) => ({ name, value })) });
const a_ = ['a', ref('L1')], b_ = ['b', ref('L1')], c_ = ['c', ref('L2')], grow_ = ['grow', ref('fn')];

const steps = [
  { line: 0, frames: [G(a_)], heap: [{ id: 'L1', kind: 'list', items: [1, 2] }], tones: { 'Global.a': 'success', L1: 'success' }, note: 'A list object is created, and the name a points to it.' },
  { line: 1, frames: [G(a_, b_)], heap: [{ id: 'L1', kind: 'list', items: [1, 2] }], tones: { 'Global.b': 'success' }, note: 'b = a copies the ARROW, not the list. Two names, one object.' },
  { line: 2, frames: [G(a_, b_)], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }], tones: { L1: 'active' }, note: 'Appending through b changes the one list, so a sees it too.' },
  { line: 3, frames: [G(a_, b_, c_)], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [1, 2, 3] }], tones: { 'Global.c': 'success', L2: 'success' }, note: 'list(a) builds a NEW list with the same items. c points there.' },
  { line: 4, frames: [G(a_, b_, c_)], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3] }], tones: { L2: 'active' }, note: 'Changing the copy leaves the original alone.' },
  { line: 5, frames: [G(a_, b_, c_, grow_)], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3] }, fn], tones: { 'Global.grow': 'success', fn: 'success' }, note: 'def makes a function object and binds the name grow to it.' },
  { line: 7, frames: [G(a_, b_, c_, grow_), { name: 'grow', vars: [{ name: 'xs', value: ref('L2') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3] }, fn], tones: { 'grow.xs': 'success' }, note: "Calling grow(c) makes a new frame. The parameter xs is another arrow to c's list." },
  { line: 6, frames: [G(a_, b_, c_, grow_), { name: 'grow', vars: [{ name: 'xs', value: ref('L2') }] }], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3, 4] }, fn], tones: { L2: 'active' }, note: "So appending to xs changes the caller's list." },
  { line: 7, frames: [G(a_, b_, c_, grow_)], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3, 4] }, fn], tones: {}, note: 'The call returns and its frame disappears. The list it changed stays.' },
  { line: 8, frames: [G(a_, b_, c_, grow_)], heap: [{ id: 'L1', kind: 'list', items: [1, 2, 3] }, { id: 'L2', kind: 'list', items: [99, 2, 3, 4] }, fn], tones: {}, note: 'Output: [1, 2, 3] [99, 2, 3, 4]' },
];

// ── layout constants ────────────────────────────────────────────────────────
const FW = 150, HX = 270, RH = 28, CELL = 40;
const SLOT_X = FW - 34;
// Fixed heap positions, so an object never jumps when another is added.
const heapPos = { L1: [HX, 20], L2: [HX, 92], fn: [HX, 164] };

const show = (v) => (v === null ? 'None' : typeof v === 'string' ? `"${v}"` : typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v));
const isRef = (v) => typeof v === 'object' && v !== null;
const tcls = (base, t) => (t ? `${base} tone-${t}` : base);

// A step becomes plain arrays: where every frame, slot, heap object and arrow is.
function layout(step) {
  let fy = 0;
  const frames = [], slots = [];
  for (const f of step.frames) {
    const h = 26 + f.vars.length * RH + 8;
    frames.push({ key: f.name, y: fy, h });
    f.vars.forEach((v, i) => slots.push({ key: `${f.name}.${v.name}`, name: v.name, value: v.value, x: SLOT_X, y: fy + 26 + i * RH + RH / 2, tone: step.tones[`${f.name}.${v.name}`] }));
    fy += h + 12;
  }
  const objects = step.heap.map((o) => ({ ...o, x: heapPos[o.id][0], y: heapPos[o.id][1], tone: step.tones[o.id] }));
  // an arrow from each reference slot to the left edge of its object. Arrows that go up or down bow a little, so parallel ones don't overlap.
  const arrows = slots.filter((s) => isRef(s.value)).map((s) => {
    const o = heapPos[s.value.ref];
    const to = [o[0] - 4, o[1]], dy = to[1] - s.y;
    return { key: `ref:${s.key}`, from: [s.x, s.y], to, bend: Math.abs(dy) < 4 ? 0 : Math.sign(dy) * -Math.min(30, Math.abs(dy) * 0.25), tone: s.tone };
  });
  return { frames, slots, objects, arrows };
}
// a quadratic curve whose control point sits `bend` px off the midpoint, perpendicular to the line.
// Always the same "M…Q…" shape, so the transition can interpolate numbers inside the string.
function arrowPath({ from: [x1, y1], to: [x2, y2], bend }) {
  const dx = x2 - x1, dy = y2 - y1, k = Math.hypot(dx, dy) || 1;
  const p = d3.path();
  p.moveTo(x1, y1);
  p.quadraticCurveTo((x1 + x2) / 2 - (dy / k) * bend, (y1 + y2) / 2 + (dx / k) * bend, x2, y2);
  return p.toString();
}

// ── the figure ──────────────────────────────────────────────────────────────
// Sized for the biggest step (second frame + function object + 4-item list), so nothing is clipped later.
const fig = kit.figure(444, 236);
const { svg } = fig;
svg.attr('viewBox', [-4, -14, 444, 236]);
const mk = kit.markers(svg);
const frameL = svg.append('g'), slotL = svg.append('g'), heapL = svg.append('g'), arrowL = svg.append('g');

// Transition a transform. attrTween + interpolateString tweens the numbers inside "translate(x,y)" directly
// (the built-in transform interpolator parses the DOM matrix, which headless test DOMs don't have).
const moveTo = (t, f) => t.attrTween('transform', function (d, i) { return d3.interpolateString(this.getAttribute('transform') ?? f(d, i), f(d, i)); });

// Every layer uses the same enter = fade in, exit = fade out.
// The fade is a *named* transition ('fade'): a selection can run one transition per name at a
// time, so the fade and the move (default name) don't cancel each other.
const fade = (enter, exit) => [
  (e) => enter(e).style('opacity', 0).call((n) => n.transition('fade').duration(350).style('opacity', 1)),
  (u) => u,
  (x) => x.transition('fade').duration(250).style('opacity', 0).remove(),
];

function draw(step) {
  const L = layout(step);

  // stack frames: a grey panel with the frame's name. Keyed by name, so `Global` just grows taller.
  frameL.selectAll('g.frame').data(L.frames, (d) => d.key).join(...fade((e) => {
    const g = e.append('g').attr('class', 'frame').attr('transform', (d) => `translate(0,${d.y})`);
    g.append('rect').attr('class', 'panel').attr('width', FW).attr('rx', 6).attr('height', (d) => d.h);
    g.append('text').attr('class', 'muted').attr('font-size', 11).attr('x', 10).attr('y', 13).attr('dy', '.35em').text((d) => d.key);
    return g;
  })).call((g) => moveTo(kit.tr(g, 350), (d) => `translate(0,${d.y})`).select('rect').attr('height', (d) => d.h));

  // variable slots: name, a box, and either a dot (reference) or the value itself
  slotL.selectAll('g.slot').data(L.slots, (d) => d.key).join(...fade((e) => {
    const g = e.append('g').attr('class', 'slot').attr('transform', (d) => `translate(${d.x},${d.y})`);
    g.append('text').attr('class', 'name value').attr('font-size', 13).attr('x', -26).attr('dy', '.35em').attr('text-anchor', 'end');
    g.append('rect').attr('class', 'solid').attr('x', -20).attr('y', -(RH - 6) / 2).attr('width', 40).attr('height', RH - 6).attr('rx', 4);
    g.append('circle').attr('class', 'fill-ink').attr('r', 3.5).style('fill', 'var(--edge)');
    g.append('text').attr('class', 'val value').attr('font-size', 12).attr('dy', '.35em').attr('text-anchor', 'middle');
    return g;
  })).each(function (d) {
    const g = d3.select(this);
    g.attr('class', tcls('slot', d.tone));
    g.select('.name').text(d.name);
    g.select('circle').style('display', isRef(d.value) ? null : 'none');
    g.select('.val').text(isRef(d.value) ? '' : show(d.value));
    moveTo(kit.tr(g, 350), () => `translate(${d.x},${d.y})`);
  });

  // heap objects: a kind label, then one cell per item. Cells are keyed by position, so an appended item enters from the right.
  heapL.selectAll('g.obj').data(L.objects, (d) => d.id).join(...fade((e) => {
    const g = e.append('g').attr('class', 'obj').attr('transform', (d) => `translate(${d.x},${d.y})`);
    g.append('text').attr('class', 'muted').attr('font-size', 11).attr('y', -RH / 2 - 9).attr('dy', '.35em').attr('text-anchor', 'start').text((d) => d.kind);
    g.append('rect').attr('class', 'solid ghost').attr('y', -12).attr('width', 28).attr('height', 24).attr('rx', 3);
    return g;
  })).each(function (d) {
    const g = d3.select(this);
    g.attr('class', tcls('obj', d.tone));
    g.select('.ghost').style('display', d.items.length ? 'none' : null);
    g.selectAll('g.cell').data(d.items.map((v, i) => ({ v, i })), (c) => c.i).join(
      (e) => {
        const c = e.append('g').attr('class', 'cell').style('opacity', 0).attr('transform', (c) => `translate(${c.i * CELL + 20},0)`); // slide in from the right
        c.append('rect').attr('class', 'solid').attr('y', -12).attr('width', CELL).attr('height', RH - 4).attr('rx', 3);
        c.append('text').attr('class', 'muted').attr('font-size', 9).attr('x', CELL / 2).attr('y', RH / 2 + 7).attr('dy', '.35em').attr('text-anchor', 'middle').text((c) => c.i);
        c.append('text').attr('class', 'val value').attr('font-size', 12).attr('x', CELL / 2).attr('dy', '.35em').attr('text-anchor', 'middle');
        return c;
      },
      (u) => u,
      (x) => kit.tr(x, 250).style('opacity', 0).remove(),
    ).call((c) => {
      c.select('.val').text((c) => show(c.v));
      moveTo(kit.tr(c, 350).style('opacity', 1), (c) => `translate(${c.i * CELL},0)`);
    });
  });

  // reference arrows: keyed by "ref:<slot>". When a variable is re-pointed or the slot moves, the same path re-routes.
  arrowL.selectAll('path.ref').data(L.arrows, (d) => d.key).join(...fade((e) =>
    e.append('path').attr('class', 'ref').attr('marker-end', mk('arrow')).attr('d', arrowPath),
  )).attr('class', (d) => tcls('ref line', d.tone)).call((p) => kit.tr(p, 350).attr('d', arrowPath));

  msg.set(step.note);
  trace.set(step.line);
}

const msg = kit.status();
const trace = kit.codeTrace(code);
fig.add(msg);
fig.add(trace);
const player = kit.player(steps, { interval: 1400, onFrame: draw, invalidation });
fig.add(kit.transport(player));
return fig.el;
