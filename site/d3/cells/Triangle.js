// Drag the three corners. The angles always add to 180°, and the classic centres
// follow along: circumcircle, incircle, medians (meet at the centroid G) and
// altitudes (meet at the orthocentre H). The angle arc becomes a little square at 90°.
//
// The d3 ideas: d3-polygon gives the centroid and the area (so the incircle's radius),
// d3.arc draws the pale wedge of each angle, d3.path draws the arc or the right-angle
// square, and a keyed join over the three corners keeps one element set per vertex.
// d3 has no circumcentre or foot-of-perpendicular, so those are the small helpers below.

const W = 440, H = 300;
const line = d3.line();

let pts = [[110, 230], [330, 240], [190, 60]];
let show = { circum: true, incircle: false, medians: false, altitudes: false };
let touched = false;

// ── geometry d3 doesn't have ────────────────────────────────────────────────
const dist = ([x1, y1], [x2, y2]) => Math.hypot(x1 - x2, y1 - y2);
const mid = ([x1, y1], [x2, y2]) => [(x1 + x2) / 2, (y1 + y2) / 2];
// the (unsigned) angle at b in a-b-c
const angleAt = (a, b, c) => {
  const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];
  return Math.atan2(Math.abs(u[0] * v[1] - u[1] * v[0]), u[0] * v[0] + u[1] * v[1]);
};
function foot(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1]];
  const t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1);
  return [a[0] + ab[0] * t, a[1] + ab[1] * t];
}
function circumcircle(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  const sq = (p) => p[0] * p[0] + p[1] * p[1];
  const center = [
    (sq(a) * (b[1] - c[1]) + sq(b) * (c[1] - a[1]) + sq(c) * (a[1] - b[1])) / d,
    (sq(a) * (c[0] - b[0]) + sq(b) * (a[0] - c[0]) + sq(c) * (b[0] - a[0])) / d,
  ];
  return { center, r: dist(center, a) };
}
function incircle(a, b, c) {
  const la = dist(b, c), lb = dist(a, c), lc = dist(a, b), per = la + lb + lc || 1;
  return {
    center: [(la * a[0] + lb * b[0] + lc * c[0]) / per, (la * a[1] + lb * b[1] + lc * c[1]) / per],
    r: Math.abs(d3.polygonArea([a, b, c])) / (per / 2), // area = r · s, s = half the perimeter
  };
}
function lineIntersection(a, b, c, d) {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  return [a[0] + r[0] * t, a[1] + r[1] * t];
}

// ── layers, back to front ───────────────────────────────────────────────────
const fig = kit.figure(W, H, { pad: 4 });
const { svg } = fig;
const gCirc = svg.append('g');
const circum = gCirc.append('circle').attr('class', 'line tone-visited');
const circumC = gCirc.append('circle').attr('class', 'fill-ink').attr('r', 2.5);
const gInc = svg.append('g');
const inc = gInc.append('circle').attr('class', 'line tone-success');
const incC = gInc.append('circle').attr('class', 'fill-ink').attr('r', 2.5);
const gMed = svg.append('g');
const gAlt = svg.append('g');
const gTick = svg.append('g');
const gAng = svg.append('g');
const edge = svg.append('path').attr('class', 'curve').attr('stroke-width', 1.75);
const gLab = svg.append('g');
const handles = [0, 1, 2].map((i) => kit.handle(svg, { r: 5, hint: true }).datum(i));

const fx = (sel, on) => kit.tr(sel, 250).style('opacity', on ? 1 : 0);
const glyph = (g, cls, pt, name, dx = 10, dy = -12) => {
  g.select('circle').attr('class', `handle ${cls}`).attr('r', 4.5);
  g.select('text').attr('class', `math ${cls}`).attr('font-style', 'italic').attr('font-size', 14).text(name);
  g.attr('transform', `translate(${pt})`).select('text').attr('x', dx).attr('y', dy);
};

