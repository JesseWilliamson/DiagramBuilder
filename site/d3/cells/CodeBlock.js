// Code inside the diagram. The numbered code is drawn as SVG text (not HTML
// beside the figure), so a dashed arrow can run from the highlighted line to the
// array cell it is talking about, and the whole thing exports as one SVG.
//
// The d3 ideas:
//  - Keys decide what moves. There is ONE highlight band, so the data join gives
//    it a single key and stepping slides it from line to line instead of fading
//    one out and another in. The lo / hi pointers are keyed by name and slide too.
//  - The arrow is a d3.line() through five waypoints. It always has five points,
//    so a transition on its `d` attribute morphs it smoothly to the new target.
//  - No text measuring: monospace text has a fixed character width, so the code
//    block's size is just characters x width.

const nums = [2, 5, 8, 12, 16, 23, 38, 56, 72];
const target = 23;
const source = `def find(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`;
const lines = source.split('\n');

// The algorithm is a generator; `lines` is the 1-based range of code to highlight.
function* run() {
  let lo = 0, hi = nums.length - 1;
  yield { lo, hi, mid: -1, lines: [2, 2], msg: 'Start with the whole array.' };
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    yield { lo, hi, mid, lines: [4, 4], msg: `mid = ${mid}, nums[mid] = ${nums[mid]}` };
    if (nums[mid] === target) {
      yield { lo, hi, mid, lines: [5, 6], msg: `Found ${target} at index ${mid}` };
      return;
    }
    if (nums[mid] < target) {
      yield { lo, hi, mid, lines: [7, 8], msg: `${nums[mid]} < ${target}: go right` };
      lo = mid + 1;
    } else {
      yield { lo, hi, mid, lines: [9, 10], msg: `${nums[mid]} > ${target}: go left` };
      hi = mid - 1;
    }
  }
}

// ── geometry ────────────────────────────────────────────────────────────────
const FS = 13, CHAR = FS * 0.6, LH = Math.round(FS * 1.6), PAD = 10;
const GUTTER = String(lines.length).length * CHAR + 14;
const codeW = GUTTER + d3.max(lines, (l) => l.length) * CHAR + 2 * PAD;
const codeH = lines.length * LH + 2 * PAD;
const lineY = (n) => PAD + (n - 1) * LH + LH / 2; // n is 1-based
const CELL = 40, STEP = CELL + 6;
const AX = codeW + 60, AY = 70; // where the array starts
const cx = (i) => AX + i * STEP + CELL / 2;
const W = AX + nums.length * STEP - 6, H = 215;

const fig = kit.figure(W, H, { pad: 16 });
const { svg } = fig;
const mk = kit.markers(svg);

// ── the code block: background, band, numbers, lines ────────────────────────
const code = svg.append('g');
code.append('rect').attr('class', 'panel').attr('width', codeW).attr('height', codeH).attr('rx', 8);
const band = code.append('rect').attr('x', 2).attr('width', codeW - 4).attr('rx', 4)
  .style('fill', 'color-mix(in srgb, var(--active-fill) 45%, transparent)');
const codeText = (cls) => code.selectAll(`text.${cls}`).data(lines.map((l, i) => ({ l, n: i + 1 }))).join('text')
  .attr('class', `mono ${cls}`).attr('y', (d) => lineY(d.n)).attr('dy', '.35em').style('font-size', FS + 'px').style('font-weight', 400);
codeText('num').attr('x', PAD + GUTTER - 12).attr('text-anchor', 'end').style('fill', 'var(--muted)').text((d) => d.n);
// SVG collapses runs of spaces; no-break spaces keep the indentation.
codeText('src').attr('x', PAD + GUTTER).text((d) => d.l.replace(/ /g, ' '));

// ── array + pointers + arrow ────────────────────────────────────────────────
const arr = svg.append('g');
const link = svg.append('path').attr('class', 'line dashed tone-active').attr('marker-end', mk('arrow'))
  .style('opacity', 0).style('stroke-width', 1.5);
const pointers = svg.append('g');
const status = svg.append('text').attr('class', 'value').attr('x', AX).attr('y', 205).style('font-size', 14 + 'px');
const route = d3.line();

function draw(f) {
  // one band, one key: it slides
  const [a, b] = f.lines;
  kit.tr(band, 400).attr('y', lineY(a) - LH / 2).attr('height', (b - a + 1) * LH);

  const tone = (i) => (i === f.mid ? 'active' : i < f.lo || i > f.hi ? 'muted' : null);
  arr.selectAll('g.cell').data(nums.map((v, i) => ({ v, i })), (d) => d.i).join((enter) => {
    const g = enter.append('g').attr('class', 'cell').attr('transform', (d) => `translate(${cx(d.i) - CELL / 2},${AY})`);
    g.append('rect').attr('width', CELL).attr('height', CELL).attr('rx', 6);
    g.append('text').attr('class', 'value').attr('x', CELL / 2).attr('y', CELL / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', 16 + 'px').text((d) => d.v);
    g.append('text').attr('class', 'muted').attr('x', CELL / 2).attr('y', CELL + 14).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', 12 + 'px').text((d) => d.i);
    return g;
  }).select('rect').attr('class', (d) => kit.cls('solid', kit.tone(tone(d.i))));

  // pointers keyed by name; at lo == hi the hi label sits one step further out
  const ps = [
    { id: 'lo', i: Math.min(f.lo, nums.length - 1), level: 0 },
    { id: 'hi', i: Math.max(f.hi, 0), level: f.hi === f.lo ? 1 : 0 },
  ];
  const place = (d) => `translate(${cx(d.i)},${AY + CELL + 4})`;
  pointers.selectAll('g.ptr').data(ps, (d) => d.id).join((enter) => {
    const g = enter.append('g').attr('class', 'ptr tone-accent').attr('transform', place);
    g.append('line').attr('class', 'line').attr('marker-end', mk('arrow')).attr('y1', 26).attr('y2', 0).style('stroke-width', 2);
    g.append('text').attr('class', 'mono tone-accent').attr('text-anchor', 'middle').attr('dy', '.35em').style('font-size', 13 + 'px').text((d) => d.id);
    return g;
  }).call((g) => {
    g.select('text').attr('y', (d) => 26 + 13 + d.level * 18);
    kit.tr(g, 350).attr('transform', place);
  });

  // the dashed arrow: code line -> right of the block -> up -> across -> down into the cell
  if (f.mid >= 0) {
    const y0 = lineY(a);
    const pts = [[codeW, y0], [codeW + 30, y0], [codeW + 30, 30], [cx(f.mid), 30], [cx(f.mid), AY]];
    if (link.style('opacity') === '0') link.attr('d', route(pts)); // first appearance: no morph from nothing
    kit.tr(link, 400).attr('d', route(pts)).style('opacity', 1);
  } else kit.tr(link, 250).style('opacity', 0);

  // the status text: a new sentence replaces the old one
  status.text(f.msg);
}

const player = kit.player([...run()], { interval: 1400, onFrame: draw, invalidation });
fig.add(kit.transport(player));
return fig.el;
