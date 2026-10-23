// A load balancer, simulated one tick at a time. S3 is twice as slow as the others:
// round robin keeps handing it work anyway, least connections notices the pile-up.
// Click a server (or focus it and press Enter) to take it down: its in-flight requests
// fail (red) until you bring it back.
//
// The d3 ideas: the simulation is plain data (an array of request objects), and the
// drawing is a keyed join on request id. A request that exists in both ticks is an
// "update", so its dot slides to the new place; a new request "enters" (fades in) and a
// finished one "exits" (fades out). d3.interval is the clock, d3.random* the dice.
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

const SERVERS = ['s1', 's2', 's3'];
const SLOW = { s1: 1, s2: 1, s3: 2 }; // S3 takes twice as long per request

const layout = (down, load, served) => [
  { id: 'clients', kind: 'user', label: 'Users', x: 0, y: 150 },
  { id: 'lb', kind: 'lb', label: 'Load balancer', x: 190, y: 150 },
  ...SERVERS.map((s, i) => ({
    id: s, kind: 'service', label: `S${i + 1}${SLOW[s] > 1 ? ' (slow)' : ''}`, x: 420, y: 40 + i * 110, w: 150, h: 72,
    sub: down.has(s) ? 'down' : `${load[s] ?? 0} active · ${served[s] ?? 0} done`,
    tone: down.has(s) ? 'danger' : undefined, opacity: down.has(s) ? 0.55 : 1,
  })),
];
const links = [{ from: 'clients', to: 'lb' }, ...SERVERS.map((s) => ({ from: 'lb', to: s }))];

// ── state ───────────────────────────────────────────────────────────────────
// A request moves through phases: new -> lb (at the balancer) -> srv (arriving at a
// server) -> work (being processed, `left` ticks to go), or 'failed' (shown for one tick).
let policy = 'rr', rate = 0.7, running = true;
let down = new Set(), reqs = [], served = {}, failed = 0;
let nextId = 0, rr = 0;

const isLoaded = (r) => r.phase === 'srv' || r.phase === 'work';
const loadOf = (s) => reqs.filter((r) => r.server === s && isLoaded(r)).length;

function choose() {
  const up = SERVERS.filter((s) => !down.has(s));
  if (!up.length) return undefined;
  if (policy === 'random') return up[d3.randomInt(up.length)()];
  if (policy === 'least') return d3.least(up, loadOf); // the server with the fewest active requests
  for (let k = 0; k < SERVERS.length; k++) { // round robin: the next server in turn that is up
    const s = SERVERS[rr++ % SERVERS.length];
    if (!down.has(s)) return s;
  }
}

// One simulation step: every request advances one phase.
function tick() {
  const out = [], done = {};
  let lost = 0;
  for (const r of reqs) {
    if (r.phase === 'failed') continue; // shown red for one tick, now gone
    if (r.server && down.has(r.server)) { out.push({ ...r, phase: 'failed' }); lost++; continue; }
    if (r.phase === 'new') out.push({ ...r, phase: 'lb' });
    else if (r.phase === 'lb') {
      const s = choose();
      if (s) out.push({ ...r, phase: 'srv', server: s, left: d3.randomInt(2, 6)() * SLOW[s] });
      else (out.push({ ...r, phase: 'failed' }), lost++);
    } else if (r.phase === 'srv') out.push({ ...r, phase: 'work' });
    else if (r.left > 1) out.push({ ...r, left: r.left - 1 });
    else done[r.server] = (done[r.server] ?? 0) + 1;
  }
  if (d3.randomBernoulli(rate)()) out.push({ id: nextId++, phase: 'new', left: 0 });
  reqs = out;
  failed += lost;
  for (const s of SERVERS) served[s] = (served[s] ?? 0) + (done[s] ?? 0);
  draw();
}

// ── drawing ─────────────────────────────────────────────────────────────────
const comps0 = layout(down, {}, {});
const boxes = comps0.map(footprint);
const M = 24, x0 = d3.min(boxes, (b) => b.x0), y0 = d3.min(boxes, (b) => b.y0);
const W = d3.max(boxes, (b) => b.x1) - x0 + 2 * M, H = d3.max(boxes, (b) => b.y1) - y0 + 2 * M;
const F = (id) => frame(comps0.find((c) => c.id === id));
const route = (a, b) => polyline(routeOf({ from: a, to: b }, F));

