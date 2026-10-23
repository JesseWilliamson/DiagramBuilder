// Zones are dashed boundaries around groups of components: here a server, and a sandbox
// inside it. The point of drawing them is to ask, for every arrow, what is allowed
// across. Switch between "what goes in" and "what comes out" to light up the files that
// cross the sandbox wall; the expected answers (green) never do.
//
// The d3 ideas: a zone is not drawn by hand, it is DERIVED from the components it holds:
// d3.min / d3.max over their boxes give its rectangle, and a zone that holds another zone
// grows around that zone's box, so nested zones never overlap (that is why they are
// measured inside-out). Move a component in `parts` and its zones follow. Switching
// the view only changes the data's `tone`; the keyed join updates the same elements, and
// the stylesheet's transition fades the colours.
//
// Components and links use small hand-written helpers at the top (d3 has no system-diagram module).

// ── a small architecture toolkit (d3 has no system-diagram module, so this is hand-written) ──
// Components are <g> elements centred on (x, y); their shapes are drawn around (0, 0), so
// moving a component is just changing its transform. Fill/outline come from the kit's
// tone variables: a tone class on the <g> (--cf, --co) recolours every shape inside it,
// and an untoned component gets its kind's colour through the same two variables.
const SIZE = {
  client: [96, 60], user: [60, 64], lb: [124, 44], gateway: [124, 48], service: [120, 52],
  cache: [110, 50], db: [100, 68], queue: [124, 46], cdn: [124, 64], storage: [100, 60], file: [96, 56],
};
const KIND_TONE = { lb: 'accent', gateway: 'accent', cache: 'orange', db: 'success', queue: 'visited', cdn: 'active', storage: 'active' };
const kindFill = (kind) => (KIND_TONE[kind] ? `color-mix(in srgb, var(--${KIND_TONE[kind]}-fill) ${kind === 'cache' ? 100 : 45}%, var(--surface))` : 'var(--surface)');
const kindOutline = (kind) => (KIND_TONE[kind] ? `var(--${KIND_TONE[kind]}-outline)` : 'var(--outline)');

const frame = (c) => ({ x: c.x, y: c.y, w: c.w ?? SIZE[c.kind][0], h: c.h ?? SIZE[c.kind][1] });
const textWidth = (s, size) => s.length * size * 0.6; // no text measuring in a headless DOM, so estimate
// the box a component occupies, a user's label (which hangs below the figure) included
function footprint(c) {
  const f = frame(c), w = c.kind === 'user' ? Math.max(f.w, textWidth(c.label, 13)) : f.w;
  return { x0: f.x - w / 2, y0: f.y - f.h / 2, x1: f.x + w / 2, y1: f.y + f.h / 2 + (c.kind === 'user' ? 22 : 0) };
}
// where the ray from a box's centre towards a point leaves the box
function rectEdge(f, [tx, ty]) {
  const dx = tx - f.x, dy = ty - f.y;
  const t = Math.min(dx ? f.w / 2 / Math.abs(dx) : Infinity, dy ? f.h / 2 / Math.abs(dy) : Infinity);
  return [f.x + dx * t, f.y + dy * t];
}

// The silhouette of each kind, in coordinates around the centre. `detail` shapes are
// open lines drawn on top (a database's rim, a monitor's stand).
function shapes(kind, w, h) {
  const l = -w / 2, r = w / 2, t = -h / 2, b = h / 2;
  switch (kind) {
    case 'db': { // a cylinder from two elliptical arcs (SVG path "A" commands)
      const e = 9;
      return [
        { tag: 'path', d: `M${l},${t + e}A${w / 2},${e} 0 0 1 ${r},${t + e}V${b - e}A${w / 2},${e} 0 0 1 ${l},${b - e}Z` },
        { tag: 'path', detail: true, d: `M${l},${t + e}A${w / 2},${e} 0 0 0 ${r},${t + e}` },
      ];
    }
    case 'queue': // a box with message slots at the back
      return [{ tag: 'rect', x: l, y: t, width: w, height: h, rx: 6 }, ...[0, 1, 2].map((i) => ({ tag: 'path', detail: true, d: `M${r - 14 - i * 12},${t + 8}V${b - 8}` }))];
    case 'lb':
      return [{ tag: 'rect', x: l, y: t, width: w, height: h, rx: h / 2 }];
    case 'gateway':
      return [{ tag: 'path', d: `M${l + 14},${t}H${r - 14}L${r},0L${r - 14},${b}H${l + 14}L${l},0Z` }];
    case 'cdn': { // a cloud: a smooth closed curve through a few points
      const pts = [[-0.46, 0.38], [-0.5, 0.05], [-0.36, -0.18], [-0.18, -0.46], [0.08, -0.48], [0.24, -0.26], [0.42, -0.22], [0.5, 0.1], [0.44, 0.38], [0, 0.42]];
      return [{ tag: 'path', d: d3.line().curve(d3.curveCatmullRomClosed)(pts.map(([x, y]) => [x * w, y * h])) }];
    }
    case 'file': // a page with its top-right corner folded down
      return [
        { tag: 'path', d: `M${l},${t}H${r - 12}L${r},${t + 12}V${b}H${l}Z` },
        { tag: 'path', detail: true, d: `M${r - 12},${t}V${t + 12}H${r}` },
      ];
    case 'storage':
      return [{ tag: 'path', d: `M${l},${t}H${r}L${r - 10},${b}H${l + 10}Z` }, { tag: 'path', detail: true, d: `M${l + 4},${t + 8}H${r - 4}` }];
    case 'client': { // a monitor: screen, then stand
      const sh = h - 14;
      return [{ tag: 'rect', x: l, y: t, width: w, height: sh, rx: 5 }, { tag: 'path', detail: true, d: `M-14,${b}H14M0,${b}V${t + sh}` }];
    }
    case 'user':
      return [{ tag: 'circle', cx: 0, cy: t + 10, r: 9 }, { tag: 'path', d: `M-18,${b - 4}A18,22 0 0 1 18,${b - 4}`, open: true }];
    default:
      return [{ tag: 'rect', x: l, y: t, width: w, height: h, rx: 8 }];
  }
}

