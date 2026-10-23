// Consistent hashing. Keys and servers are hashed onto a ring; a key belongs to the
// first server point clockwise from it. Add or remove a server and count how many keys
// change owner (circled in red), then compare with plain `hash(key) % N`, where most
// keys move. Virtual nodes put each server on the ring several times, which evens out
// the load.
//
// The d3 ideas: a ring is just polar coordinates. One scaleLinear maps a hash in [0, 1)
// to an angle, d3.pointRadial turns (angle, radius) into x, y, and d3.arc draws each
// server's stretch of the ring as a wedge. d3.bisector finds "the first server point at
// or after this key" in the sorted list. When a server is added its arcs change size:
// an attrTween on `d` interpolates the two angles (not the path string), so wedges slide
// instead of snapping. Everything is keyed, so persistent keys/servers stay put.

// FNV-1a, then MurmurHash3's finaliser, scaled to [0, 1) = a position on the ring.
// Plain FNV-1a barely changes its HIGH bits between 'user:1' and 'user:2', so without
// the finaliser similar keys bunch together on the ring. The finaliser mixes every
// input bit into every output bit ("avalanche").
const hash = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
};

const ALL = ['A', 'B', 'C', 'D', 'E', 'F'];
const toneOf = d3.scaleOrdinal(ALL, ['accent', 'success', 'orange', 'visited', 'danger', 'active']);
const KEYS = d3.range(30).map((i) => `user:${i}`).map((id) => ({ id, t: hash(id) }));
const R = 130;
const angle = d3.scaleLinear([0, 1], [0, 2 * Math.PI]); // ring position -> radians, clockwise from 12 o'clock
const onRing = (t, r = R) => d3.pointRadial(angle(t), r);
const arc = d3.arc().innerRadius(R - 1.75).outerRadius(R + 1.75);

// Where each server sits on the ring: once, or `copies` times with virtual nodes.
const pointsOf = (servers, copies) =>
  servers.flatMap((server) => d3.range(copies).map((v) => ({ server, v, id: `${server}#${v}`, t: hash(v ? `cache-${server}#${v}` : `cache-${server}`) })))
    .sort((a, b) => a.t - b.t);

function owners(servers, mode, copies) {
  const pts = pointsOf(servers, copies);
  const after = d3.bisector((p) => p.t).left; // index of the first point at or after t
  return Object.fromEntries(KEYS.map((k) => [k.id,
    mode === 'mod'
      ? servers[Math.floor(k.t * 2 ** 32) % servers.length]
      : pts[after(pts, k.t) % pts.length].server, // % wraps past the last point back to the first
  ]));
}

// ── state ───────────────────────────────────────────────────────────────────
let servers = ['A', 'B', 'C'], mode = 'ring', vnodes = false;
let moved = new Set(), last = null;

const fig = kit.figure(400, 400);
const { svg } = fig;
const root = svg.append('g').attr('transform', 'translate(200,200)');
root.append('circle').attr('r', R).attr('class', 'line muted');
const arcLayer = root.append('g'), keyLayer = root.append('g'), serverLayer = root.append('g');

