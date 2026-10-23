// Vectors you can grab by the tip. Same plane, three questions: what is u + v,
// what is u - v, and how much of u points along v (the projection)?
//
// The d3 ideas: scales map maths coordinates to pixels and back (X.invert,
// Y.invert turn a drag into a vector). Every arrow on the plane is one datum in
// a list, keyed by id, so when you switch mode the arrows with the same id
// ("result", "v-copy") glide to their new place while the others fade in or
// out: the list changes, d3 works out the motion. The angle arc comes from
// d3.arc (wedge) and d3.lineRadial (the arc line), both "angle from 12 o'clock".

const W = 420, H = 300;
// 60px per unit on BOTH axes, so angles on screen are the true angles
const X = d3.scaleLinear([-1, 6], [0, W]);
const Y = d3.scaleLinear([-1, 4], [H, 0]);
const px = ([x, y]) => [X(x), Y(y)];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const dotp = (p, q) => p[0] * q[0] + p[1] * q[1];
const O = [0, 0];
const fmt = (v) => `(${v[0].toFixed(1)}, ${v[1].toFixed(1)})`; // fixed decimals: no jitter while dragging

let u = [3.5, 1], v = [1.25, 2.5], mode = 'sum', touched = false;

const fig = kit.figure(W, H);
const { svg } = fig;
svg.attr('viewBox', [-34, -30, W + 64, H + 58]).attr('width', W + 64);
const mk = kit.markers(svg);

// grid + axes, as in the Riemann cell
const tx = d3.range(0, 7), ty = d3.range(0, 5);
svg.append('g').selectAll('path')
  .data([...d3.range(-1, 7).map((t) => `M${X(t)},0V${H}`), ...d3.range(-1, 5).map((t) => `M0,${Y(t)}H${W}`)])
  .join('path').attr('class', 'grid').attr('d', (d) => d);
const hide0 = (t) => (t === 0 ? '' : String(t).replace('-', '−'));
svg.append('g').attr('class', 'axisg').attr('transform', `translate(0,${Y(0)})`)
  .call(d3.axisBottom(X).tickValues(d3.range(-1, 7)).tickSize(5).tickSizeOuter(0).tickFormat(hide0))
  .call((g) => g.select('.domain').attr('marker-end', mk('arrow')));
svg.append('g').attr('class', 'axisg').attr('transform', `translate(${X(0)},0)`)
  .call(d3.axisLeft(Y).tickValues(d3.range(-1, 5)).tickSize(5).tickSizeOuter(0).tickFormat(hide0))
  .call((g) => g.select('.domain').attr('marker-end', mk('arrow')));

// u + v can run off the plane, so everything drawn on it is clipped to the picture
const clipId = `vec-clip-${Math.random().toString(36).slice(2)}`;
svg.append('defs').append('clipPath').attr('id', clipId).append('rect').attr('x', -34).attr('y', -30).attr('width', W + 64).attr('height', H + 58);
const stage = svg.append('g').attr('clip-path', `url(#${clipId})`);

// order matters: the draggable tips go first so the arrowheads draw on top of them
// (lines ignore the pointer, so the tip can still be grabbed through the head)
const grips = stage.append('g');
const marks = stage.append('g').style('pointer-events', 'none'); // angle arc + wedge
const arrows = stage.append('g').style('pointer-events', 'none');

const tips = ['U', 'V'].map((k) => kit.handle(grips, { r: 5, tone: k === 'U' ? 'accent' : 'visited', hint: true }).datum(k));
const tipsSel = d3.selectAll(tips.map((g) => g.node()));
tipsSel.call(kit.draggable(([x, y], k) => {
  touched = true;
  // only the tips you hold are kept on the plane, so they can always be grabbed again;
  // what they produce (u + v, u - v) is free to run off the edge
  const p = [kit.clamp(X.invert(x), -1, 6), kit.clamp(Y.invert(y), -1, 4)];
  if (k === 'U') u = p; else v = p;
  draw(false);
}));

// The arrows for the current mode, as data. Order = drawing order.
function vectors() {
  const dashed = { tone: 'muted', dashed: true, width: 1.5 };
  const all = [];
  if (mode === 'sum') all.push(
    { id: 'v-copy', from: u, to: add(u, v), ...dashed },
    { id: 'u-copy', from: v, to: add(u, v), ...dashed },
    { id: 'result', from: O, to: add(u, v), tone: 'success', label: 'u + v' });
  if (mode === 'difference') all.push(
    { id: 'result', from: v, to: u, tone: 'danger', label: 'u − v' },
    { id: 'v-copy', from: O, to: sub(u, v), ...dashed });
  if (mode === 'projection') {
    const proj = [v[0] * (dotp(u, v) / (dotp(v, v) || 1)), v[1] * (dotp(u, v) / (dotp(v, v) || 1))];
    all.push(
      { id: 'perp', from: u, to: proj, guide: true },
      { id: 'result', from: O, to: proj, tone: 'success', label: 'proj_v u', width: 3 });
  }
  all.push({ id: 'u', from: O, to: u, tone: 'accent', label: 'u' }, { id: 'v', from: O, to: v, tone: 'visited', label: 'v' });
  return all;
}

// label beside the arrow's midpoint, pushed off to its left, as in the original
function labelPos(d) {
  const A = px(d.from), B = px(d.to);
  const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1;
  return [(A[0] + B[0]) / 2 + (dy / l) * 14, (A[1] + B[1]) / 2 - (dx / l) * 14];
}

