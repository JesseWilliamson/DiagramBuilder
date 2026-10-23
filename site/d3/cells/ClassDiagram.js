// A class diagram you can rearrange. Drag the boxes; click one to see only its
// relationships. Positions live in the data (`c.x`, `c.y`), so the lines
// re-route as you drag: draw() is a pure function of that data.
//
// The d3 ideas: two keyed data joins (one for the classes, one for the
// relations) and a nested join per class for its member lines; d3.drag moves a
// datum, not an element; every change goes through kit.tr, with a duration of 0
// while dragging so the box follows the pointer exactly.
//
// What d3 does NOT have, so it is hand-written here and labelled:
//   - classSize(): box size from the text (no measuring: 0.6 em per character)
//   - elbow():     the right-angled connector between two boxes
// Both are short. A diagram library is mostly this kind of geometry.

const start = [
  { id: 'Shape', name: 'Shape', stereotype: 'interface', x: 250, y: 50, methods: ['+ area(): number', '+ perimeter(): number'] },
  { id: 'Circle', name: 'Circle', x: 70, y: 250, attributes: ['- r: number'], methods: ['+ area(): number'] },
  { id: 'Rectangle', name: 'Rectangle', x: 270, y: 250, attributes: ['# w: number', '# h: number'], methods: ['+ area(): number'] },
  { id: 'Square', name: 'Square', x: 270, y: 420, methods: ['+ setSide(s): void'] },
  { id: 'Drawing', name: 'Drawing', x: 530, y: 50, attributes: ['- shapes: Shape[]'], methods: ['+ add(s: Shape): void', '+ render(r: Renderer)'] },
  { id: 'Renderer', name: 'Renderer', stereotype: 'interface', x: 530, y: 250, methods: ['+ draw(s: Shape): void'] },
  { id: 'SvgRenderer', name: 'SvgRenderer', x: 530, y: 420, methods: ['+ draw(s: Shape): void'] },
];
const classes = start.map((c) => ({ ...c })); // the mutable copy: dragging writes x and y here

const relations = [
  { from: 'Circle', to: 'Shape', kind: 'implements' },
  { from: 'Rectangle', to: 'Shape', kind: 'implements' },
  { from: 'Square', to: 'Rectangle', kind: 'inherits' },
  { from: 'Drawing', to: 'Shape', kind: 'composition', fromLabel: '1', toLabel: '*' },
  { from: 'Drawing', to: 'Renderer', kind: 'dependency' },
  { from: 'SvgRenderer', to: 'Renderer', kind: 'implements' },
].map((r) => ({ ...r, key: `${r.from}-${r.kind}-${r.to}` }));

// kind -> line style and which kit marker sits at which end (see UmlArrows)
const STYLE = {
  inherits: { dashed: false, end: 'tri' },
  implements: { dashed: true, end: 'tri' },
  composition: { dashed: false, start: 'diaf' },
  aggregation: { dashed: false, start: 'dia' },
  association: { dashed: false, end: 'open' },
  dependency: { dashed: true, end: 'open' },
};
// each kind, read out loud
const say = {
  inherits: (a, b) => `${a} is a ${b}`,
  implements: (a, b) => `${a} implements ${b}`,
  composition: (a, b) => `${a} owns its ${b}s`,
  aggregation: (a, b) => `${a} has ${b}s`,
  association: (a, b) => `${a} knows a ${b}`,
  dependency: (a, b) => `${a} uses ${b}`,
};

// ── helper 1: box size from text (hand-written; d3 has no text layout) ──────
const NAME = 14, MEMBER = 12, ROW = 18, PAD = 10, STEREO = 11;
const textW = (s, size) => s.length * size * 0.6;
let collapsed = false;
function classSize(c) {
  const members = collapsed ? [] : [...(c.attributes ?? []), ...(c.methods ?? [])];
  const w = Math.max(110, Math.ceil(Math.max(textW(c.name, NAME) * 0.95, c.stereotype ? textW(`«${c.stereotype}»`, STEREO) : 0, ...members.map((m) => textW(m, MEMBER))) + 2 * PAD));
  const head = (c.stereotype ? STEREO + 4 : 0) + NAME + 16;
  const body = collapsed ? 0 : ((c.attributes?.length ?? 0) + (c.methods?.length ?? 0)) * ROW + 16;
  return { w, h: head + body, head };
}
// everything inside a box, relative to its centre: name, stereotype, divider lines, member lines
function innards(c) {
  const { w, h, head } = classSize(c);
  const top = -h / 2, left = -w / 2;
  const out = [];
  if (c.stereotype) out.push({ key: 'stereo', kind: 'stereo', y: top + 8 + STEREO / 2, text: `«${c.stereotype}»` });
  out.push({ key: 'name', kind: 'name', y: top + 8 + (c.stereotype ? STEREO + 4 : 0) + NAME / 2 + 1, text: c.name });
  if (collapsed) return out;
  const na = c.attributes?.length ?? 0, nm = c.methods?.length ?? 0;
  const attrTop = top + head, methTop = attrTop + 8 + na * ROW + 4;
  out.push({ key: 'div1', kind: 'div', y: attrTop, x0: left, x1: -left });
  (c.attributes ?? []).forEach((t, i) => out.push({ key: `a${i}`, kind: 'member', x: left + PAD, y: attrTop + 8 + i * ROW + ROW / 2, text: t }));
  if (nm) out.push({ key: 'div2', kind: 'div', y: methTop, x0: left, x1: -left });
  (c.methods ?? []).forEach((t, i) => out.push({ key: `m${i}`, kind: 'member', x: left + PAD, y: methTop + 4 + i * ROW + ROW / 2, text: t }));
  return out;
}

