// Two events as regions of a sample space. Drag a circle by its centre dot; click regions to
// shade them. P(region) is its area as a fraction of the rectangle U.
//
// The d3 ideas: a region like "A only" is not a circle, it is bounded by arcs of BOTH circles.
// d3.path() has an arc() method that appends circular arcs to a path, so each region is built
// by walking its boundary arc by arc (the lens: A's arc inside B, then B's arc inside A).
// The intersection maths (where the circles cross, how big the lens is) is hand-written:
// d3 has no circle-circle intersection. Everything else is plain d3: a keyed join of three
// region paths, d3.drag (through kit.draggable) for the two centre dots, d3.format for the numbers.

const U = [0, 0, 440, 250]; // x, y, width, height of the universe rectangle
const TOTAL = U[2] * U[3];
const TAU = 2 * Math.PI;

let A = { x: 170, y: 130, r: 85 };
let B = { x: 275, y: 125, r: 72 };
let sel = new Set(['both']);
let touched = false;

// ── geometry (hand-written) ────────────────────────────────────────────────
// Returns the three region outlines as SVG path strings.
function regionPaths(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  // a full circle as a subpath (d3.path methods return nothing, so return p ourselves)
  const disc = (c, p) => (p.moveTo(c.x + c.r, c.y), p.arc(c.x, c.y, c.r, 0, TAU), p.closePath(), p);
  if (d >= a.r + b.r) return { aOnly: disc(a, d3.path()) + '', bOnly: disc(b, d3.path()) + '', both: '' }; // apart
  if (d <= Math.abs(a.r - b.r)) {
    // one inside the other: the lens is the small disc, the big one's "only" part is a ring.
    // Two subpaths in one path + fill-rule: evenodd gives the ring.
    const aBig = a.r > b.r, p = d3.path();
    disc(a, p); disc(b, p);
    const lens = disc(aBig ? b : a, d3.path()) + '';
    return aBig ? { aOnly: p + '', bOnly: '', both: lens } : { aOnly: '', bOnly: p + '', both: lens };
  }
  const phi = Math.atan2(b.y - a.y, b.x - a.x); // direction A → B
  const psi = phi + Math.PI;                    // direction B → A
  // law of cosines: half-angle of each circle's arc that lies inside the other circle
  const alpha = Math.acos((a.r * a.r + d * d - b.r * b.r) / (2 * a.r * d));
  const beta = Math.acos((b.r * b.r + d * d - a.r * a.r) / (2 * b.r * d));
  // The three outlines. arc(x, y, r, from, to, counterclockwise?). d3.path draws a line from the
  // current point to the start of each arc; since consecutive arcs share a crossing point, that line has zero length.
  const both = d3.path();
  both.arc(a.x, a.y, a.r, phi - alpha, phi + alpha); both.arc(b.x, b.y, b.r, psi - beta, psi + beta); both.closePath();
  const aOnly = d3.path();
  aOnly.arc(a.x, a.y, a.r, phi + alpha, phi - alpha + TAU); aOnly.arc(b.x, b.y, b.r, psi + beta, psi - beta, true); aOnly.closePath(); // B's arc walked backwards
  const bOnly = d3.path();
  bOnly.arc(b.x, b.y, b.r, psi + beta, psi - beta + TAU); bOnly.arc(a.x, a.y, a.r, phi + alpha, phi - alpha, true); bOnly.closePath();
  return { aOnly: aOnly + '', bOnly: bOnly + '', both: both + '' };
}

// Area of the lens (two circular segments minus a kite), then A only = A − lens and so on.
function areas(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const area = (c) => Math.PI * c.r * c.r;
  let both;
  if (d >= a.r + b.r) both = 0;
  else if (d <= Math.abs(a.r - b.r)) both = Math.PI * Math.min(a.r, b.r) ** 2;
  else {
    both = a.r * a.r * Math.acos((d * d + a.r * a.r - b.r * b.r) / (2 * d * a.r))
      + b.r * b.r * Math.acos((d * d + b.r * b.r - a.r * a.r) / (2 * d * b.r))
      - 0.5 * Math.sqrt((-d + a.r + b.r) * (d + a.r - b.r) * (d - a.r + b.r) * (d + a.r + b.r));
  }
  return { aOnly: area(a) - both, bOnly: area(b) - both, both };
}

