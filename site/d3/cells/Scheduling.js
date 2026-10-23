// CPU scheduling. The same five processes under four policies: switch the policy and
// the bars of the Gantt chart slide into their new places, and the average waiting
// time changes. Press play and a "now" cursor sweeps across while the ready queue
// (who is waiting) and the CPU (who is running) update underneath.
//
// The d3 ideas: scaleLinear turns time into x, d3.axisBottom draws the time axis, and
// the bars are a keyed join. Each bar's key is "process:nth-segment" ("P1:0", "P1:1"…),
// so when the policy changes d3 matches old bars to new ones and *transitions* x and
// width, instead of redrawing. The ready queue is keyed by process id, so a process
// that moves from position 2 to position 1 slides there.
// The scheduler itself (simulate) is plain JavaScript: d3 only draws it.

const procs = [
  { id: 'P1', arrival: 0, burst: 6 },
  { id: 'P2', arrival: 1, burst: 3 },
  { id: 'P3', arrival: 2, burst: 1 },
  { id: 'P4', arrival: 4, burst: 4 },
  { id: 'P5', arrival: 6, burst: 2 },
];
const tones = { P1: 'accent', P2: 'active', P3: 'success', P4: 'visited', P5: 'danger' };
const policies = [{ value: 'fcfs', label: 'FCFS' }, { value: 'sjf', label: 'SJF' }, { value: 'srtf', label: 'SRTF' }, { value: 'rr', label: 'Round robin' }];

// ── the simulator ───────────────────────────────────────────────────────────
// Time advances in whole units. At each tick the policy picks who runs from the READY
// QUEUE (arrived and not finished). Policies differ only in that choice, and in whether
// they may take the CPU away (preempt): fcfs and sjf never do, srtf does when a shorter
// job arrives, rr does when the quantum is used up.
function simulate(procs, policy, quantum) {
  const ps = [...procs].sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id));
  const remaining = new Map(ps.map((p) => [p.id, p.burst]));
  const byId = new Map(ps.map((p) => [p.id, p]));
  const completion = new Map(), firstRun = new Map();
  const queue = [], ticks = [], done = [];
  let running = null, slice = 0, arrived = 0;
  const limit = ps.at(-1).arrival + d3.sum(ps, (p) => p.burst) + 1;
  // the number a policy sorts by: lower runs first
  const key = (id) => (policy === 'sjf' ? byId.get(id).burst : policy === 'srtf' ? remaining.get(id) : 0);
  const pickBest = () => {
    let best = 0; // strict "<" keeps ties in arrival order
    for (let i = 1; i < queue.length; i++) if (key(queue[i]) < key(queue[best])) best = i;
    return queue.splice(best, 1)[0];
  };
  for (let t = 0; t < limit && done.length < ps.length; t++) {
    while (arrived < ps.length && ps[arrived].arrival <= t) queue.push(ps[arrived++].id);
    if (running && policy === 'rr' && slice >= quantum && queue.length) { queue.push(running); running = null; }
    if (running && policy === 'srtf' && queue.some((id) => key(id) < remaining.get(running))) { queue.push(running); running = null; }
    if (!running && queue.length) {
      running = policy === 'fcfs' || policy === 'rr' ? queue.shift() : pickBest();
      slice = 0;
      if (!firstRun.has(running)) firstRun.set(running, t);
    }
    if (running) { remaining.set(running, remaining.get(running) - 1); slice++; }
    const was = running;
    if (running && remaining.get(running) === 0) { completion.set(running, t + 1); done.push(running); running = null; }
    ticks.push({ t, running: was, queue: [...queue] });
  }
  // merge consecutive ticks of the same process into one bar
  const segments = [];
  for (const k of ticks) {
    if (!k.running) continue;
    const last = segments.at(-1);
    if (last && last.id === k.running && last.end === k.t) last.end = k.t + 1;
    else segments.push({ id: k.running, start: k.t, end: k.t + 1 });
  }
  const stats = ps.map((p) => {
    const c = completion.get(p.id);
    return { id: p.id, completion: c, waiting: c - p.arrival - p.burst };
  });
  return { segments, ticks, stats, end: ticks.length, avgWaiting: d3.mean(stats, (s) => s.waiting) };
}