function draw() {
  const copies = vnodes ? 3 : 1;
  const own = owners(servers, mode, copies);
  const pts = pointsOf(servers, copies);

  // Ring mode: each point's arc runs from the previous point up to itself, coloured by its server.
  // Angles can pass 2π (an arc that crosses 12 o'clock); d3.arc is fine with that.
  const arcs = mode !== 'ring' ? [] : pts.map((p, i) => {
    const t0 = pts[(i - 1 + pts.length) % pts.length].t;
    const span = (p.t - t0 + 1) % 1 || 1;
    return { id: `arc:${p.id}`, tone: toneOf(p.server), a0: angle(t0), a1: angle(t0 + span) };
  });
  arcLayer.selectAll('path').data(arcs, (d) => d.id).join(
    (enter) => enter.append('path').attr('d', (d) => arc({ startAngle: d.a0, endAngle: d.a0 })), // a new arc grows from nothing
    (update) => update,
    (exit) => kit.tr(exit, 250).style('opacity', 0).remove(),
  ).attr('class', (d) => kit.cls('fill-ink', kit.tone(d.tone)))
    .call((a) => kit.tr(a).attrTween('d', function (d) {
      const from = this._angles ?? { a0: d.a0, a1: d.a0 }; // remember where this arc was last time
      const i = d3.interpolate(from, { a0: d.a0, a1: d.a1 });
      this._angles = { a0: d.a0, a1: d.a1 };
      return (t) => { const { a0, a1 } = i(t); return arc({ startAngle: a0, endAngle: a1 }); };
    }));

  // keys: one dot each, coloured by owner. Same key, same position: only the colour changes.
  keyLayer.selectAll('g.key').data(KEYS, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'key').attr('transform', (d) => `translate(${onRing(d.t)})`);
    g.append('circle').attr('class', 'moved line tone-danger').attr('r', 10).style('stroke-width', '2px').style('opacity', 0);
    g.append('circle').attr('class', 'handle').attr('r', 5).style('transition', 'fill .4s');
    return g;
  }).call((g) => {
    g.select('.handle').attr('class', (d) => kit.cls('handle', kit.tone(toneOf(own[d.id]))));
    kit.tr(g.select('.moved'), 300).style('opacity', (d) => (moved.has(d.id) ? 1 : 0));
  });

  // servers: a tick through the ring and a labelled square outside it
  serverLayer.selectAll('g.srv').data(pts, (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'srv').style('opacity', 0).attr('transform', (d) => `translate(${onRing(d.t, R + 30)})`);
      g.append('line').attr('class', 'axis').style('stroke-width', '2px')
        .each(function (d) { // the tick, in the square's own coordinates: from 38 inside the centre to 14
          const [x1, y1] = d3.pointRadial(angle(d.t), -38), [x2, y2] = d3.pointRadial(angle(d.t), -14);
          d3.select(this).attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2);
        });
      g.append('rect').attr('x', -13).attr('y', -11).attr('width', 26).attr('height', 22).attr('rx', 5);
      g.append('text').attr('class', 'value').attr('text-anchor', 'middle').attr('dy', '.35em').style('font-size', '12.5px').text((d) => d.server);
      return g;
    },
    (update) => update,
    (exit) => kit.tr(exit, 250).style('opacity', 0).remove(),
  ).call((g) => {
    g.select('rect').attr('class', (d) => kit.cls('solid', kit.tone(toneOf(d.server))));
    kit.tr(g, 400).style('opacity', 1);
  });

  // text under the figure
  const n = servers.length;
  status.replaceChildren(...(last
    ? [`You ${last}: `, kit.el('b', {}, `${moved.size} of ${KEYS.length}`), ` keys changed server (circled). ${mode === 'ring' ? `About 1/${n} of them is the least possible.` : 'With % N, most keys move.'}`]
    : ['Each dot is a key, coloured by the server that stores it. Add or remove a server.']));
  numbers.set(servers.map((s) => [s, `${d3.sum(KEYS, (k) => +(own[k.id] === s))} keys`]));
  [...numbers.children].forEach((span, i) => { span.className = kit.tone(toneOf(servers[i])); span.style.color = 'var(--c)'; });
  add.disabled = n >= ALL.length;
  remove.disabled = n <= 2;
}

// Change the server list and remember which keys moved: compare owners before and after.
function change(next, what) {
  const copies = vnodes ? 3 : 1;
  const before = owners(servers, mode, copies), after = owners(next, mode, copies);
  moved = new Set(KEYS.filter((k) => after[k.id] !== before[k.id]).map((k) => k.id));
  last = what;
  servers = next;
  draw();
}
const reset = () => { moved = new Set(); last = null; };

const status = kit.status();
const numbers = kit.stats();
const add = kit.button('Add server', () => change([...servers, ALL.find((s) => !servers.includes(s))], 'added a server'));
const remove = kit.button('Remove server', () => change(servers.slice(0, -1), 'removed a server'));
fig.add(kit.row(
  add, remove,
  kit.segmented({ value: mode, options: [{ value: 'ring', label: 'Hash ring' }, { value: 'mod', label: 'hash % N' }], onInput: (m) => { mode = m; reset(); draw(); } }),
  kit.toggle({ label: 'Virtual nodes', value: vnodes, onInput: (v) => { vnodes = v; reset(); draw(); } }),
));
fig.add(status);
fig.add(numbers);
draw();
return fig.el;