// ── the figure ─────────────────────────────────────────────────────────────
const fig = kit.figure(U[2], U[3], { pad: 10 });
const { svg } = fig;
// small scoped style for the shaded regions (the kit has no class for "clickable shaded region")
fig.el.insertAdjacentHTML('afterbegin', `<style>
  .venn-region { fill: transparent; stroke: none; cursor: pointer; transition: fill .25s; }
  .venn-region.on { fill: var(--accent-fill); }
  .venn-region:hover { fill: color-mix(in srgb, var(--accent-fill) 60%, transparent); }
  .venn-region.on:hover { fill: var(--accent-fill); filter: brightness(.96); }
  .venn-u { fill: var(--surface); stroke: var(--fg); stroke-width: 1.5px; cursor: pointer; transition: fill .25s; }
  .venn-u.on { fill: var(--accent-fill); }
</style>`);

svg.append('rect').attr('class', 'venn-u').attr('x', U[0]).attr('y', U[1]).attr('width', U[2]).attr('height', U[3]).attr('rx', 8)
  .on('click', () => toggle('neither'));
svg.append('text').attr('class', 'math').attr('font-style', 'italic').attr('x', 12).attr('y', 14).attr('dy', '.35em').style('font-size', '13px').text('U');

// regions: a keyed join on the region name. The paths exist once; draw() only rewrites `d`.
const REGIONS = ['aOnly', 'both', 'bOnly'];
const regions = svg.append('g').selectAll('path').data(REGIONS, (d) => d).join('path')
  .attr('class', 'venn-region').attr('fill-rule', 'evenodd').on('click', (e, d) => toggle(d));

const circleA = svg.append('circle').attr('class', 'line').attr('pointer-events', 'none');
const circleB = svg.append('circle').attr('class', 'line').attr('pointer-events', 'none');
const labelA = svg.append('text').attr('class', 'math').attr('font-style', 'italic').attr('text-anchor', 'middle').style('font-size', '16px').text('A');
const labelB = svg.append('text').attr('class', 'math').attr('font-style', 'italic').attr('text-anchor', 'middle').style('font-size', '16px').text('B');

// a visible handle at each centre. Dragging maps the pointer straight to a new centre, kept inside U.
const handles = d3.selectAll(['a', 'b'].map((k) => kit.handle(svg, { hint: true }).datum(k).node()));
handles.call(kit.draggable(([x, y], d) => {
  touched = true;
  const c = d === 'a' ? A : B;
  const next = { ...c, x: kit.clamp(x, c.r, U[2] - c.r), y: kit.clamp(y, c.r, U[3] - c.r) };
  if (d === 'a') A = next; else B = next;
  draw();
}));

function toggle(r) { sel.has(r) ? sel.delete(r) : sel.add(r); draw(); }