// Draw components with a keyed join. Shapes are built once on enter; tone, opacity and
// the caption are re-applied on every call, so calling it again is how you "update".
function drawComponents(layer, comps, { onClick } = {}) {
  return layer.selectAll('g.comp').data(comps, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'comp').attr('transform', (d) => `translate(${d.x},${d.y})`);
    g.each(function (c) {
      const f = frame(c), n = d3.select(this);
      for (const { tag, detail, open, ...attrs } of shapes(c.kind, f.w, f.h)) {
        const s = n.append(tag).attr('class', detail || open ? 'detail' : 'solid');
        if (detail || open) s.style('fill', 'none').style('stroke', 'var(--co, var(--outline))').style('stroke-width', '2px');
        for (const [k, v] of Object.entries(attrs)) s.attr(k, v);
      }
      // label position follows the silhouette: on the screen of a client, under the user figure
      const cy = c.kind === 'client' ? -7 : c.kind === 'db' ? 5 : c.kind === 'user' ? f.h / 2 + 12 : 0;
      const dy = c.sub && c.kind !== 'user' ? -6 : 0;
      n.append('text').attr('class', 'value label').attr('text-anchor', 'middle').attr('dy', '.35em').attr('y', cy + dy);
      n.append('text').attr('class', 'muted sub').attr('text-anchor', 'middle').attr('dy', '.35em').style('font-size', '10.5px').style('font-weight', 500).attr('y', cy + dy + 14);
    });
    return g;
  }).call((g) => {
    g.attr('class', (d) => kit.cls('comp', kit.tone(d.tone), onClick && 'click'))
      .style('--cf', (d) => (d.tone ? null : kindFill(d.kind)))
      .style('--co', (d) => (d.tone ? null : kindOutline(d.kind)))
      .style('opacity', (d) => d.opacity ?? 1);
    g.select('.label').text((d) => d.label);
    g.select('.sub').text((d) => d.sub ?? '')
      .style('fill', (d) => (d.tone ? 'var(--fg)' : null)).style('fill-opacity', (d) => (d.tone ? 0.72 : null));
  });
}
// Links: a straight line between the two boxes' edges, arrowhead from the kit's markers.
// `both` puts a head at each end. The route is kept so packets can travel along it.
const routeOf = (l, F) => {
  const A = F(l.from), B = F(l.to);
  return [rectEdge(A, [B.x, B.y]), rectEdge(B, [A.x, A.y])];
};
function drawLinks(layer, links, F, mk) {
  return layer.selectAll('g.link').data(links.map((l) => ({ ...l, id: `${l.from}-${l.to}`, pts: routeOf(l, F) })), (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'link');
    g.append('path').attr('marker-end', mk('arrow')).attr('marker-start', (d) => (d.both ? mk('arrow') : null));
    g.append('text').attr('class', 'halo').style('font-size', '12px').style('font-weight', 600).attr('text-anchor', 'middle').attr('dy', '.35em');
    return g;
  }).call((g) => {
    g.select('path').attr('class', (d) => kit.cls('line', d.dashed && 'dashed', kit.tone(d.tone))).attr('d', (d) => d3.line()(d.pts));
    g.select('text').text((d) => d.label ?? '').attr('class', (d) => kit.cls('halo', kit.tone(d.tone)))
      .attr('x', (d) => (d.pts[0][0] + d.pts[1][0]) / 2).attr('y', (d) => (d.pts[0][1] + d.pts[1][1]) / 2);
  });
}

// A polyline measured by length. d3.scaleLinear with more than two domain values is
// "polylinear": it interpolates piece by piece. So a scale from distance-along to x, and
// another to y, is all we need to ask "where am I t of the way along this route?".
// (Not getPointAtLength: that needs a real browser layout, and this runs headless too.)
function polyline(pts) {
  const cum = [0, ...d3.cumsum(pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])))];
  const total = cum.at(-1);
  const X = d3.scaleLinear(cum, pts.map((p) => p[0])), Y = d3.scaleLinear(cum, pts.map((p) => p[1]));
  const at = (t) => [X(t * total), Y(t * total)];
  // the same route, cut short at fraction t
  at.upTo = (t) => [...pts.filter((_, i) => cum[i] < t * total), at(t)];
  return at;
}