// ── layout ──────────────────────────────────────────────────────────────────
const UNIT = 21, LANE = 26, GAP = 6, STEP = LANE + GAP;
const END = d3.sum(procs, (p) => p.burst); // nobody ever idles here (P1 arrives at 0), so every policy ends at 16
const X = d3.scaleLinear([0, END], [0, END * UNIT]);
const laneY = d3.scaleBand(procs.map((p) => p.id), [0, procs.length * STEP - GAP]).paddingInner(GAP / STEP).paddingOuter(0);
const chartH = procs.length * STEP - GAP;
const axisY = chartH + 6;
const rowY = axisY + 40; // ready queue / CPU row, under the axis labels
const OX = 56, OY = 26;

let policy = 'fcfs', quantum = 2;
let s = simulate(procs, policy, quantum);

const fig = kit.figure(OX + END * UNIT + 14, OY + rowY + 28 + 4);
const { svg } = fig;
const chart = svg.append('g').attr('transform', `translate(${OX},${OY})`);

// lane tracks, names and arrival triangles never change, so they are drawn once
const lanes = chart.append('g').selectAll('g').data(procs).join('g').attr('transform', (d) => `translate(0,${laneY(d.id)})`);
lanes.append('rect').attr('class', 'panel').attr('width', X(END)).attr('height', LANE).attr('rx', 4);
lanes.append('text').attr('class', 'value').attr('font-size', 12).attr('x', -10).attr('y', LANE / 2).attr('dy', '.35em').attr('text-anchor', 'end').text((d) => d.id);
lanes.append('path').attr('class', (d) => `fill-ink ${kit.tone(tones[d.id])}`)
  .attr('d', (d) => `M${X(d.arrival) - 4},-8L${X(d.arrival) + 4},-8L${X(d.arrival)},-2Z`);

// time axis: d3.axisBottom with one tick per time unit, styled down to small grey numbers
chart.append('g').attr('class', 'axisg').attr('transform', `translate(0,${axisY})`)
  .call(d3.axisBottom(X).tickValues(d3.range(END + 1)).tickSize(0).tickPadding(7))
  .call((g) => g.selectAll('text').attr('class', 'muted').style('font-size', '10px').style('font-family', 'var(--font)').style('stroke', 'none').style('font-weight', 500))
  .call((g) => g.select('.domain').attr('stroke-width', 1));

const bars = chart.append('g');
const cursor = chart.append('g');
const cLine = cursor.append('line').attr('class', 'line tone-active').attr('y1', -8).attr('y2', axisY - 2);
const cText = cursor.append('text').attr('class', 'value').attr('font-size', 11).attr('y', -16).attr('text-anchor', 'middle');

// ready queue and CPU row
const qG = chart.append('g').attr('transform', `translate(0,${rowY})`);
const caption = (x, text, anchor) => qG.append('text').attr('class', 'muted').attr('font-size', 12).attr('x', x).attr('y', 14).attr('dy', '.35em').attr('text-anchor', anchor).text(text);
caption(-10, 'ready', 'end');
caption(290, 'CPU', 'end');
const emptyL = caption(48, 'empty', 'start');
const idleL = caption(300, 'idle', 'start');
const readyG = qG.append('g'), cpuG = qG.append('g');

// a process chip (28px square, process colour). The same keyed-join helper draws the queue and the CPU.
// tween a transform by interpolating the numbers in the string (no DOM matrix parsing needed)
const moveTo = (t, f) => t.attrTween('transform', function (d, i) { return d3.interpolateString(this.getAttribute('transform') ?? f(d, i), f(d, i)); });

