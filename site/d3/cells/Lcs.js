// Filling a dynamic-programming table: the longest common subsequence of two
// strings. dp[i][j] = LCS length of the first i letters of A and the first j
// letters of B. Each step fills one cell and draws an arrow from the cell it
// was computed from; after the last cell a traceback colours the path home.
//
// The d3 ideas:
//  - d3.range(rows) x d3.range(cols) is the grid. Cells are keyed "r,c", so each
//    one is a persistent element whose class (tone) and text change per frame
//    and the CSS fill transition does the fade.
//  - Two d3.scaleBand scales (rows, columns) turn (r, c) into pixels. paddingInner
//    is the gap between cells and `.bandwidth()` is the cell size. They are
//    rebuilt when the strings change, because the grid's shape follows the
//    problem (the camera never moves per step).
//  - Dependency arrows are keyed `dep0`, `dep1`: a keyed join of one or no
//    arrows per frame, which fade in and out and glide from cell to cell.

function* lcs(A, B) {
  const n = A.length, m = B.length;
  const dp = d3.range(n + 1).map((i) => d3.range(m + 1).map((j) => (i && j ? null : 0)));
  const copy = () => dp.map((r) => [...r]);
  yield { dp: copy(), cur: null, deps: [], path: [], msg: 'Row 0 and column 0: an empty prefix has LCS 0.' };
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let deps, msg;
      if (A[i - 1] === B[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        deps = [[i - 1, j - 1]];
        msg = `${A[i - 1]} = ${B[j - 1]}: take the diagonal + 1.`;
      } else {
        const up = dp[i - 1][j], left = dp[i][j - 1];
        dp[i][j] = Math.max(up, left);
        deps = up >= left ? [[i - 1, j]] : [[i, j - 1]];
        msg = `${A[i - 1]} ≠ ${B[j - 1]}: max(up ${up}, left ${left}) = ${dp[i][j]}.`;
      }
      yield { dp: copy(), cur: [i, j], deps, path: [], msg };
    }
  }
  // Traceback: follow the choices backwards from the corner.
  const path = [];
  let i = n, j = m, word = '';
  while (i > 0 && j > 0) {
    path.push([i, j]);
    if (A[i - 1] === B[j - 1]) { word = A[i - 1] + word; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
    yield { dp: copy(), cur: path.at(-1), deps: [], path: [...path], msg: `Traceback… "${word}"` };
  }
  yield { dp: copy(), cur: null, deps: [], path, msg: `LCS = "${word}" (length ${dp[n][m]}).` };
}

const CELL = 32, GAP = 4, STEP = CELL + GAP;
const clean = (s) => s.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 9) || 'A';

let A = 'ABCBDAB', B = 'BDCABA';
let rowBand, colBand, frames, player;

const fig = kit.figure(100, 100, { pad: 0 });
const { svg } = fig;
const mk = kit.markers(svg);
const gridLayer = svg.append('g');
const labelLayer = svg.append('g');
const arrowLayer = svg.append('g');
const status = kit.status();

// Build everything that depends on the two strings: the bands, the labels, the frames, the camera.
function setup() {
  const n = A.length + 1, m = B.length + 1;
  rowBand = d3.scaleBand(d3.range(n), [0, n * STEP - GAP]).paddingInner(GAP / STEP).paddingOuter(0);
  colBand = d3.scaleBand(d3.range(m), [0, m * STEP - GAP]).paddingInner(GAP / STEP).paddingOuter(0);
  // the grid is `m` columns by `n` rows, with room on the left for row letters and above for column letters
  const left = 26, top = 24;
  const w = left + m * STEP - GAP, h = top + n * STEP - GAP;
  svg.attr('viewBox', [-left, -top, w + 8, h + 8]).attr('width', w + 8);
  gridLayer.selectAll('*').remove();
  arrowLayer.selectAll('*').remove();
  labelLayer.selectAll('*').remove();
  // labels: ε for the empty prefix, then the letters
  labelLayer.selectAll('text.col').data(['ε', ...B]).join('text').attr('class', 'col muted')
    .attr('x', (_, c) => colBand(c) + CELL / 2).attr('y', -14).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '13px').text((d) => d);
  labelLayer.selectAll('text.row').data(['ε', ...A]).join('text').attr('class', 'row muted')
    .attr('x', -12).attr('y', (_, r) => rowBand(r) + CELL / 2).attr('dy', '.35em').attr('text-anchor', 'end').style('font-size', '13px').text((d) => d);
  frames = [...lcs(A, B)];
}