// the angle mark between u and v at the origin (projection mode only)
function angleMark() {
  const a0 = Math.atan2(-u[1], u[0]), a1raw = Math.atan2(-v[1], v[0]); // screen angles: y points down
  let delta = a1raw - a0;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const a1 = a0 + delta, r = 30, c = px(O);
  const deg = (Math.abs(delta) * 180) / Math.PI;
  const asD3 = (t) => t + Math.PI / 2; // d3's angle 0 points up, screen's 0 points right
  const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
  const wedge = d3.arc().innerRadius(0).outerRadius(r).startAngle(asD3(lo)).endAngle(asD3(hi))();
  let arcLine;
  if (Math.abs(deg - 90) < 0.5) {
    // a right angle gets a little square instead of an arc
    const s = r * 0.7, e0 = [Math.cos(a0) * s, Math.sin(a0) * s], e1 = [Math.cos(a1) * s, Math.sin(a1) * s];
    arcLine = d3.line()([e0, [e0[0] + e1[0], e0[1] + e1[1]], e1]);
  } else {
    arcLine = d3.lineRadial().angle((t) => asD3(t)).radius(r)(d3.range(25).map((i) => lo + ((hi - lo) * i) / 24));
  }
  const mid = (a0 + a1) / 2;
  return { c, wedge, arcLine, label: [Math.cos(mid) * (r + 12), Math.sin(mid) * (r + 12)], deg };
}

const wedge = marks.append('path').attr('class', 'area tone-active').style('opacity', 0.35);
const arc = marks.append('path').attr('class', 'curve tone-active').style('stroke-width', '1.5px');
const theta = marks.append('text').attr('class', 'math tone-active').style('font-style', 'italic').attr('text-anchor', 'middle').attr('dy', '0.35em').style('font-size', '14px').text('θ');

const stats = kit.el('p', { class: 'stats formula' });
const stat = (label, value, tone) => kit.el('span', { style: tone ? `color:var(--${tone})` : null }, label, ' ', kit.el('b', { style: tone ? 'color:inherit' : null }, value));

function draw(animate) {
  const go = (sel) => (animate ? kit.tr(sel, 350) : sel.interrupt());

  // tips
  tipsSel.each(function (k) { d3.select(this).select('.halo-ring').style('display', touched ? 'none' : null); });
  go(tipsSel).attr('transform', (k) => `translate(${px(k === 'U' ? u : v)})`);

  // arrows: keyed by id
  arrows.selectAll('g.vec').data(vectors(), (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'vec').style('opacity', 0);
      g.append('line');
      g.append('text').attr('class', 'math').attr('text-anchor', 'middle').attr('dy', '0.35em').style('font-size', '14px');
      // a new arrow starts where it will be, then fades in
      g.each(place);
      kit.tr(g, 350).style('opacity', 1);
      return g;
    },
    (update) => update,
    (exit) => kit.tr(exit, 200).style('opacity', 0).remove(),
  ).each(function (d) {
    const g = d3.select(this);
    g.select('line')
      .attr('class', d.guide ? 'guide' : `line tone-${d.tone}`)
      .style('stroke-width', d.guide ? null : `${d.width ?? 2.25}px`)
      .style('stroke', d.tone === 'muted' ? 'var(--faint)' : null)
      .attr('stroke-dasharray', d.dashed ? '6 5' : null)
      .attr('marker-end', d.guide ? null : mk('arrow'));
    kit.tex(g.select('text').attr('class', `math tone-${d.tone}`).style('font-style', 'italic'), d.label ?? '');
    go(g.select('line')).attr('x1', px(d.from)[0]).attr('y1', px(d.from)[1]).attr('x2', px(d.to)[0]).attr('y2', px(d.to)[1]);
    go(g.select('text')).attr('x', labelPos(d)[0]).attr('y', labelPos(d)[1]);
  });
  function place(d) {
    const g = d3.select(this);
    g.select('line').attr('x1', px(d.from)[0]).attr('y1', px(d.from)[1]).attr('x2', px(d.to)[0]).attr('y2', px(d.to)[1]);
    g.select('text').attr('x', labelPos(d)[0]).attr('y', labelPos(d)[1]);
  }

  // angle mark
  const m = angleMark();
  const showAngle = mode === 'projection' && Math.hypot(...u) > 0.01 && Math.hypot(...v) > 0.01;
  wedge.attr('transform', `translate(${m.c})`).attr('d', m.wedge);
  arc.attr('transform', `translate(${m.c})`).attr('d', m.arcLine);
  theta.attr('x', m.c[0] + m.label[0]).attr('y', m.c[1] + m.label[1]);
  kit.tr(marks, 250).style('opacity', showAngle ? 1 : 0);

  // numbers
  const sum = add(u, v), diff = sub(u, v);
  const cos = dotp(u, v) / ((Math.hypot(...u) * Math.hypot(...v)) || 1);
  stats.replaceChildren(
    stat('u =', fmt(u), 'accent'), stat('v =', fmt(v), 'visited'),
    ...(mode === 'sum' ? [stat('u + v =', fmt(sum), 'success')] : []),
    ...(mode === 'difference' ? [stat('u − v =', fmt(diff), 'danger')] : []),
    ...(mode === 'projection' ? [stat('u · v =', dotp(u, v).toFixed(2)), stat('θ =', `${((Math.acos(kit.clamp(cos, -1, 1)) * 180) / Math.PI).toFixed(1)}°`, 'active')] : []),
  );
}

fig.add(kit.row(kit.segmented({ options: ['sum', 'difference', 'projection'], value: mode, onInput: (m) => { mode = m; draw(true); } })));
fig.add(stats);
draw(false);
return fig.el;