function chips(layer, ids, x) {
  // the datum carries its own x, so an exiting chip (whose datum is the old one) knows where it was
  layer.selectAll('g.chip').data(ids.map((id, i) => ({ id, x: x(i) })), (d) => d.id).join(
    (enter) => {
      const g = enter.append('g').attr('class', (d) => `chip ${kit.tone(tones[d.id])}`).style('opacity', 0)
        .attr('transform', (d) => `translate(${d.x + 40},0)`); // slide in from the right
      g.append('rect').attr('class', 'solid').attr('width', 28).attr('height', 28).attr('rx', 4);
      g.append('text').attr('class', 'value').attr('font-size', 12).attr('x', 14).attr('y', 14).attr('dy', '.35em').attr('text-anchor', 'middle').text((d) => d.id);
      return g;
    },
    (update) => update,
    (exit) => moveTo(kit.tr(exit, 250).style('opacity', 0), (d) => `translate(${d.x - 40},0)`).remove(), // and out to the left
  ).call((g) => moveTo(kit.tr(g, 300).style('opacity', 1), (d) => `translate(${d.x},0)`));
}

const wait = kit.el('div', { class: 'stats' });

function draw(now) {
  // bars: segments that have started by `now`, clipped at `now`. Key = process + which segment of it.
  const seen = new Map();
  const data = s.segments.map((g) => {
    const k = seen.get(g.id) ?? 0;
    seen.set(g.id, k + 1);
    return { ...g, key: `${g.id}:${k}` };
  }).filter((g) => g.start < now);
  const x = (d) => X(d.start) + 1, w = (d) => Math.max(0, X(Math.min(d.end, now) - d.start) - 2);
  bars.selectAll('rect').data(data, (d) => d.key).join(
    (enter) => enter.append('rect').attr('rx', 4).attr('height', LANE - 4).attr('y', (d) => laneY(d.id) + 2).attr('x', x).attr('width', 0),
    (update) => update,
    (exit) => kit.tr(exit, 250).attr('width', 0).remove(),
  ).attr('class', (d) => `solid ${kit.tone(tones[d.id])}`)
    .call((r) => kit.tr(r, 300).attr('x', x).attr('width', w).attr('y', (d) => laneY(d.id) + 2));

  kit.tr(cLine, 300).attr('x1', X(now)).attr('x2', X(now));
  kit.tr(cText, 300).attr('x', X(now));
  cText.text(`t = ${now}`);

  const tick = s.ticks[Math.min(now, s.end - 1)];
  const ready = now < s.end ? tick.queue : [];
  const running = now < s.end ? tick.running : null;
  chips(readyG, ready, (i) => 48 + i * 32);
  chips(cpuG, running ? [running] : [], () => 300);
  emptyL.style('display', ready.length ? 'none' : null);
  idleL.style('display', running ? 'none' : null);

  const finished = s.stats.filter((st) => st.completion <= now);
  wait.replaceChildren(
    ...finished.map((st) => kit.el('span', { class: `tone-${tones[st.id]}`, style: 'color:var(--c)' }, `${st.id} waited `, kit.el('b', {}, String(st.waiting)))),
    ...(now >= s.end ? [kit.el('span', {}, 'average wait = ', kit.el('b', {}, s.avgWaiting.toFixed(2)))] : []),
  );
}

const frames = () => d3.range(s.end + 1); // one frame per time unit: the cursor sweeps across
const player = kit.player(frames(), { interval: 450, start: s.end, onFrame: draw, invalidation });

const restart = () => { s = simulate(procs, policy, quantum); player.pause(); player.replace(frames(), s.end); };
const quantumCtl = kit.stepper({ label: 'Quantum', value: quantum, min: 1, max: 5, onInput: (v) => { quantum = v; restart(); } });
quantumCtl.style.display = 'none';

fig.add(kit.transport(player));
fig.add(kit.el('div', { class: 'row spread' },
  kit.segmented({ options: policies, value: policy, onInput: (v) => { policy = v; quantumCtl.style.display = v === 'rr' ? '' : 'none'; restart(); } }),
  quantumCtl,
));
fig.add(wait);
const hint = fig.add(kit.status('Which policy has the lowest average wait? Which one is fairest to P1?'));
hint.style.color = 'var(--muted)';
return fig.el;
