// The Monty Hall problem. A car is behind one door, goats behind the others.
// Pick a door; the host (who knows) opens a goat door; then stay or switch.
// "Simulate" plays 100 games of each strategy at once and the bars show the win rates:
// staying wins 1/3 of the time, switching wins 2/3.
//
// The d3 ideas: three doors are a keyed join (key = door number). Opening a door is not a
// redraw, it is a transition on the same <rect>: the panel squeezes toward its hinge, so d3
// interpolates x and width for us. The scoreboard is a d3.rollup over a list of finished
// games (one record each), so manual play and simulation feed the same data and the same
// bars. The confetti is d3 transitions too: circles that fly out from the door and fade.

const DW = 92, DH = 130, GAP = 22;
const doorX = (i) => i * (DW + GAP); // left edge of door i
const rnd = d3.randomInt(3);          // a door number: 0, 1 or 2

const newGame = () => ({ car: rnd(), pick: -1, opened: -1, final: -1, stage: 'pick' }); // stage: pick → offer → done
// One whole game with a fixed strategy and no UI: used by "Simulate".
function play(strategy) {
  const car = rnd(), pick = rnd();
  const goats = [0, 1, 2].filter((d) => d !== pick && d !== car);
  const opened = goats[d3.randomInt(goats.length)()];  // the host opens a goat door you didn't pick
  const final = strategy === 'stay' ? pick : [0, 1, 2].find((d) => d !== pick && d !== opened);
  return { strategy, won: final === car };
}

let g = newGame();
let history = []; // one { strategy, won } per finished game

const fig = kit.figure(520, DH + 60);
fig.svg.attr('viewBox', [-6, -28, 520, DH + 60]);
const doorLayer = fig.svg.append('g');
const chartLayer = fig.svg.append('g');
const fxLayer = fig.svg.append('g').attr('pointer-events', 'none');

const isOpen = (d) => d === g.opened || g.stage === 'done';
// the panel's colour: green/red for your final door once the game is over, blue for your pick, wood otherwise
const toneOf = (d) => (g.stage === 'done' && d === g.final ? (d === g.car ? 'success' : 'danger') : d === g.pick ? 'accent' : null);

function drawDoors() {
  doorLayer.selectAll('g.door').data([0, 1, 2], (d) => d).join((enter) => {
    const door = enter.append('g').attr('class', 'door').attr('transform', (d) => `translate(${doorX(d)},0)`);
    door.append('rect').attr('class', 'frame').attr('width', DW).attr('height', DH).attr('rx', 6);
    door.append('text').attr('class', 'prize').attr('x', DW / 2).attr('y', DH / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '42px').style('opacity', 0);
    door.append('rect').attr('class', 'dpanel').attr('rx', 5).attr('y', 4).attr('height', DH - 8).attr('x', 4).attr('width', DW - 8).on('click', (e, d) => click(d));
    door.append('text').attr('class', 'num value').attr('x', DW / 2).attr('y', DH / 2).attr('dy', '.35em').attr('text-anchor', 'middle').style('font-size', '22px');
    door.append('circle').attr('class', 'fill-ink knob').attr('cx', DW - 16).attr('cy', DH / 2 + 8).attr('r', 3.5);
    door.append('text').attr('class', 'yours tone-accent').attr('x', DW / 2).attr('y', DH + 16).attr('text-anchor', 'middle').style('font-size', '11px');
    return door;
  }).each(function (d) {
    const door = d3.select(this), open = isOpen(d), tone = toneOf(d);
    door.select('.frame').style('fill', tone ? `color-mix(in srgb, var(--${tone}-fill) 45%, var(--surface))` : 'var(--muted-fill)');
    door.select('.prize').text(d === g.car ? '🚗' : '🐐');
    kit.tr(door.select('.prize')).style('opacity', open ? 1 : 0);
    // opening = the panel squeezes toward its hinge (same element, so it tweens)
    door.select('.dpanel').attr('class', kit.cls('dpanel solid', kit.tone(tone ?? 'orange'), g.stage !== 'done' && !open && 'click btn-shape'))
      .call((p) => kit.tr(p).attr('x', open ? 1 : 4).attr('width', open ? 12 : DW - 8));
    door.select('.num').attr('class', kit.cls('num value', kit.tone(tone))).text(String(d + 1))
      .call((t) => kit.tr(t).attr('x', open ? 7 : DW / 2).style('opacity', open ? 0 : 1));
    kit.tr(door.select('.knob')).style('opacity', open ? 0 : 1);
    door.select('.yours').text(d === g.pick ? (g.stage === 'done' && g.final !== g.pick ? 'first pick' : 'your pick') : '');
  });
}

// the scoreboard: roll the history up by strategy → { won, n }
const tally = () => {
  const m = d3.rollup(history, (v) => ({ won: d3.sum(v, (d) => d.won), n: v.length }), (d) => d.strategy);
  return { stay: m.get('stay') ?? { won: 0, n: 0 }, switch: m.get('switch') ?? { won: 0, n: 0 } };
};