const parts = [
  { id: 'api', kind: 'service', label: 'API', sub: 'owns the problem', x: 0, y: 90 },
  { id: 'answers', kind: 'file', label: 'answers', sub: 'expected', x: 0, y: 300 },
  { id: 'compare', kind: 'service', label: 'compare', x: 400, y: 300 },
  { id: 'input', kind: 'file', label: 'input.json', x: 230, y: 30 },
  { id: 'code', kind: 'file', label: 'solution.py', x: 230, y: 150 },
  { id: 'run', kind: 'service', label: 'driver', x: 400, y: 90 },
  { id: 'output', kind: 'file', label: 'output.json', x: 560, y: 90 },
];
const links = [
  { from: 'api', to: 'input' },
  { from: 'api', to: 'code' },
  { from: 'input', to: 'run' },
  { from: 'code', to: 'run' },
  { from: 'run', to: 'output' },
  { from: 'output', to: 'compare', dashed: true, label: 'read back' },
  { from: 'answers', to: 'compare' },
];
// List an outer zone before the zones inside it.
const zones = [
  { id: 'server', label: 'server', around: parts.map((p) => p.id) },
  { id: 'sandbox', label: 'sandbox', around: ['input', 'code', 'run', 'output'], tone: 'danger' },
];

// ── zone boxes, inside-out ──────────────────────────────────────────────────
const PAD = 18, LABEL = 18; // space around the contents, and a strip on top for the zone's name
const byId = new Map(parts.map((p) => [p.id, p]));
const boxOf = new Map();
for (const z of [...zones].reverse()) {
  const inner = z.around.map((id) => footprint(byId.get(id)));
  // zones already measured whose components are all inside this one
  for (const other of zones) {
    const b = boxOf.get(other.id);
    if (b && other !== z && other.around.every((id) => z.around.includes(id))) inner.push(b);
  }
  boxOf.set(z.id, { x0: d3.min(inner, (b) => b.x0) - PAD, y0: d3.min(inner, (b) => b.y0) - PAD - LABEL, x1: d3.max(inner, (b) => b.x1) + PAD, y1: d3.max(inner, (b) => b.y1) + PAD });
}
const zoneData = zones.map((z) => ({ ...z, ...boxOf.get(z.id) }));

const M = 24, outer = boxOf.get('server');
const W = outer.x1 - outer.x0 + 2 * M, H = outer.y1 - outer.y0 + 2 * M;
const F = (id) => frame(byId.get(id));

const fig = kit.figure(W, H);
const { svg } = fig;
const mk = kit.markers(svg);
const root = svg.append('g').attr('transform', `translate(${M - outer.x0},${M - outer.y0})`);
const zoneLayer = root.append('g'), linkLayer = root.append('g'), compLayer = root.append('g');

// Zones are drawn first so they sit under everything they hold.
zoneLayer.selectAll('g.zone').data(zoneData, (d) => d.id).join((enter) => {
  const g = enter.append('g').attr('class', (d) => kit.cls('zone', kit.tone(d.tone)));
  g.append('rect').attr('class', 'dashed').attr('x', (d) => d.x0).attr('y', (d) => d.y0).attr('width', (d) => d.x1 - d.x0).attr('height', (d) => d.y1 - d.y0).attr('rx', 10)
    .style('stroke-width', '1.5px').style('stroke', 'var(--c, var(--muted))')
    .style('fill', (d) => `color-mix(in srgb, var(--cf, var(--muted-fill)) ${d.tone ? 14 : 55}%, transparent)`);
  g.append('text').attr('class', (d) => kit.cls('muted', kit.tone(d.tone))).attr('x', (d) => d.x0 + 12).attr('y', (d) => d.y0 + 15)
    .style('font-size', '11.5px').style('font-weight', 600).style('letter-spacing', '.03em').text((d) => d.label);
  return g;
});

let show = 'in';
function draw() {
  const lit = show === 'in' ? ['input', 'code'] : ['output', 'compare'];
  drawLinks(linkLayer, links, F, mk);
  drawComponents(compLayer, parts.map((p) => ({ ...p, tone: lit.includes(p.id) ? 'active' : p.id === 'answers' ? 'success' : undefined })));
  status.set(show === 'in'
    ? 'Into the sandbox: the arguments and the code. The expected answers stay outside, so code that reads its own directory finds nothing to copy.'
    : 'Out of the sandbox: whatever the code returned. The comparison happens back on the server.');
}

const status = kit.status();
fig.add(status);
fig.add(kit.segmented({ value: show, options: [{ value: 'in', label: 'What goes in' }, { value: 'out', label: 'What comes out' }], onInput: (v) => { show = v; draw(); } }));
draw();
return fig.el;
