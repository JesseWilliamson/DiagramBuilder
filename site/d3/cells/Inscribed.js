// The inscribed angle theorem: wherever P sits on the circle, ∠APB is half the arc AB
// that P is NOT on. Drag P (and A, B) around the circle. Make AB a diameter and you
// get Thales: 90°, and the angle mark turns into a square.
//
// The d3 ideas: every point is stored as an angle t on the circle, so the pointer
// is converted with Math.atan2 and the circle does the rest. d3.arc draws the pale
// wedge at the centre, d3.path draws the highlighted arc and the angle mark.
// Both treat angles as clockwise from 12 o'clock, so we add π/2 to screen angles.

const O = [220, 155], R = 115, TAU = 2 * Math.PI;
const on = (t, r = R) => [O[0] + r * Math.cos(t), O[1] + r * Math.sin(t)];
const norm = (t) => ((t % TAU) + TAU) % TAU;
const deg = (r) => (r * 180) / Math.PI;

let t = { A: 2.6, B: 0.45, P: 4.6 };
let touched = false;

const fig = kit.figure(320, 290);
const { svg } = fig;
svg.attr('viewBox', [60, 10, 320, 290]); // the circle is centred at (220, 155), not at the origin
svg.style('align-self', 'center');

svg.append('circle').attr('class', 'line muted').attr('stroke-width', 2).attr('cx', O[0]).attr('cy', O[1]).attr('r', R);
const central = svg.append('path').attr('class', 'area tone-visited').attr('transform', `translate(${O})`);
const arcPath = svg.append('path').attr('class', 'curve tone-visited').attr('stroke-width', 3);
const OA = svg.append('line').attr('class', 'line tone-visited').attr('stroke-width', 1.25).attr('x1', O[0]).attr('y1', O[1]);
const OB = svg.append('line').attr('class', 'line tone-visited').attr('stroke-width', 1.25).attr('x1', O[0]).attr('y1', O[1]);
const PA = svg.append('line').attr('class', 'line tone-accent').attr('stroke-width', 1.75);
const PB = svg.append('line').attr('class', 'line tone-accent').attr('stroke-width', 1.75);
const angG = svg.append('g').attr('class', 'tone-accent');
const angWedge = angG.append('path').attr('class', 'area');
const angMark = angG.append('path').attr('class', 'curve').attr('stroke-width', 1.5);
const angText = angG.append('text').attr('class', 'math tone-accent').attr('font-size', 14).attr('text-anchor', 'middle').attr('dy', '.35em');
svg.append('circle').attr('class', 'handle').attr('cx', O[0]).attr('cy', O[1]).attr('r', 4.5);
svg.append('text').attr('class', 'math').attr('font-style', 'italic').attr('font-size', 14).attr('x', O[0] - 16).attr('y', O[1] - 10).attr('text-anchor', 'middle').text('O');

// three draggable points, each with a label pushed 18px out from the centre.
// kit.handle puts the translate() on the draggable group itself, which is what keyboard dragging reads.
const names = ['A', 'B', 'P'];
const tone = (k) => (k === 'P' ? 'accent' : 'visited');
const labels = svg.append('g').selectAll('text').data(names).join('text')
  .attr('class', (k) => `math ${kit.tone(tone(k))}`).attr('font-style', 'italic').attr('font-size', 14).attr('text-anchor', 'middle').attr('dy', '.35em').text((k) => k);
const dots = names.map((k) => kit.handle(svg, { r: 4.5, hint: k === 'P', tone: tone(k) }).datum(k));

const wedge = d3.arc().innerRadius(0);
const formula = kit.status();
formula.style.fontFamily = 'var(--math)';
const hint = kit.status("Slide P anywhere on the far side: the angle doesn't change. Make AB a diameter and you get Thales: 90°.");
hint.style.color = 'var(--muted)';

function draw() {
  const A = on(t.A), B = on(t.B), P = on(t.P);

  // The arc from A clockwise to B either contains P or it doesn't. We want the one that doesn't.
  const sweep = norm(t.B - t.A);
  const containsP = norm(t.P - t.A) < sweep;
  const [from, arc] = containsP ? [t.B, TAU - sweep] : [t.A, sweep];

  central.attr('d', wedge.outerRadius(30)({ startAngle: from + Math.PI / 2, endAngle: from + arc + Math.PI / 2 }));
  const ap = d3.path();
  ap.moveTo(...on(from));
  ap.arc(O[0], O[1], R, from, from + arc);
  arcPath.attr('d', ap.toString());
  OA.attr('x2', A[0]).attr('y2', A[1]);
  OB.attr('x2', B[0]).attr('y2', B[1]);
  PA.attr('x1', P[0]).attr('y1', P[1]).attr('x2', A[0]).attr('y2', A[1]);
  PB.attr('x1', P[0]).attr('y1', P[1]).attr('x2', B[0]).attr('y2', B[1]);

  // the angle mark at P: wedge + arc (a square at exactly 90°) + degree label
  const r = 26;
  const a0 = Math.atan2(A[1] - P[1], A[0] - P[0]);
  let d = Math.atan2(B[1] - P[1], B[0] - P[0]) - a0;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  const a1 = a0 + d;
  const inscribed = Math.abs(deg(d));
  angG.attr('transform', `translate(${P})`);
  angWedge.attr('d', wedge.outerRadius(r)({ startAngle: a0 + Math.PI / 2, endAngle: a1 + Math.PI / 2 }));
  const mp = d3.path();
  if (Math.abs(inscribed - 90) < 0.5) {
    const s = r * 0.7, u = [Math.cos(a0) * s, Math.sin(a0) * s], v = [Math.cos(a1) * s, Math.sin(a1) * s];
    mp.moveTo(...u); mp.lineTo(u[0] + v[0], u[1] + v[1]); mp.lineTo(...v);
  } else {
    mp.moveTo(Math.cos(a0) * r, Math.sin(a0) * r);
    mp.arc(0, 0, r, a0, a1, d < 0);
  }
  angMark.attr('d', mp.toString());
  angText.attr('x', (r + 12) * Math.cos((a0 + a1) / 2)).attr('y', (r + 12) * Math.sin((a0 + a1) / 2)).text(`${Math.round(inscribed)}°`);

  dots.forEach((h, i) => h.attr('transform', `translate(${on(t[names[i]])})`).select('.halo-ring').style('display', touched ? 'none' : null));
  labels.attr('x', (k) => on(t[k])[0] + ((on(t[k])[0] - O[0]) / R) * 18).attr('y', (k) => on(t[k])[1] + ((on(t[k])[1] - O[1]) / R) * 18);

  formula.innerHTML = `<span class="tone-accent" style="color:var(--c)">∠<i>APB</i> = ${inscribed.toFixed(1)}°</span> = ½ × <span class="tone-visited" style="color:var(--c)">arc <i>AB</i> = ${deg(arc).toFixed(1)}°</span>`;
}

// Dragging: the pointer's direction from the centre is the new angle; its distance is ignored,
// so the point is always pulled back onto the circle.
dots.forEach((h) => h.call(kit.draggable(([x, y], k) => { touched = true; t = { ...t, [k]: Math.atan2(y - O[1], x - O[0]) }; draw(); })));

fig.add(formula);
fig.add(hint);
draw();
return fig.el;
