// The algorithm is a generator: each `yield` is one step of the transport bar.
// Drawing is a function of one frame, so stepping is just "draw frame i".
//
// The d3 idea is the keyed data join. Every cell and pointer has an id; when
// the frame changes, d3 matches the new data to the existing elements by id,
// so the `lo` / `hi` / `mid` pointers *slide* to their new cell instead of
// being deleted and redrawn.

const nums = [-9, -4, -1, 0, 3, 5, 8, 9, 12, 17, 21, 30];
const code = [
  'lo, hi = 0, len(nums) - 1',
  'while lo <= hi:',
  '    mid = lo + (hi - lo) // 2',
  '    if nums[mid] == target: return mid',
  '    if nums[mid] < target: lo = mid + 1',
  '    else:                  hi = mid - 1',
  'return -1',
];

function* binarySearch(a, target) {
  let lo = 0, hi = a.length - 1;
  yield { lo, hi, mid: -1, line: 0, found: false, msg: `Looking for ${target} in ${a.length} sorted values.` };
  while (lo <= hi) {
    yield { lo, hi, mid: -1, line: 1, found: false, msg: `The answer, if it exists, is somewhere in ${lo}..${hi}.` };
    const mid = lo + Math.floor((hi - lo) / 2);
    yield { lo, hi, mid, line: 2, found: false, msg: `Look in the middle: nums[${mid}] = ${a[mid]}.` };
    if (a[mid] === target) {
      yield { lo, hi, mid, line: 3, found: true, msg: `${a[mid]} is the target: return ${mid}.` };
      return;
    }
    if (a[mid] < target) {
      yield { lo, hi, mid, line: 4, found: false, msg: `${a[mid]} < ${target}, so everything up to index ${mid} is too small.` };
      lo = mid + 1;
    } else {
      yield { lo, hi, mid, line: 5, found: false, msg: `${a[mid]} > ${target}, so everything from index ${mid} on is too big.` };
      hi = mid - 1;
    }
  }
  yield { lo, hi, mid: -1, line: 6, found: false, msg: `lo > hi: the interval is empty, ${target} isn't here.` };
}

const CELL = 36, GAP = 8, STEP = CELL + GAP;
const W = nums.length * STEP - GAP, H = 132;
const cx = (i) => i * STEP + CELL / 2;

const fig = kit.figure(W, H, { pad: 6 });
const { svg } = fig;
const cells = svg.append('g').attr('transform', 'translate(0,36)');
const window_ = cells.insert('rect', ':first-child').attr('class', 'band').attr('y', -6).attr('height', CELL + 12).attr('rx', 6);
const marks = svg.append('g'); // pointers live above/below the cells
const mk = kit.markers(svg); // arrowheads: marker-end = mk('arrow')

function draw(f) {
  const live = f.lo <= f.hi;

  // the yellow window around lo..hi
  kit.tr(window_, 350).style('opacity', live ? 1 : 0)
    .attr('x', live ? f.lo * STEP - 4 : 0).attr('width', live ? (f.hi - f.lo + 1) * STEP - GAP + 8 : 0);

  // cells: keyed by index. Nothing moves; only the tone changes (the fill fades via a CSS transition).
  const tone = (i) => (i === f.mid ? (f.found ? 'success' : 'active') : i < f.lo || i > f.hi ? 'muted' : null);
  cells.selectAll('g.cell').data(nums.map((v, i) => ({ v, i })), (d) => d.i).join((enter) => {
    const g = enter.append('g').attr('class', 'cell').attr('transform', (d) => `translate(${d.i * STEP},0)`);
    g.append('rect').attr('width', CELL).attr('height', CELL).attr('rx', 6);
    g.append('text').attr('class', 'value').attr('x', CELL / 2).attr('y', CELL / 2).attr('dy', '.35em').attr('text-anchor', 'middle').text((d) => d.v);
    g.append('text').attr('class', 'muted').attr('x', CELL / 2).attr('y', CELL + 16).attr('text-anchor', 'middle').attr('font-size', 12).text((d) => d.i);
    return g;
  }).select('rect').attr('class', (d) => kit.cls('solid', kit.tone(tone(d.i))));

  // pointers: a keyed join on the pointer's name, so each one slides to its new cell.
  // `dir` is which way the label sits: -1 above the cell (mid), +1 below (lo, hi).
  // When lo and hi meet, hi's arrow is longer so the two labels don't overlap.
  const pts = [
    f.mid >= 0 && { id: 'mid', at: f.mid, tip: 36 - 3, dir: -1, len: 16, tone: f.found ? 'success' : 'active' },
    live && { id: 'lo', at: f.lo, tip: 36 + CELL + 24, dir: 1, len: 14 },
    live && { id: 'hi', at: f.hi, tip: 36 + CELL + 24, dir: 1, len: f.lo === f.hi ? 30 : 14 },
  ].filter(Boolean);
  const place = (d) => `translate(${cx(d.at)},${d.tip})`;
  marks.selectAll('g.ptr').data(pts, (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').attr('class', 'ptr').style('opacity', 0).attr('transform', place);
      g.append('line').attr('marker-end', mk('arrow')).attr('x1', 0).attr('x2', 0).attr('y2', 0);
      g.append('text').attr('text-anchor', 'middle');
      return g;
    },
    (update) => update,
    (exit) => kit.tr(exit, 350).style('opacity', 0).remove(),
  ).call((g) => {
    g.select('line').attr('class', (d) => kit.cls('line', kit.tone(d.tone))).attr('y1', (d) => d.dir * d.len);
    g.select('text').attr('class', (d) => kit.cls('mono', kit.tone(d.tone))).attr('y', (d) => d.dir * d.len + (d.dir > 0 ? 14 : -5)).text((d) => d.id);
  }).call((g) => kit.tr(g, 350).style('opacity', 1).attr('transform', place));

  msg.set(f.msg);
  trace.set(f.line);
}

let target = 9;
const msg = kit.status();
const trace = kit.codeTrace(code);
const player = kit.player([...binarySearch(nums, target)], { interval: 800, onFrame: draw, invalidation });

const targetInput = kit.stepper({ label: 'Target', value: target, min: -15, max: 35, onInput: (v) => { target = v; player.pause(); player.replace([...binarySearch(nums, target)]); } });

fig.el.prepend(targetInput);
fig.add(msg);
fig.add(trace);
fig.add(kit.transport(player));
return fig.el;