// ── helper 2: the elbow connector (hand-written; d3 has no connectors) ──────
// Leave through the sides that face each other. Mostly-vertical pairs (a class and
// its parent) go top/bottom, so inheritance trees read top-down. Returns the corner points.
function elbow(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dy) * 1.2 >= Math.abs(dx)) {
    const s = Math.sign(dy) || 1;
    const p = [a.x, a.y + (s * a.h) / 2], q = [b.x, b.y - (s * b.h) / 2];
    if (Math.abs(p[0] - q[0]) < 1) return [p, q];
    const my = (p[1] + q[1]) / 2;
    return [p, [p[0], my], [q[0], my], q];
  }
  const s = Math.sign(dx) || 1;
  const p = [a.x + (s * a.w) / 2, a.y], q = [b.x - (s * b.w) / 2, b.y];
  if (Math.abs(p[1] - q[1]) < 1) return [p, q];
  const mx = (p[0] + q[0]) / 2;
  return [p, [mx, p[1]], [mx, q[1]], q];
}
// a multiplicity label sits a little way in from the end, a bit off the line
function endLabelAt(tip, from) {
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]) || 1;
  const dir = [(tip[0] - from[0]) / len, (tip[1] - from[1]) / len]; // pointing out of the line
  return [tip[0] - dir[0] * 20 + -dir[1] * 11, tip[1] - dir[1] * 20 + dir[0] * 11];
}

// ── the camera: one fixed view with 40px of room around the starting layout ──
const frames0 = start.map((c) => ({ ...c, ...classSize(c) }));
const X0 = d3.min(frames0, (f) => f.x - f.w / 2) - 40, X1 = d3.max(frames0, (f) => f.x + f.w / 2) + 40;
const Y0 = d3.min(frames0, (f) => f.y - f.h / 2) - 40, Y1 = d3.max(frames0, (f) => f.y + f.h / 2) + 40;

const fig = kit.figure(X1 - X0, Y1 - Y0);
const { svg } = fig;
const mk = kit.markers(svg, 'class-diagram');
const root = svg.append('g').attr('transform', `translate(${-X0},${-Y0})`);
const lineLayer = root.append('g'); // relations underneath the boxes
const boxLayer = root.append('g');
const line = d3.line();

let sel = null;