// one angle mark = pale wedge + arc (or square) + degree label, at vertex b between a and c
const wedge = d3.arc().innerRadius(0).outerRadius(22);
function angleMark(g, a, b, c, r = 22) {
  const a0 = Math.atan2(a[1] - b[1], a[0] - b[0]);
  let d = Math.atan2(c[1] - b[1], c[0] - b[0]) - a0;
  while (d > Math.PI) d -= 2 * Math.PI; // sweep the short way round
  while (d < -Math.PI) d += 2 * Math.PI;
  const deg = (angleAt(a, b, c) * 180) / Math.PI;
  const a1 = a0 + d;
  g.attr('transform', `translate(${b})`);
  // d3.arc measures angles clockwise from 12 o'clock; screen atan2 starts at 3 o'clock, hence + π/2
  g.select('.wedge').attr('d', wedge.outerRadius(r)({ startAngle: a0 + Math.PI / 2, endAngle: a1 + Math.PI / 2 }));
  const p = d3.path();
  if (Math.abs(deg - 90) < 0.5) {
    // exactly 90°: a little square with sides 0.7r along each ray
    const s = r * 0.7, u = [Math.cos(a0) * s, Math.sin(a0) * s], v = [Math.cos(a1) * s, Math.sin(a1) * s];
    p.moveTo(...u); p.lineTo(u[0] + v[0], u[1] + v[1]); p.lineTo(...v);
  } else {
    p.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
    p.arc(0, 0, r, a0, a1, d < 0); // canvas-style arc; the last flag is "anticlockwise"
  }
  g.select('.mark').attr('d', p.toString());
  const m = (a0 + a1) / 2;
  g.select('text').attr('x', (r + 12) * Math.cos(m)).attr('y', (r + 12) * Math.sin(m)).text(`${Math.round(deg)}°`);
}

const formula = kit.status();
formula.style.fontFamily = 'var(--math)';

