// One request through a web stack, hop by hop, with a running latency total.
// Step through it, or press play; switch between a cache hit and a cache miss and
// compare the totals.
//
// The d3 ideas: the packet is ONE element that never gets replaced; each step starts a
// transition whose tween (attrTween) walks it along the link, which is how you animate
// along a route when the motion is not a straight line between two values. The route is
// measured with a polylinear d3.scaleLinear (see `polyline`). The components and links
// use a keyed join, so stepping only changes their tone, never rebuilds them.
//
// Components, links and the packet are drawn by small helpers at the top: d3 has
// no system-diagram module, so those are hand-written (a few SVG paths and one scale).

const parts = [
  { id: 'client', kind: 'client', label: 'Browser', x: 0, y: 140 },
  { id: 'lb', kind: 'lb', label: 'Load balancer', x: 190, y: 140 },
  { id: 'app', kind: 'service', label: 'App server', sub: 'x3', x: 380, y: 140 },
  { id: 'cache', kind: 'cache', label: 'Cache', sub: 'Redis', x: 580, y: 40 },
  { id: 'db', kind: 'db', label: 'Database', sub: 'Postgres', x: 580, y: 245 },
];
const links = [
  { from: 'client', to: 'lb', both: true },
  { from: 'lb', to: 'app', both: true },
  { from: 'app', to: 'cache', both: true },
  { from: 'app', to: 'db', both: true },
];

const hops = (hit) => [
  { from: 'client', to: 'lb', payload: 'GET /user/42', ms: 20, note: 'Over the internet to the load balancer: the slowest hop.' },
  { from: 'lb', to: 'app', payload: 'GET /user/42', ms: 1, note: 'The balancer picks one of the app servers.' },
  { from: 'app', to: 'cache', payload: 'GET user:42', ms: 1, note: 'Check the cache first: it lives in memory.' },
  ...(hit
    ? [{ from: 'cache', to: 'app', payload: '{ name: "Ada" }', ms: 1, note: 'Cache hit: the answer comes straight back. The database never sees this request.' }]
    : [
        { from: 'cache', to: 'app', payload: 'nil', ms: 1, note: 'Cache miss: nothing stored under that key.' },
        { from: 'app', to: 'db', payload: 'SELECT … id=42', ms: 2, note: 'So ask the database…' },
        { from: 'db', to: 'app', payload: 'row', ms: 15, note: '…which has to find the row, possibly on disk.' },
        { from: 'app', to: 'cache', payload: 'SET user:42', ms: 1, note: 'Store it in the cache so the next request is a hit.' },
      ]),
  { from: 'app', to: 'lb', payload: '200 OK', ms: 1, note: 'The response heads back out…' },
  { from: 'lb', to: 'client', payload: '200 OK', ms: 20, note: '…and over the internet again.' },
];
const total = (hit) => d3.sum(hops(hit), (h) => h.ms);

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

// ── layout: fit the drawing to its components, with 30px of margin ──────────
const boxes = parts.map(footprint);
const M = 30, x0 = d3.min(boxes, (b) => b.x0), y0 = d3.min(boxes, (b) => b.y0);
const W = d3.max(boxes, (b) => b.x1) - x0 + 2 * M, H = d3.max(boxes, (b) => b.y1) - y0 + 2 * M;
const F = (id) => frame(parts.find((p) => p.id === id));

const fig = kit.figure(W, H);
const { svg } = fig;
const mk = kit.markers(svg);
const root = svg.append('g').attr('transform', `translate(${M - x0},${M - y0})`);
const linkLayer = root.append('g'), compLayer = root.append('g');

// The packet: a dot and its caption in one <g>, positioned only by `transform`.
const packet = root.append('g').attr('class', 'tone-accent');
packet.append('circle').attr('class', 'handle').attr('r', 6);
const packetLabel = packet.append('text').attr('class', 'mono halo tone-accent').style('font-size', '10.5px').attr('text-anchor', 'middle').attr('y', -14);

// the link a hop travels on, as a polyline from `from` to `to` (links are stored one way)
const hopRoute = (h) => {
  const l = links.find((k) => (k.from === h.from && k.to === h.to) || (k.from === h.to && k.to === h.from));
  const pts = routeOf(l, F);
  return l.from === h.from ? pts : [...pts].reverse();
};

let mode = 'miss';
let path = hops(false);
let pos = polyline(routeOf(links[0], F))(0.04); // where the packet is right now (kept up to date by the tween)
packet.attr('transform', `translate(${pos})`);

function draw(i) {
  const hop = path[i];
  const on = (k) => !!hop && (hop.from === k || hop.to === k);
  drawComponents(compLayer, parts.map((p) => ({ ...p, tone: on(p.id) ? 'active' : undefined })));
  drawLinks(linkLayer, links.map((l) => ({ ...l, tone: hop && ((l.from === hop.from && l.to === hop.to) || (l.from === hop.to && l.to === hop.from)) ? 'active' : undefined })), F, mk);

  // Send the packet: from wherever it is, to the link's start, then along the link to
  // 92% of the way. The tween is called with t from 0 to 1 and returns the transform for that t.
  const route = hop ? [pos, ...polyline(hopRoute(hop)).upTo(0.92)] : [pos];
  const along = polyline(route.length > 1 ? route : [pos, pos]);
  packet.interrupt();
  kit.tr(packet, 700).attrTween('transform', () => (t) => `translate(${(pos = along(t))})`);
  packetLabel.text(hop?.payload ?? 'GET /user/42');

  status.set(hop ? hop.note : 'A request is about to leave the browser.');
  const elapsed = d3.sum(path.slice(0, i + 1), (h) => h.ms);
  numbers.set([['elapsed', `${elapsed} ms`], ['hit total', `${total(true)} ms`], ['miss total', `${total(false)} ms`]]);
}

const status = kit.status();
const numbers = kit.stats();
const frames = () => [-1, ...path.keys()]; // -1 = before the first hop
const player = kit.player(frames(), { interval: 1100, onFrame: draw, invalidation });
const picker = kit.segmented({
  value: mode, options: [{ value: 'hit', label: 'Cache hit' }, { value: 'miss', label: 'Cache miss' }],
  onInput: (m) => { mode = m; path = hops(m === 'hit'); player.pause(); player.replace(frames(), 0); },
});

fig.add(status);
fig.add(kit.transport(player));
fig.add(kit.el('div', { class: 'row spread' }, picker, numbers));
return fig.el;
