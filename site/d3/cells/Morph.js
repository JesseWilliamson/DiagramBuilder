// One closed shape that morphs between a polygon, a star, a heart and a circle,
// even though they have different numbers of points (5, 10, 80, 72...).
//
// The d3 ideas: d3 can tween a path's `d` only when the two paths have the same
// structure (same number of points). Here they do not, so we first *resample*
// the old outline to the new point count by arc length (walk round the outline
// and drop N evenly spaced points), then tween point by point with
// d3.interpolateArray. d3 has no built-in for this; the separate library
// d3-interpolate-path does a similar job on SVG strings. Doing it on arrays of
// points lets the vertex dots follow the outline for free, and is ~15 lines.
// The trade-off: arc-length resampling ignores corners, so a corner of the old
// shape may slide along the new outline instead of landing on a corner.
//
// Because we tween the *points* (not the string), we drive the animation with
// transition.tween(): a function called every frame with t from 0 to 1, in
// which we draw. d3.line() with a curve turns points into a path, and swapping
// curveLinearClosed for curveCatmullRomClosed is all "Smooth" does.

const R = 100;
const TONES = { polygon: 'accent', star: 'active', heart: 'danger', circle: 'success' };

function shapePoints(shape, n) {
  // `count` points evenly round a circle, starting at the top; radius from r(i)
  const around = (count, r) =>
    d3.range(count).map((i) => {
      const t = -Math.PI / 2 + (2 * Math.PI * i) / count;
      return [r(i) * Math.cos(t), r(i) * Math.sin(t)];
    });
  if (shape === 'polygon') return around(n, () => R);
  if (shape === 'star') return around(2 * n, (i) => (i % 2 ? R * 0.45 : R)); // alternate outer / inner radius
  if (shape === 'circle') return around(72, () => R);
  // heart: a classic parametric curve (y negated because SVG's y points down)
  return d3.range(80).map((i) => {
    const t = (2 * Math.PI * i) / 80;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [x * 6.2, -y * 6.2 - 10];
  });
}

// Resample a closed outline to m points, evenly spaced by arc length.
function resample(points, m) {
  const loop = [...points, points[0]];
  // cumulative length at each vertex: [0, len01, len01+len12, ...]
  const cum = [0];
  for (let i = 1; i < loop.length; i++) cum.push(cum[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
  const total = cum[cum.length - 1];
  return d3.range(m).map((k) => {
    const s = (k / m) * total;
    // which segment holds distance s? bisect finds it in the cumulative array
    const i = Math.min(d3.bisectRight(cum, s) - 1, loop.length - 2);
    const u = (s - cum[i]) / (cum[i + 1] - cum[i] || 1);
    return d3.interpolateArray(loop[i], loop[i + 1])(u);
  });
}

let shape = 'polygon', n = 5, smooth = false, dots = true;
let shown = shapePoints(shape, n); // what is on screen right now (also mid-morph)

const W = 260, H = 250;
const fig = kit.figure(W, H);
const g = fig.svg.append('g').attr('transform', `translate(${W / 2},${H / 2 + 5})`);
const body = g.append('path').attr('class', 'solid').style('stroke', 'var(--edge)').attr('stroke-linejoin', 'round');
const dotLayer = g.append('g');

function paint(points) {
  shown = points;
  body.attr('d', d3.line().curve(smooth ? d3.curveCatmullRomClosed : d3.curveLinearClosed)(points));
  // one dot per point; the count changes only when the shape does
  dotLayer.selectAll('circle').data(dots ? points : [])
    .join('circle').attr('r', 2.5).style('fill', 'var(--fg)').attr('cx', (d) => d[0]).attr('cy', (d) => d[1]);
}

function morphTo(next, animate) {
  body.attr('class', `solid tone-${TONES[shape]}`); // colour: a CSS transition on fill/stroke
  body.interrupt();
  if (!animate) return paint(next);
  // 1. give the old outline as many points as the new one; 2. tween between the two arrays
  const mix = d3.interpolateArray(resample(shown, next.length), next);
  body.transition().duration(650).ease(d3.easeCubicInOut).tween('morph', () => (t) => paint(mix(t)));
}

const stat = kit.stats();
const corners = kit.slider({ label: 'Corners', min: 3, max: 12, value: n, format: (v) => v, onInput: (v) => { n = v; update(true); } });
function update(animate) {
  corners.style.display = shape === 'polygon' || shape === 'star' ? null : 'none';
  const next = shapePoints(shape, n);
  morphTo(next, animate);
  stat.set([['points =', next.length]]);
}

fig.add(kit.row(
  kit.segmented({ options: Object.keys(TONES), value: shape, onInput: (v) => { shape = v; update(true); } }),
  kit.toggle({ label: 'Smooth', value: smooth, onInput: (v) => { smooth = v; paint(shown); } }),
  kit.toggle({ label: 'Points', value: dots, onInput: (v) => { dots = v; paint(shown); } }),
));
fig.add(corners);
fig.add(stat);
update(false);
return fig.el;