const CX = 3 * (DW + GAP) + 30, CW = 130, CY = 10;
const cx = d3.scaleBand(['stay', 'switch'], [CX, CX + CW]).paddingInner(0.3).paddingOuter(0.15);
const cy = d3.scaleLinear([0, 1], [DH, CY]);
const chartBase = chartLayer.append('g').style('opacity', 0); // axis and reference line, shown once there is data
chartBase.append('line').attr('class', 'axis').style('stroke-width', 1).attr('x1', CX).attr('x2', CX + CW).attr('y1', DH).attr('y2', DH);
chartBase.append('line').attr('class', 'guide').style('stroke-width', 1).attr('x1', CX).attr('x2', CX + CW).attr('y1', cy(2 / 3)).attr('y2', cy(2 / 3)); // theory says switching wins 2/3
const pct = d3.format('.0%');

function drawChart() {
  const t = tally();
  const played = t.stay.n + t.switch.n > 0; // two flat 0% bars just look broken, so wait
  kit.tr(chartBase, 250).style('opacity', played ? 1 : 0);
  const data = played ? ['stay', 'switch'].map((s) => ({ s, v: t[s].n ? t[s].won / t[s].n : 0 })) : [];
  chartLayer.selectAll('g.rate').data(data, (d) => d.s).join(
    (enter) => {
      const b = enter.append('g').attr('class', 'rate');
      b.append('rect').attr('class', (d) => kit.cls('solid', kit.tone(d.s === 'stay' ? 'muted' : 'success'))).attr('x', (d) => cx(d.s)).attr('width', cx.bandwidth()).attr('rx', 3).attr('y', DH).attr('height', 0);
      b.append('text').attr('class', 'value').style('font-size', '11px').attr('text-anchor', 'middle').attr('x', (d) => cx(d.s) + cx.bandwidth() / 2).attr('y', DH - 9);
      b.append('text').attr('class', 'muted').style('font-size', '12px').attr('text-anchor', 'middle').attr('x', (d) => cx(d.s) + cx.bandwidth() / 2).attr('y', DH + 14).text((d) => d.s);
      return b;
    },
    (update) => update,
    (exit) => exit.remove(),
  ).call((b) => {
    kit.tr(b.select('rect'), 300).attr('y', (d) => cy(d.v)).attr('height', (d) => DH - cy(d.v));
    kit.tr(b.select('text.value'), 300).attr('y', (d) => cy(d.v) - 9);
    b.select('text.value').text((d) => pct(d.v));
  });
  score.replaceChildren(`stay `, kit.el('b', {}, `${t.stay.won}/${t.stay.n}`), ` · switch `, kit.el('b', {}, `${t.switch.won}/${t.switch.n}`));
  score.style.display = 'block';
}

// confetti: circles born at the door, flown outward by a transition, removed when it ends
function burst(x, y, count = 20, radius = 60) {
  const tones = ['active', 'accent', 'success', 'visited', 'danger'];
  const a = d3.randomUniform(-0.25, 0.25), r = d3.randomUniform(0.65, 1.15);
  fxLayer.selectAll(null).data(d3.range(count)).join('circle')
    .attr('class', (i) => kit.cls('fill-ink', kit.tone(tones[i % tones.length]))).attr('cx', x).attr('cy', y).attr('r', 0)
    .transition().duration(700).ease(d3.easeCubicOut)
    .attr('cx', (i) => x + Math.cos((2 * Math.PI * i) / count + a()) * radius * r())
    .attr('cy', (i) => y + Math.sin((2 * Math.PI * i) / count + a()) * radius * r())
    .attr('r', () => 2 + Math.random() * 2.5)
    .transition().duration(400).style('opacity', 0).remove();
}

const msg = kit.status();
function drawMessage() {
  msg.set(g.stage === 'pick' ? 'Pick a door.'
    : g.stage === 'offer' ? `The host opens door ${g.opened + 1}: a goat. Click your door to stay, or the other closed one to switch.`
    : g.final === g.car ? `You ${g.final === g.pick ? 'stayed' : 'switched'} and won the car!` : `You ${g.final === g.pick ? 'stayed' : 'switched'}… goat.`);
  restart.textContent = g.stage === 'done' ? 'Play again' : 'Restart';
}
function draw() { drawDoors(); drawChart(); drawMessage(); }

function click(d) {
  if (g.stage === 'pick') {
    const goats = [0, 1, 2].filter((x) => x !== d && x !== g.car);
    g = { ...g, pick: d, opened: goats[d3.randomInt(goats.length)()], stage: 'offer' };
  } else if (g.stage === 'offer' && d !== g.opened) {
    const won = d === g.car;
    history.push({ strategy: d === g.pick ? 'stay' : 'switch', won });
    g = { ...g, final: d, stage: 'done' };
    if (won) burst(doorX(d) + DW / 2, DH / 2);
  } else return;
  draw();
}

const restart = kit.button('Restart', () => { g = newGame(); draw(); });
const score = kit.el('span', { class: 'stats' });
fig.add(msg);
fig.add(kit.row(restart, kit.button('Simulate 100 of each', () => {
  history = history.concat(d3.range(100).flatMap(() => [play('stay'), play('switch')]));
  draw();
}), score));
draw();
return fig.el;
