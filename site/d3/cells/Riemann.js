// Riemann sums: the area under a curve, approximated by n rectangles (or
// trapezoids). Drag a and b along the axis; change n and the rule (which
// height each rectangle uses: left edge, middle, right edge, or the average
// of both for a trapezoid).
//
// The d3 ideas: scales again (X.invert turns a drag into a number, a clamped
// copy of Y keeps tall bars inside the plot); d3.line() draws the curve AND
// every bar, because a bar is just a closed 4-point path. Since the rectangle
// and the trapezoid both have 4 points, switching rule is an ordinary
// transition on `d`: d3 interpolates the numbers inside the two path strings.
// The bars are a data join keyed by index (the default key), so changing n
// resizes the bars you have, fades new ones in and fades extra ones out.

const f = (x) => 1.5 * (0.1 * x ** 3 - 0.9 * x ** 2 + 2 * x + 0.6);

const W = 440, H = 260;
const X = d3.scaleLinear([-0.5, 6.5], [0, W]);
const Y = d3.scaleLinear([-0.6, 4], [H, 0]);
const Yc = Y.copy().clamp(true); // for bars: anything above/below the plot is cut at its edge
const line = d3.line();
const closed = d3.line().curve(d3.curveLinearClosed); // for the bars

let a = 0.5, b = 5.5, n = 6, rule = 'left', touched = false;

// room round the plot for tick labels, like dsviz's plane.viewBox()
const fig = kit.figure(W, H);
const { svg } = fig;
svg.attr('viewBox', [-34, -30, W + 64, H + 58]).attr('width', W + 64);
const mk = kit.markers(svg);

// grid at whole numbers, then axes through the origin. d3.axis draws ticks and labels;
// we put each axis where the other one is zero, and an arrowhead on the end of the line.
const xt = d3.range(0, 7), yt = d3.range(0, 5);
svg.append('g').selectAll('path')
  .data([...xt.map((v) => `M${X(v)},0V${H}`), ...yt.map((v) => `M0,${Y(v)}H${W}`)])
  .join('path').attr('class', 'grid').attr('d', (d) => d);
const hide0 = (v) => (v === 0 ? '' : String(v));
svg.append('g').attr('class', 'axisg').attr('transform', `translate(0,${Y(0)})`)
  .call(d3.axisBottom(X).tickValues(xt).tickSize(5).tickSizeOuter(0).tickFormat(hide0))
  .call((g) => g.select('.domain').attr('marker-end', mk('arrow')));
svg.append('g').attr('class', 'axisg').attr('transform', `translate(${X(0)},0)`)
  .call(d3.axisLeft(Y).tickValues(yt).tickSize(5).tickSizeOuter(0).tickFormat(hide0))
  .call((g) => g.select('.domain').attr('marker-end', mk('arrow')));

// the curve is sampled across the whole x range; a clipPath trims it to the plot
const clipId = `riemann-clip-${Math.random().toString(36).slice(2)}`;
svg.append('defs').append('clipPath').attr('id', clipId).append('rect').attr('width', W).attr('height', H);

const bars = svg.append('g');
svg.append('path').attr('class', 'curve').attr('clip-path', `url(#${clipId})`)
  .style('stroke-width', '2.25px').attr('d', line(d3.range(-0.5, 6.5001, 7 / 159).map((x) => [X(x), Y(f(x))])));
const guides = svg.selectAll('line.guide').data(['a', 'b']).join('line').attr('class', 'guide');
const handles = svg.selectAll('g.drag').data(['a', 'b'])
  .join((enter) => kit.handle(enter, { r: 5, tone: 'active', hint: true }));
handles.append('text').attr('class', 'math').attr('x', -4).attr('y', 16).attr('text-anchor', 'end').style('font-size', '13px').style('fill', 'var(--active)')
  .text((d) => d);

// dragging: x becomes maths x; y is ignored, the points stay on the axis
handles.call(kit.draggable(([px], d) => {
  touched = true;
  const x = kit.clamp(X.invert(px), 0, 6);
  if (d === 'a') a = x; else b = x;
  draw(false);
}));

const sums = kit.el('p', { class: 'stats' });

function rects(lo, hi) {
  const w = (hi - lo) / n;
  return d3.range(n).map((i) => {
    const xl = lo + i * w, xr = xl + w;
    const yl = f(xl), yr = f(xr);
    // the height each rule uses; the trapezoid slopes from yl to yr
    const h = rule === 'trap' ? null : f(rule === 'left' ? xl : rule === 'right' ? xr : (xl + xr) / 2);
    const [top0, top1] = rule === 'trap' ? [yl, yr] : [h, h];
    return {
      // 4 points in every rule, so a change of rule morphs instead of popping
      d: closed([[X(xl), Y(0)], [X(xl), Yc(top0)], [X(xr), Yc(top1)], [X(xr), Y(0)]]),
      tone: (top0 + top1) / 2 < 0 ? 'danger' : 'accent',
      area: ((top0 + top1) / 2) * w,
    };
  });
}

function draw(animate) {
  const go = (sel) => (animate ? kit.tr(sel, 300) : sel.interrupt());
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const data = rects(lo, hi);
  const sum = d3.sum(data, (d) => d.area);
  // exact area: a midpoint sum with 2000 slices is accurate to ~1e-7, plenty for four decimals
  const exact = d3.sum(d3.range(2000), (i) => f(lo + ((i + 0.5) * (hi - lo)) / 2000)) * ((hi - lo) / 2000);

  bars.selectAll('path').data(data) // no key function: key = index
    .join(
      (enter) => enter.append('path').attr('d', (d) => d.d).style('opacity', animate ? 0 : 1)
        .call((e) => animate && kit.tr(e, 300).style('opacity', 1)),
      (update) => update,
      (exit) => kit.tr(exit, 200).style('opacity', 0).remove(),
    )
    .attr('class', (d) => `solid tone-${d.tone}`).style('stroke', 'var(--edge)').style('stroke-width', '1.5px')
    .style('opacity', 1) // (a bar that was still fading in when a drag interrupted it)
    .call((s) => go(s).attr('d', (d) => d.d));

  const pos = { a, b };
  guides.attr('x1', (k) => X(pos[k])).attr('x2', (k) => X(pos[k])).attr('y1', Y(0)).attr('y2', (k) => Y(f(pos[k])));
  go(handles).attr('transform', (k) => `translate(${X(pos[k])},${Y(0)})`);
  handles.select('.halo-ring').style('display', touched ? 'none' : null);

  const err = sum - exact;
  sums.replaceChildren(
    kit.el('span', {}, 'sum = ', kit.el('b', {}, sum.toFixed(4))),
    kit.el('span', {}, 'exact = ', kit.el('b', {}, exact.toFixed(4))),
    kit.el('span', { style: `color:var(--${Math.abs(err) < 0.01 ? 'success' : 'danger'})` }, 'error = ', kit.el('b', { style: 'color:inherit' }, err.toFixed(4))),
  );
}

fig.add(kit.row(
  kit.slider({ label: 'Rectangles', min: 1, max: 40, value: n, format: (v) => `n = ${v}`, onInput: (v) => { n = v; draw(true); } }),
  kit.segmented({ options: [{ value: 'left', label: 'Left' }, { value: 'mid', label: 'Mid' }, { value: 'right', label: 'Right' }, { value: 'trap', label: 'Trap' }], value: rule, onInput: (v) => { rule = v; draw(true); } }),
));
fig.add(sums);
draw(false);
return fig.el;