function draw(f) {
  const on = (list, r, c) => list.some(([a, b]) => a === r && b === c);
  const tone = (r, c) => (f.cur?.[0] === r && f.cur?.[1] === c ? 'active' : on(f.path, r, c) ? 'success' : on(f.deps, r, c) ? 'accent' : null);
  const cells = d3.cross(d3.range(f.dp.length), d3.range(f.dp[0].length), (r, c) => ({ r, c, v: f.dp[r][c], tone: tone(r, c) }));

  gridLayer.selectAll('g.cell').data(cells, (d) => `${d.r},${d.c}`).join((enter) => {
    const g = enter.append('g').attr('class', 'cell').attr('transform', (d) => `translate(${colBand(d.c)},${rowBand(d.r)})`);
    g.append('rect').attr('width', CELL).attr('height', CELL).attr('rx', 6);
    g.append('text').attr('class', 'value').attr('x', CELL / 2).attr('y', CELL / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '12px');
    return g;
  }).call((g) => {
    g.select('rect').attr('class', (d) => kit.cls('solid', kit.tone(d.tone)));
    g.select('text').text((d) => (d.v === null ? '' : d.v));
  });

  // dependency arrows: from the cell we read toward the cell we are filling, trimmed to leave room for the head
  const centre = ([r, c]) => [colBand(c) + CELL / 2, rowBand(r) + CELL / 2];
  const arrows = f.cur ? f.deps.map(([r, c], k) => {
    const s = centre([r, c]), t = centre(f.cur);
    const len = Math.hypot(t[0] - s[0], t[1] - s[1]), ux = (t[0] - s[0]) / len, uy = (t[1] - s[1]) / len;
    return { id: `dep${k}`, x1: s[0] + ux * 8, y1: s[1] + uy * 8, x2: t[0] - ux * 12, y2: t[1] - uy * 12 };
  }) : [];
  arrowLayer.selectAll('line.dep').data(arrows, (d) => d.id).join(
    (enter) => enter.append('line').attr('class', 'dep line tone-accent').attr('marker-end', mk('arrow')).style('stroke-width', '2px')
      .attr('x1', (d) => d.x1).attr('y1', (d) => d.y1).attr('x2', (d) => d.x2).attr('y2', (d) => d.y2).style('opacity', 0),
    (update) => update,
    (exit) => kit.tr(exit, 150).style('opacity', 0).remove(),
  ).call((l) => kit.tr(l, 200).style('opacity', 1).attr('x1', (d) => d.x1).attr('y1', (d) => d.y1).attr('x2', (d) => d.x2).attr('y2', (d) => d.y2));

  status.set(f.msg);
}

setup();
player = kit.player(frames, { interval: 260, onFrame: draw, invalidation });

// text inputs: the strings change the problem, so everything is rebuilt (the player keeps its transport)
const input = (label, get, set) => {
  const field = kit.el('input', { type: 'text', value: get(), maxlength: 9, size: 10, 'aria-label': label });
  field.addEventListener('change', () => {
    set(clean(field.value));
    field.value = get();
    player.pause();
    setup();
    player.replace(frames);
  });
  return kit.el('label', { class: 'ctl' }, label, field);
};

fig.add(status);
fig.add(kit.transport(player));
fig.add(kit.row(input('A', () => A, (v) => (A = v)), input('B', () => B, (v) => (B = v))));
return fig.el;