function draw() {
  const [A, B, C] = pts;

  const cc = circumcircle(A, B, C);
  circum.attr('cx', cc?.center[0]).attr('cy', cc?.center[1]).attr('r', cc?.r);
  circumC.attr('cx', cc?.center[0]).attr('cy', cc?.center[1]);
  fx(gCirc, show.circum && cc);
  const ic = incircle(A, B, C);
  inc.attr('cx', ic.center[0]).attr('cy', ic.center[1]).attr('r', ic.r);
  incC.attr('cx', ic.center[0]).attr('cy', ic.center[1]);
  fx(gInc, show.incircle);

  // medians: vertex -> midpoint of the opposite side. Keyed by vertex, so dragging edits lines rather than redrawing.
  const G = d3.polygonCentroid(pts);
  const med = pts.map((p, i) => ({ id: i, a: p, b: mid(pts[(i + 1) % 3], pts[(i + 2) % 3]) }));
  const Hc = lineIntersection(A, foot(A, B, C), B, foot(B, A, C));
  const alt = pts.map((p, i) => ({ id: i, a: p, b: foot(p, pts[(i + 1) % 3], pts[(i + 2) % 3]) }));
  const dashed = (g, rows, tn) => g.selectAll('line').data(rows, (d) => d.id).join('line')
    .attr('class', `line dashed tone-${tn}`).attr('stroke-width', 1.25)
    .attr('x1', (d) => d.a[0]).attr('y1', (d) => d.a[1]).attr('x2', (d) => d.b[0]).attr('y2', (d) => d.b[1]);
  dashed(gMed, med, 'active');
  dashed(gAlt, alt, 'danger');
  [['G', G, 'active', show.medians, gMed], ['H', Hc, 'danger', show.altitudes && Hc, gAlt]].forEach(([name, pt, tn, on, g]) => {
    const dot = g.selectAll('g.pt').data(pt ? [name] : []).join((e) => { const n = e.append('g').attr('class', 'pt'); n.append('circle').attr('class', 'handle'); n.append('text'); return n; });
    if (pt) glyph(dot, `tone-${tn}`, pt, name);
  });
  fx(gMed, show.medians);
  fx(gAlt, show.altitudes);

  // sides opposite A, B, C; a side with a twin of (nearly) equal length gets one tick
  const sides = [[B, C], [C, A], [A, B]];
  const L = sides.map(([p, q]) => dist(p, q));
  gTick.selectAll('path').data(sides.map((s, i) => ({ id: i, s, on: [0, 1, 2].some((j) => j !== i && Math.abs(L[i] - L[j]) < 3) })), (d) => d.id)
    .join('path').attr('class', 'curve').attr('stroke-width', 1.5)
    .style('display', (d) => (d.on ? null : 'none'))
    .attr('d', ({ s: [p, q] }) => {
      const m = mid(p, q), k = dist(p, q) || 1, n = [-(q[1] - p[1]) / k, (q[0] - p[0]) / k];
      return line([[m[0] - n[0] * 6, m[1] - n[1] * 6], [m[0] + n[0] * 6, m[1] + n[1] * 6]]);
    });

  // angle marks: A uses rays to C and B, and so on round the triangle
  gAng.selectAll('g.ang').data([[C, A, B], [A, B, C], [B, C, A]].map((t, i) => ({ id: i, t })), (d) => d.id)
    .join((e) => {
      const g = e.append('g').attr('class', 'ang tone-accent');
      g.append('path').attr('class', 'area wedge');
      g.append('path').attr('class', 'curve mark').attr('stroke-width', 1.5);
      g.append('text').attr('class', 'math tone-accent').attr('font-size', 14).attr('text-anchor', 'middle').attr('dy', '.35em');
      return g;
    })
    .each(function (d) { angleMark(d3.select(this), ...d.t); });

  edge.attr('d', line(pts) + 'Z');
  gLab.selectAll('text').data(['A', 'B', 'C'].map((n, i) => ({ n, i })), (d) => d.i).join('text')
    .attr('class', 'math').attr('font-style', 'italic').attr('font-size', 15).attr('text-anchor', 'middle').attr('dy', '.35em')
    .each(function (d) {
      // nudge each name 16px away from the centre so it sits outside its corner
      const p = pts[d.i], c = d3.polygonCentroid(pts), k = dist(p, c) || 1;
      d3.select(this).attr('x', p[0] + ((p[0] - c[0]) / k) * 16).attr('y', p[1] + ((p[1] - c[1]) / k) * 16).text(d.n);
    });
  handles.forEach((h, i) => {
    h.attr('transform', `translate(${pts[i]})`);
    h.select('.halo-ring').style('display', touched ? 'none' : null);
  });

  const angles = [angleAt(C, A, B), angleAt(A, B, C), angleAt(B, C, A)].map((r) => (r * 180) / Math.PI);
  formula.innerHTML = `A + B + C = ${angles.map((x) => x.toFixed(1) + '°').join(' + ')} = <b>${d3.sum(angles).toFixed(1)}°</b>`;
}

// keep corners 28px inside the frame; snap to a 5px grid so right angles and equal sides are reachable by hand
const snap = (v, max) => Math.round(kit.clamp(v, 28, max - 28) / 5) * 5;
handles.forEach((h) => h.call(kit.draggable(([x, y], i) => {
  touched = true;
  pts = pts.map((q, j) => (j === i ? [snap(x, W), snap(y, H)] : q));
  draw();
}, { step: 5 })));

fig.add(kit.row(
  kit.toggle({ label: 'Circumcircle', value: show.circum, onInput: (v) => { show.circum = v; draw(); } }),
  kit.toggle({ label: 'Incircle', value: show.incircle, onInput: (v) => { show.incircle = v; draw(); } }),
  kit.toggle({ label: 'Medians', value: show.medians, onInput: (v) => { show.medians = v; draw(); } }),
  kit.toggle({ label: 'Altitudes', value: show.altitudes, onInput: (v) => { show.altitudes = v; draw(); } }),
));
fig.add(formula);
draw();
return fig.el;