const fig = kit.figure(W, H);
const { svg } = fig;
const mk = kit.markers(svg);
const root = svg.append('g').attr('transform', `translate(${M - x0},${M - y0})`);
const linkLayer = root.append('g'), compLayer = root.append('g'), dotLayer = root.append('g');

// Where each request is drawn this tick. `slot` counts the dots already inside a server,
// so they line up in a row along its bottom edge.
function place() {
  const slot = {};
  return reqs.map((r) => {
    let p = route('clients', 'lb')(0.1);
    if (r.phase === 'lb') p = route('clients', 'lb')(0.9);
    if (r.phase === 'srv') p = route('lb', r.server)(0.85);
    if ((r.phase === 'work' || r.phase === 'failed') && r.server) {
      const f = F(r.server), k = (slot[r.server] = (slot[r.server] ?? 0) + 1) - 1;
      p = [f.x - f.w / 2 + 14 + (k % 12) * 11, f.y + 24];
    }
    if (r.phase === 'failed' && !r.server) p = route('clients', 'lb')(0.9);
    return { id: r.id, p, r: r.phase === 'work' ? 4.5 : 6, tone: r.phase === 'failed' ? 'danger' : r.phase === 'work' ? 'success' : 'accent' };
  });
}

function draw() {
  const load = Object.fromEntries(SERVERS.map((s) => [s, loadOf(s)]));
  drawLinks(linkLayer, links, F, mk);
  drawComponents(compLayer, layout(down, load, served), { onClick: true })
    .filter((d) => SERVERS.includes(d.id))
    .on('mousedown', (e) => e.preventDefault()) // a mouse click shouldn't leave a focus ring; the keyboard still gets one
    .on('click', (e, d) => toggleServer(d.id))
    .on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleServer(d.id); } })
    .attr('tabindex', 0).attr('role', 'button').attr('aria-pressed', (d) => d.tone === 'danger');

  // The key is the request id: the same request next tick is the same <circle>, so it glides.
  dotLayer.selectAll('circle.packet').data(place(), (d) => d.id).join(
    (enter) => enter.append('circle').attr('class', 'handle packet').style('opacity', 0)
      .style('transition', 'fill .3s').attr('transform', (d) => `translate(${d.p})`).attr('r', (d) => d.r),
    (update) => update,
    (exit) => kit.tr(exit, 250).style('opacity', 0).remove(),
  ).call((c) => {
    c.attr('class', (d) => kit.cls('handle packet', kit.tone(d.tone)));
    kit.tr(c, 360).ease(d3.easeLinear).attr('transform', (d) => `translate(${d.p})`).attr('r', (d) => d.r).style('opacity', 1);
  });

  note.set(`Watch S3's queue under round robin, then switch to least connections. Click a server to take it down: ${failed} requests failed so far.`);
}

function toggleServer(id) {
  down = new Set(down);
  down.has(id) ? down.delete(id) : down.add(id);
  draw();
}

// ── controls ────────────────────────────────────────────────────────────────
const clock = d3.interval(tick, 520);
const setRunning = (on) => (on ? clock.restart(tick, 520) : clock.stop());
invalidation.then(() => clock.stop());

const note = kit.status();
fig.add(kit.el('div', { class: 'row spread' },
  kit.segmented({ value: policy, options: [{ value: 'rr', label: 'Round robin' }, { value: 'least', label: 'Least connections' }, { value: 'random', label: 'Random' }], onInput: (v) => (policy = v) }),
  kit.toggle({ label: 'Running', value: running, onInput: (v) => (running = v, setRunning(v)) }),
));
fig.add(kit.row(
  kit.slider({ label: 'Traffic', min: 0.1, max: 1, step: 0.05, value: rate, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => (rate = v) }),
  kit.button('Reset', () => { reqs = []; served = {}; failed = 0; draw(); }),
));
fig.add(note);
draw();
return fig.el;
