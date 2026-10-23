// Pointer arithmetic. `p + k` doesn't add k bytes: it adds k × sizeof(*p).
// Switch the element type and watch the same 24 bytes regroup: 24 chars, 6 ints or
// 3 doubles. Click a cell (or use the slider) to move `p + k`.
//
// The d3 ideas: the groups are a keyed join on "e0, e1, e2…". Going from int to
// double, e0..e2 keep their element and *grow* (a transition on width), while
// e3..e5 exit: that is the "same bytes, new grouping" animation. The pointers are
// keyed "p" and "pk", so they slide when k changes. And the numbers shown in the
// cells come out of a real ArrayBuffer through a DataView, so "an int is 4 bytes,
// a double is 8" is literally what the code does.

const BASE = 0x7ffc1000, BYTES = 24, BW = 18, Y0 = 40, H = 34;
const types = {
  char: { size: 1, write: (dv, i) => dv.setUint8(i, 97 + i), read: (dv, i) => `'${String.fromCharCode(dv.getUint8(i))}'` },
  int: { size: 4, write: (dv, i) => dv.setInt32(i * 4, (i + 1) * 10, true), read: (dv, i) => String(dv.getInt32(i * 4, true)) },
  double: { size: 8, write: (dv, i) => dv.setFloat64(i * 8, i + 1.5, true), read: (dv, i) => dv.getFloat64(i * 8, true).toFixed(1) },
};

// One buffer of 24 bytes. For each type we store its values with set*, and show them with get*.
const buffer = new DataView(new ArrayBuffer(BYTES));
const valuesFor = (type) => {
  const { size, write, read } = types[type];
  return d3.range(BYTES / size).map((i) => (write(buffer, i), read(buffer, i)));
};
const hex = (n) => '0x' + (n >>> 0).toString(16).padStart(4, '0').slice(-4); // the low 4 hex digits, like the strip shows

let type = 'int', k = 2;

const X = d3.scaleLinear([0, BYTES], [0, BYTES * BW]); // byte offset -> pixels

const fig = kit.figure(BYTES * BW, 96);
const { svg } = fig;
svg.attr('viewBox', [-16, -20, BYTES * BW + 32, 116]); // a little room left of byte 0 for the label of p
const mk = kit.markers(svg);

// the byte strip: a grey track with a tick at every byte boundary (never changes, drawn once)
svg.append('rect').attr('class', 'panel').attr('y', Y0).attr('width', X(BYTES)).attr('height', H).attr('rx', 3);
svg.append('path').attr('class', 'line').attr('stroke-width', 1)
  .attr('d', d3.range(1, BYTES).map((b) => `M${X(b)},${Y0 + H - 6}V${Y0 + H}`).join(''));

const groupL = svg.append('g'), addrL = svg.append('g'), ptrL = svg.append('g');

// tween a transform by interpolating the numbers in the string
const moveTo = (t, f) => t.attrTween('transform', function (d, i) { return d3.interpolateString(this.getAttribute('transform') ?? f(d, i), f(d, i)); });