// ── the readouts ───────────────────────────────────────────────────────────
const NAMES = {
  '': '∅', both: 'A \\cap B', aOnly: 'A − B', bOnly: 'B − A', neither: '(A \\cup B)^c',
  'aOnly,both': 'A', 'both,bOnly': 'B', 'aOnly,bOnly': 'A \\triangle B', 'aOnly,both,bOnly': 'A \\cup B',
  'aOnly,neither': 'B^c', 'bOnly,neither': 'A^c', 'both,neither': '(A \\triangle B)^c', 'aOnly,bOnly,neither': '(A \\cap B)^c',
  'aOnly,both,neither': 'A \\cup B^c', 'both,bOnly,neither': 'A^c \\cup B', 'aOnly,both,bOnly,neither': 'U',
};
const ORDER = ['aOnly', 'both', 'bOnly', 'neither'];
const PRESETS = [['both'], ['aOnly', 'both', 'bOnly'], ['aOnly'], ['aOnly', 'bOnly'], ['neither']];
// TeX-lite for HTML (kit.tex is for svg text): \cap \cup \triangle, ^c superscripts, italic letters
const SYM = { cap: '∩', cup: '∪', triangle: '△' };
function math(src) {
  const out = kit.el('span', { style: 'font-family: var(--math); font-size: 16px' });
  for (const [, cmd, sup, word] of src.matchAll(/\\(\w+)|\^(\w)|([^\\^]+)/g)) {
    if (cmd) out.append(SYM[cmd] ?? cmd);
    else if (sup) out.append(kit.el('sup', {}, sup));
    else out.append(...word.split(/([A-Za-z]+)/).map((s) => (/^[A-Za-z]+$/.test(s) && s !== 'U' ? kit.el('i', {}, s) : s)));
  }
  return out;
}
const f3 = d3.format('.3f');
const shaded = kit.el('p', { class: 'status', style: 'font-size: 16px' });
const readout = kit.el('div', { class: 'stats', style: 'font-size: 15px; color: var(--fg); font-family: var(--math)' });
const bold = (s, color) => kit.el('b', { style: `font-family: var(--math); font-weight: 600; ${color ? `color: var(--${color})` : ''}` }, s);

function draw() {
  const paths = regionPaths(A, B);
  regions.attr('d', (d) => paths[d]).style('display', (d) => (paths[d] ? null : 'none')).classed('on', (d) => sel.has(d));
  svg.select('.venn-u').classed('on', sel.has('neither'));
  circleA.attr('cx', A.x).attr('cy', A.y).attr('r', A.r);
  circleB.attr('cx', B.x).attr('cy', B.y).attr('r', B.r);
  // labels sit outside each circle, on the side away from the other one
  const dir = Math.atan2(B.y - A.y, B.x - A.x);
  labelA.attr('x', A.x + Math.cos(dir + Math.PI) * A.r * 0.72).attr('y', A.y - A.r * 0.82);
  labelB.attr('x', B.x + Math.cos(dir) * B.r * 0.72).attr('y', B.y - B.r * 0.82);
  handles.attr('transform', (d) => { const c = d === 'a' ? A : B; return `translate(${c.x},${c.y})`; });
  handles.select('.halo-ring').style('display', touched ? 'none' : null);

  // probabilities = areas / area of U
  const ar = areas(A, B);
  const P = { aOnly: ar.aOnly / TOTAL, bOnly: ar.bOnly / TOTAL, both: ar.both / TOTAL };
  P.neither = 1 - (P.aOnly + P.bOnly + P.both);
  const pA = P.aOnly + P.both, pB = P.bOnly + P.both;
  const key = ORDER.filter((r) => sel.has(r)).join(',');
  const independent = Math.abs(P.both - pA * pB) < 0.004; // P(A∩B) = P(A)P(B) is the definition of independence
  shaded.replaceChildren('Shaded: ', kit.el('span', { style: 'color: var(--accent)' }, math(NAMES[key] ?? key)), ', ', math('P ='), ' ', bold(f3(d3.sum([...sel], (r) => P[r]))));
  readout.replaceChildren(
    kit.el('span', {}, math('P(A) ='), ' ', bold(f3(pA))),
    kit.el('span', {}, math('P(B) ='), ' ', bold(f3(pB))),
    kit.el('span', {}, math('P(A \\cap B) ='), ' ', bold(f3(P.both))),
    kit.el('span', { style: independent ? 'color: var(--success)' : '' }, math('P(A) P(B) ='), ' ', bold(f3(pA * pB)), independent ? ' (independent!)' : ''),
  );
}

fig.add(kit.row(...PRESETS.map((rs) => kit.button('', () => { sel = new Set(rs); draw(); }))));
// button labels are maths, so fill them after creation
[...fig.el.querySelectorAll('.row button')].forEach((b, i) => b.replaceChildren(math(NAMES[PRESETS[i].join(',')])));
fig.add(shaded);
fig.add(readout);
draw();
return fig.el;
