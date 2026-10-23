// Drag the point along the curve. The yellow line is the tangent; its slope is
// the derivative. "Show f′" plots every slope as a height, as its own curve.
//
// The d3 ideas: a scale maps maths coordinates to pixels (and .invert() maps
// back, which is how a drag becomes a number); d3.line() turns points into a
// path; and because each curve has the same number of points, a transition on
// the path's `d` morphs one function into the other.

const fns = {
  'sin x': { f: Math.sin, df: Math.cos },
  'x²/2 − 1': { f: (x) => (x * x) / 2 - 1, df: (x) => x },
  'x³/3 − x': { f: (x) => x ** 3 / 3 - x, df: (x) => x * x - 1 },
};

const W = 400, H = 300;
const X = d3.scaleLinear([-4, 4], [0, W]);
const Y = d3.scaleLinear([-3, 3], [H, 0]); // y up: the range runs the "wrong" way
const xs = d3.range(-4, 4.001, 0.05);
const line = d3.line();
const curvePath = (g) => line(xs.map((x) => [X(x), Y(Math.max(-3.5, Math.min(3.5, g(x))))]));

let name = 'sin x', x0 = 1, showDf = false, touched = false;

const fig = kit.figure(W, H, { pad: 4 });
const { svg } = fig;

// grid and axes: d3.axis draws the ticks, we only move it to where the axes cross (y = 0, x = 0)
svg.append('g').attr('class', 'grid-lines').selectAll('path')
  .data([...X.ticks(8).map((v) => `M${X(v)},0V${H}`), ...Y.ticks(6).map((v) => `M0,${Y(v)}H${W}`)])
  .join('path').attr('class', 'grid').attr('d', (d) => d);
svg.append('g').attr('class', 'axisg').attr('transform', `translate(0,${Y(0)})`)
  .call(d3.axisBottom(X).ticks(8).tickSize(5).tickFormat((v) => (v === 0 ? '' : v)));
svg.append('g').attr('class', 'axisg').attr('transform', `translate(${X(0)},0)`)
  .call(d3.axisLeft(Y).ticks(6).tickSize(5).tickFormat((v) => (v === 0 ? '' : v)));

const dfPath = svg.append('path').attr('class', 'curve dashed tone-visited').attr('stroke-width', 2);
const fPath = svg.append('path').attr('class', 'curve');
const link = svg.append('line').attr('class', 'guide');
const tangent = svg.append('line').attr('class', 'curve tone-active').attr('stroke-linecap', 'round');
const q = svg.append('circle').attr('class', 'handle tone-visited').attr('r', 6);
const p = kit.handle(svg, { hint: true });

const readout = kit.stats();

function draw(animate) {
  const { f, df } = fns[name];
  const slope = df(x0);
  const go = (sel) => (animate ? kit.tr(sel) : sel);

  go(fPath).attr('d', curvePath(f));
  go(dfPath).attr('d', curvePath(df)).style('opacity', showDf ? 1 : 0);
  // a tangent is two points: step 1.4 either side along the line y = f(x0) + slope (x - x0)
  const [a, b] = [x0 - 1.4, x0 + 1.4];
  go(tangent).attr('x1', X(a)).attr('y1', Y(f(x0) + slope * (a - x0))).attr('x2', X(b)).attr('y2', Y(f(x0) + slope * (b - x0)));
  go(link).attr('x1', X(x0)).attr('y1', Y(f(x0))).attr('x2', X(x0)).attr('y2', Y(df(x0))).style('opacity', showDf ? 1 : 0);
  go(q).attr('cx', X(x0)).attr('cy', Y(df(x0))).style('opacity', showDf ? 1 : 0);
  go(p).attr('transform', `translate(${X(x0)},${Y(f(x0))})`);
  p.select('.halo-ring').style('display', touched ? 'none' : null);
  readout.set([['x =', x0.toFixed(2)], ['f(x) =', f(x0).toFixed(2)], ["f′(x) =", slope.toFixed(2)]]);
}

// dragging: the pointer's x becomes maths x with scale.invert; y is ignored, because the point stays on the curve
p.call(kit.draggable(([px]) => { touched = true; x0 = kit.clamp(X.invert(px), -3.9, 3.9); draw(false); }));

fig.add(kit.row(
  kit.segmented({ options: Object.keys(fns), value: name, onInput: (v) => { name = v; draw(true); } }),
  kit.toggle({ label: 'Show f′', value: showDf, onInput: (v) => { showDf = v; draw(true); } }),
));
fig.add(readout);
draw(false);
return fig.el;