function draw() {
  const { size } = types[type];
  const count = BYTES / size;
  const kk = Math.min(k, count); // k == count is "one past the end": a legal pointer you must not dereference
  const values = valuesFor(type);

  const groups = d3.range(count).map((i) => ({ key: `e${i}`, i, x: X(i * size + size / 2), w: X(size) - 2, v: values[i], label: size >= 4 ? `a[${i}]` : null, on: i === kk }));

  // The keyed join. Keys are 'e0', 'e1'…, so e0 is the same element whatever the type: it just gets wider.
  groupL.selectAll('g.grp').data(groups, (d) => d.key).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'grp').style('opacity', 0).attr('transform', (d) => `translate(${d.x},${Y0 + H / 2})`);
      g.append('rect').attr('class', 'solid click').attr('y', -(H - 4) / 2).attr('height', H - 4).attr('rx', 4)
        .attr('x', (d) => -d.w / 2).attr('width', (d) => d.w)
        .on('click', (event, d) => set(d.i));
      g.append('text').attr('class', 'value').attr('font-size', 12).attr('dy', '.35em').attr('text-anchor', 'middle');
      g.append('text').attr('class', 'muted').attr('font-size', 11).attr('y', -H / 2 - 10 - 0).attr('dy', '.35em').attr('text-anchor', 'middle');
      return g;
    },
    (update) => update,
    (exit) => kit.tr(exit.interrupt(), 250).style('opacity', 0).remove(),
  ).call((g) => {
    g.attr('class', (d) => kit.cls('grp', kit.tone(d.on ? 'active' : null)));
    g.select('.value').text((d) => d.v).attr('class', (d) => kit.cls('value', kit.tone(d.on ? 'active' : null)));
    g.select('.muted').text((d) => d.label ?? '');
    moveTo(kit.tr(g, 400).style('opacity', 1), (d) => `translate(${d.x},${Y0 + H / 2})`);
    kit.tr(g.select('rect'), 400).attr('x', (d) => -d.w / 2).attr('width', (d) => d.w);
  });

  // addresses under the start of each group. One char is 18px wide, narrower than an address,
  // so show only as many as fit.
  const every = Math.max(1, Math.ceil(34 / X(size)));
  addrL.selectAll('text').data(groups.filter((d) => d.i % every === 0), (d) => d.key).join(
    (enter) => enter.append('text').attr('class', 'muted').attr('font-size', 9).attr('y', Y0 + H + 12).attr('dy', '.35em').style('opacity', 0),
    (update) => update,
    (exit) => kit.tr(exit.interrupt(), 250).style('opacity', 0).remove(),
  ).text((d) => hex(BASE + d.i * size)).call((t) => kit.tr(t, 400).style('opacity', 1).attr('x', (d) => X(d.i * size)));

  // pointers: p is always at byte 0; p + k sits on the k-th element (or past the end).
  // Wide elements have a label above them, so their arrow stops 14px higher.
  const target = kk < count ? X(kk * size + size / 2) : X(BYTES);
  const pts = [
    { id: 'p', x: 0, tip: Y0 - 16, label: 'p', tone: 'accent' },
    kk > 0 && { id: 'pk', x: target, tip: Y0 - (size >= 4 ? 14 : 0) - 4, label: `p + ${kk}`, tone: 'active' },
  ].filter(Boolean);
  const at = (d) => `translate(${d.x},${d.tip})`;
  ptrL.selectAll('g.ptr').data(pts, (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'ptr').style('opacity', 0).attr('transform', at);
      g.append('line').attr('y1', -14).attr('y2', 0).attr('marker-end', mk('arrow'));
      g.append('text').attr('y', -14 - 13).attr('dy', '.35em').attr('text-anchor', 'middle');
      return g;
    },
    (update) => update,
    (exit) => kit.tr(exit.interrupt(), 250).style('opacity', 0).remove(),
  ).call((g) => {
    g.select('line').attr('class', (d) => `line tone-${d.tone}`).attr('stroke-width', 2);
    g.select('text').attr('class', (d) => `mono tone-${d.tone}`).text((d) => d.label);
    moveTo(kit.tr(g, 400).style('opacity', 1), at);
  });

  slider.set(kk);
  const addr = BASE + kk * size;
  status.innerHTML = `<code>${type} *p</code>: p + ${kk} = 0x${BASE.toString(16)} + ${kk} × ${size} = <b class="tone-active" style="color:var(--c)">0x${addr.toString(16)}</b>` +
    (kk < count ? `, and <code>*(p + ${kk})</code> = <b>${values[kk]}</b>` : ', one past the end: fine to compute, never dereference.');
}

const set = (v) => { k = v; draw(); };

const status = kit.status();
const slider = kit.slider({ label: 'k', min: 0, max: BYTES / types[type].size, value: k, format: (v) => `p + ${v}`, onInput: set });
const sliderInput = slider.querySelector('input');
const typeCtl = kit.segmented({
  options: Object.keys(types), value: type,
  onInput: (t) => { type = t; k = Math.min(k, BYTES / types[t].size); sliderInput.max = BYTES / types[t].size; draw(); },
});

fig.add(kit.row(kit.el('label', { class: 'ctl' }, 'Type', typeCtl), slider));
fig.add(status);
draw();
return fig.el;