function draw(ms = 450) {
  const frame = new Map(classes.map((c) => [c.id, { x: c.x, y: c.y, ...classSize(c) }]));
  const related = (r) => r.from === sel || r.to === sel;
  const near = new Set(relations.filter(related).flatMap((r) => [r.from, r.to]));
  const dim = (id) => (sel && !near.has(id) ? 0.3 : 1);

  // relations: keyed by "from-kind-to". Each gets a line plus up to two multiplicity labels.
  lineLayer.selectAll('g.rel').data(relations, (r) => r.key).join((enter) => {
    const g = enter.append('g').attr('class', 'rel');
    g.append('path').attr('marker-start', (r) => (STYLE[r.kind].start ? mk(STYLE[r.kind].start) : null)).attr('marker-end', (r) => (STYLE[r.kind].end ? mk(STYLE[r.kind].end) : null));
    g.append('text').attr('class', 'mono muted from-label').style('font-size', '11px').attr('text-anchor', 'middle').attr('dy', '.35em');
    g.append('text').attr('class', 'mono muted to-label').style('font-size', '11px').attr('text-anchor', 'middle').attr('dy', '.35em');
    return g;
  }).each(function (r) {
    const pts = elbow(frame.get(r.from), frame.get(r.to));
    const g = d3.select(this);
    kit.tr(g, ms).style('opacity', sel && !related(r) ? 0.25 : 1);
    kit.tr(g.select('path'), ms).attr('d', line(pts));
    g.select('path').attr('class', kit.cls('line', STYLE[r.kind].dashed && 'dashed', sel && related(r) && 'tone-active'));
    const put = (cls, text, tip, from) => {
      const [x, y] = endLabelAt(tip, from);
      kit.tr(g.select(cls), ms).attr('x', x).attr('y', y);
      g.select(cls).text(text ?? '');
    };
    put('.from-label', r.fromLabel, pts[0], pts[1]);
    put('.to-label', r.toLabel, pts.at(-1), pts.at(-2));
  });

  // classes: keyed by id, so a box keeps its element (and its place in a transition) while it moves
  const box = boxLayer.selectAll('g.cls').data(classes, (c) => c.id).join((enter) => {
    const g = enter.append('g').attr('class', 'cls click').attr('transform', (c) => `translate(${c.x},${c.y})`);
    g.append('rect').attr('class', 'solid').attr('rx', 6);
    g.append('g').attr('class', 'inside');
    return g;
  });
  box.each(function (c) {
    const g = d3.select(this), { w, h } = frame.get(c.id);
    kit.tr(g, ms).attr('transform', `translate(${c.x},${c.y})`).style('opacity', dim(c.id));
    kit.tr(g.select('rect'), ms).attr('x', -w / 2).attr('y', -h / 2).attr('width', w).attr('height', h);
    // the pale tint of the tone (55% mixed into the surface) is how UML cards look here
    g.select('rect').attr('class', kit.cls('solid', c.id === sel && 'tone-active'))
      .style('fill', c.id === sel ? 'color-mix(in srgb, var(--cf) 55%, var(--surface))' : null);
    // nested joins: the name, stereotype, member lines and divider lines of THIS class.
    // Turning "Members" off exits the member and divider rows; the name moves up.
    const parts = innards(c), inside = g.select('.inside');
    inside.selectAll('text.part').data(parts.filter((p) => p.kind !== 'div'), (p) => p.key).join(
      (enter) => enter.append('text').attr('class', (p) => kit.cls('part', p.kind === 'member' && 'mono', p.kind === 'stereo' && 'muted'))
        .attr('dy', '.35em').attr('text-anchor', (p) => (p.kind === 'member' ? 'start' : 'middle'))
        .attr('x', (p) => p.x ?? 0).attr('y', (p) => p.y).style('opacity', 0)
        .style('font-size', (p) => `${{ name: NAME, stereo: STEREO, member: MEMBER }[p.kind]}px`)
        .style('font-weight', (p) => ({ name: 700, stereo: 400, member: 400 })[p.kind]).style('font-style', (p) => (p.kind === 'stereo' ? 'italic' : null))
        .text((p) => p.text),
      (update) => update,
      (exit) => kit.tr(exit, ms).style('opacity', 0).remove(),
    ).each(function (p) { kit.tr(d3.select(this), ms).style('opacity', 1).attr('x', p.x ?? 0).attr('y', p.y); });
    inside.selectAll('line.part').data(parts.filter((p) => p.kind === 'div'), (p) => p.key).join(
      (enter) => enter.append('line').attr('class', 'part').style('stroke', 'var(--outline)').style('stroke-width', '2px').style('opacity', 0)
        .attr('x1', (p) => p.x0).attr('x2', (p) => p.x1).attr('y1', (p) => p.y).attr('y2', (p) => p.y),
      (update) => update,
      (exit) => kit.tr(exit, ms).style('opacity', 0).remove(),
    ).each(function (p) { kit.tr(d3.select(this), ms).style('opacity', 1).attr('x1', p.x0).attr('x2', p.x1).attr('y1', p.y).attr('y2', p.y); });
  });

  status.set(sel ? relations.filter(related).map((r) => say[r.kind](r.from, r.to)).join(' · ') : 'Click a class to see its relationships. Drag to rearrange.');
}

// ── interaction ─────────────────────────────────────────────────────────────
// kit.draggable gives the pointer in the group's own coordinates (`space: root`)
// and arrow keys as a virtual pointer. A real drag reports where the pointer is,
// not where the box is, so remember the offset from the first move; a key press
// reports the new position directly.
let grab = null;
const clampX = (c, x) => kit.clamp(x, X0 + classSize(c).w / 2, X1 - classSize(c).w / 2);
const clampY = (c, y) => kit.clamp(y, Y0 + classSize(c).h / 2, Y1 - classSize(c).h / 2);
const status = kit.status();
draw(0);
boxLayer.selectAll('g.cls')
  .on('click', (event, c) => { sel = sel === c.id ? null : c.id; draw(); })
  .call(kit.draggable((pt, c, event) => {
    if (event.type !== 'keydown') grab ??= [pt[0] - c.x, pt[1] - c.y];
    const [ox, oy] = event.type === 'keydown' ? [0, 0] : grab;
    c.x = Math.round(clampX(c, pt[0] - ox));
    c.y = Math.round(clampY(c, pt[1] - oy));
    draw(0);
  }, { space: root.node(), onStart: () => { grab = null; } }));

const membersToggle = kit.toggle({ label: 'Members', value: true, onInput: (v) => { collapsed = !v; draw(350); } });
status.set('Click a class to see its relationships. Drag to rearrange.');
fig.add(status);
fig.add(kit.row(membersToggle));
return fig.el;
