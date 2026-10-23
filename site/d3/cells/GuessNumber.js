// A number line you can aim at. The blue band is everything still possible;
// each guess is a pin. Drag the marker (or click the line), then Guess.
//
// The d3 ideas: one linear scale does both directions. scale(n) puts a number
// on the line, scale.invert(px) turns a pointer position back into a number
// (we round it, because guesses are whole numbers). d3.drag (through kit.draggable)
// gives the pointer in the svg's own coordinates, and a plain click handler
// reuses the same invert. The pins are a keyed data join (index = key), and the
// burst on a win is d3 transitions on freshly made circles that remove themselves.

const W = 420;
const X = d3.scaleLinear([1, 100], [0, W]);
const toNumber = (px) => kit.clamp(Math.round(X.invert(px)), 1, 100);
const pick = () => 1 + Math.floor(Math.random() * 100);

let secret = pick(), guesses = [], aim = 50, touched = false;

const fig = kit.figure(W, 0, { pad: 0 });
const { svg } = fig;
svg.attr('viewBox', [-16, -62, W + 32, 112]).attr('width', W + 32);

// layers, back to front: click target, live band, axis + ticks, pins, handle, burst
svg.append('rect').attr('class', 'hit click').attr('x', -10).attr('y', -20).attr('width', W + 20).attr('height', 40)
  .on('click', (event) => aimAt(d3.pointer(event, svg.node())[0], true));
const band = svg.append('rect').attr('class', 'solid tone-accent').attr('y', -6).attr('height', 12).attr('rx', 6).style('pointer-events', 'none');
// (marks drawn over the click target must not swallow the click)
svg.append('path').attr('class', 'axis').attr('d', `M0,0H${W}`).style('pointer-events', 'none');
const ticks = [1, ...d3.range(10, 101, 10)];
const tick = svg.append('g').style('pointer-events', 'none').selectAll('g').data(ticks).join('g').attr('transform', (v) => `translate(${X(v)},0)`);
tick.append('path').attr('class', 'axis').attr('d', 'M0,-4V4');
tick.append('text').attr('class', 'muted').attr('y', 18).attr('text-anchor', 'middle').style('font-size', '11px').text((v) => v);
const pins = svg.append('g').style('pointer-events', 'none');
const aimLabel = svg.append('text').attr('class', 'value').attr('y', 38).attr('text-anchor', 'middle');
const handle = kit.handle(svg, { r: 7, tone: 'active', hint: true });
const burst = svg.append('g');
const status = kit.status();
const guessBtn = kit.button('', () => guess());

// pointer -> number. `animate` is true for clicks (the handle glides) and false while dragging.
function aimAt(px, animate) {
  touched = true;
  aim = toNumber(px);
  draw(animate);
}
handle.call(kit.draggable(([px]) => aimAt(px, false)));

function guess() {
  if (guesses.includes(secret)) return;
  guesses = [...guesses, aim];
  if (aim === secret) fire(X(aim), -20);
  draw(true);
}

// Confetti: make circles, fly each outward along its own angle, fade, remove.
function fire(x, y) {
  const colours = ['--active-fill', '--accent-fill', '--success-fill', '--danger-fill', '--visited-fill'];
  burst.selectAll('circle').data(d3.range(18)).join('circle')
    .attr('cx', x).attr('cy', y).attr('r', 3.5)
    .style('fill', (i) => `var(${colours[i % colours.length]})`)
    .transition().duration(700).ease(d3.easeCubicOut)
    .attr('cx', (i) => x + 50 * Math.cos((i / 18) * 2 * Math.PI)).attr('cy', (i) => y + 50 * Math.sin((i / 18) * 2 * Math.PI))
    .style('opacity', 0).remove();
}

function draw(animate) {
  const go = (sel) => (animate ? kit.tr(sel, 300) : sel.interrupt());
  // the live range: everything not ruled out by a "too low" or "too high"
  const lo = Math.max(1, ...guesses.filter((g) => g < secret).map((g) => g + 1));
  const hi = Math.min(100, ...guesses.filter((g) => g > secret).map((g) => g - 1));
  const won = guesses.includes(secret);
  const last = guesses.at(-1);

  band.classed('tone-accent', !won).classed('tone-success', won);
  go(band).attr('x', X(lo) - 4).attr('width', Math.max(8, X(hi) - X(lo) + 8));

  // pins: keyed by index, so each new guess enters and the old ones stay put
  const tone = (g) => (g === secret ? 'success' : g > secret ? 'danger' : 'visited');
  pins.selectAll('g.pin').data(guesses, (g, i) => i).join((enter) => {
    const p = enter.append('g').attr('class', (g) => `pin tone-${tone(g)}`).attr('transform', (g) => `translate(${X(g)},0)`).style('opacity', 0);
    p.append('path').attr('class', 'curve').attr('stroke-width', 2).attr('d', 'M0,-8V-34');
    p.append('text').attr('class', 'value').attr('y', -44).attr('text-anchor', 'middle').style('font-size', '13px').text((g) => g);
    kit.tr(p, 300).style('opacity', 1);
    return p;
  }, (update) => update, (exit) => kit.tr(exit, 200).style('opacity', 0).remove());

  handle.style('display', won ? 'none' : null);
  aimLabel.style('display', won ? 'none' : null).text(aim);
  go(handle).attr('transform', `translate(${X(aim)},0)`);
  go(aimLabel).attr('x', X(aim));
  handle.select('.halo-ring').style('display', touched ? 'none' : null);

  guessBtn.textContent = won ? 'Guess' : `Guess ${aim}`;
  guessBtn.disabled = won;
  status.set(won
    ? `Found ${secret} in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`
    : last === undefined
      ? 'Aim, then guess. Can you always do it in 7?'
      : `${last} is too ${last > secret ? 'high' : 'low'}. It's in ${lo}–${hi}.`);
}

fig.add(status);
fig.add(kit.row(guessBtn, kit.button('New number', () => { secret = pick(); guesses = []; aim = 50; draw(true); })));
draw(false);
return fig.el;
