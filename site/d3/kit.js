// kit: the small amount of shared plumbing the d3 examples use.
//
// This file is written as the BODY of an Observable cell, so it can be pasted as
//
//     kit = { <everything below> }
//
// `d3` is a free variable (Observable provides it). Nothing here draws a diagram:
// drawing is d3's job and stays in each example. The kit only holds what d3
// deliberately leaves out: a stylesheet, form controls, a step player, arrow markers.

const STYLE_ID = 'd3fig-styles';

// The palette, the same one dsviz uses, so the two example pages look alike.
// Each tone sets three variables: --c ink, --cf fill, --co outline.
const TONES = ['active', 'accent', 'success', 'danger', 'visited', 'orange'];
const LIGHT = `
  --fg:#000; --muted:#999; --faint:#ccc; --surface:#fff; --muted-fill:#f2f2f2; --edge:#000; --halo:#fff; --grid:#e5e5e5; --outline:#d4d4d4;
  --curve:#456dff; --area:rgb(171 189 255 / .6); --point:#ff775c; --band:#fdf3d3;
  --active:#b78900; --active-fill:#f9d25c; --active-outline:#b78900;
  --accent:#456dff; --accent-fill:#abbdff; --accent-outline:#294bc6;
  --success:#009b2b; --success-fill:#9fe8b3; --success-outline:#009b2b;
  --danger:#c43939; --danger-fill:#ffb6b6; --danger-outline:#c43939;
  --visited:#7139cc; --visited-fill:#d3b8ff; --visited-outline:#7139cc;
  --orange:#ce6809; --orange-fill:#ffe8d3; --orange-outline:#ce6809;`;
const DARK = `
  --fg:#fff; --muted:#8c8c8c; --faint:#4c4c4c; --surface:#1e1e1e; --muted-fill:#2a2a2a; --edge:#f2f2f2; --halo:#1e1e1e; --grid:#333; --outline:#4c4c4c;
  --curve:#7491ff; --area:rgb(116 145 255 / .35); --point:#ff8871; --band:#5c4400;
  --active:#f9d25c; --active-fill:#b78900; --active-outline:#5c4400;
  --accent:#7491ff; --accent-fill:#375ce3; --accent-outline:#142563;
  --success:#9fe8b3; --success-fill:#15b441; --success-outline:#004e16;
  --danger:#ffb6b6; --danger-fill:#e14b4b; --danger-outline:#621c1c;
  --visited:#d3b8ff; --visited-fill:#874de5; --visited-outline:#381d66;
  --orange:#ffcc9c; --orange-fill:#673404; --orange-outline:#291502;`;

const CSS = /* css */ `
.fig { ${LIGHT}
  --font: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Source Code Pro", ui-monospace, "SF Mono", Menlo, monospace;
  --math: "STIX Two Text", "Latin Modern Roman", "Cambria Math", "Times New Roman", serif;
  font-family: var(--font); color: var(--fg); display: flex; flex-direction: column; gap: 12px; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]):not(.light) .fig { ${DARK} } }
:root[data-theme="dark"] .fig, :root.dark .fig, .dark .fig { ${DARK} }

${TONES.map((t) => `.fig .tone-${t} { --c:var(--${t}); --cf:var(--${t}-fill); --co:var(--${t}-outline); }`).join('\n')}

.fig svg { display: block; max-width: 100%; height: auto; overflow: visible; touch-action: manipulation; }
.fig svg { font-size: 14px; } /* inherited, so a font-size attribute on a <text> still wins */
.fig svg text { fill: var(--fg); font-weight: 500; pointer-events: none; user-select: none; font-variant-numeric: tabular-nums; }
.fig svg text.mono { font-family: var(--mono); font-weight: 600; }
.fig svg text.math { font-family: var(--math); font-weight: 400; paint-order: stroke; stroke: var(--halo); stroke-width: 4px; stroke-linejoin: round; }
.fig svg text.muted { fill: var(--muted); }
.fig svg text.value { font-weight: 600; }
.fig svg text.halo { paint-order: stroke; stroke: var(--halo); stroke-width: 4px; stroke-linejoin: round; }
.fig svg text.tone-active, .fig svg text.tone-accent, .fig svg text.tone-success, .fig svg text.tone-danger, .fig svg text.tone-visited, .fig svg text.tone-orange { fill: var(--c); }

/* solid things: coloured fill, outline in a darker shade of it */
.fig .solid { fill: var(--cf, var(--surface)); stroke: var(--co, var(--outline)); stroke-width: 2px; transition: fill .25s, stroke .25s; }
.fig .solid.tone-muted { fill: var(--muted-fill); stroke: var(--grid); }
.fig .solid.ghost { fill: none; stroke: var(--faint); stroke-dasharray: 4 4; }
.fig .btn-shape { cursor: pointer; }
.fig .btn-shape:hover { filter: brightness(.96); }
/* lines */
.fig .line { fill: none; stroke: var(--c, var(--edge)); stroke-width: 1.5px; stroke-linecap: round; stroke-linejoin: round; transition: stroke .25s; }
.fig .line.muted { stroke: var(--faint); }
.fig .line.dashed, .fig .dashed { stroke-dasharray: 6 5; }
.fig .grid { fill: none; stroke: var(--grid); stroke-width: 1.5px; }
.fig .axis { fill: none; stroke: var(--fg); stroke-width: 1.5px; }
.fig .curve { fill: none; stroke: var(--c, var(--curve)); stroke-width: 3px; stroke-linecap: round; stroke-linejoin: round; }
.fig .area { fill: var(--cf, var(--area)); stroke: none; }
.fig .guide { fill: none; stroke: var(--fg); stroke-width: 1.5px; stroke-dasharray: 4 4; }
.fig .band { fill: var(--band); stroke: none; }
.fig .panel { fill: var(--muted-fill); stroke: none; }
.fig .fill-ink { fill: var(--c, var(--edge)); stroke: none; }
.fig .halo-ring { fill: none; stroke: var(--c, var(--point)); stroke-width: 2px; pointer-events: none; transform-box: fill-box; transform-origin: center; animation: fig-pulse 1.6s ease-out infinite; }
@keyframes fig-pulse { 0% { transform: scale(1); opacity: .9; } 80%, 100% { transform: scale(3); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .fig .halo-ring { animation: none; opacity: .5; } }
/* draggable handles: a big invisible hit target and the visible dot */
.fig .drag { cursor: grab; touch-action: none; }
.fig .dragging, .fig .dragging * { cursor: grabbing !important; }
.fig .hit { fill: transparent; stroke: none; pointer-events: all; }
.fig .handle { fill: var(--c, var(--point)); stroke: var(--surface); stroke-width: 2.5px; filter: drop-shadow(0 1px 2px rgb(0 0 0 / .3)); pointer-events: none; transition: transform .15s; transform-box: fill-box; transform-origin: center; }
.fig .drag:hover .handle, .fig .drag:focus-visible .handle { transform: scale(1.3); }
.fig .drag:focus { outline: none; }
.fig .click { cursor: pointer; }
/* d3.axis output: ink ticks, serif numbers */
.fig .axisg path, .fig .axisg line { stroke: var(--fg); stroke-width: 1.5px; fill: none; }
.fig .axisg text { font-family: var(--math); font-weight: 400; font-size: 13px; paint-order: stroke; stroke: var(--halo); stroke-width: 4px; stroke-linejoin: round; }

/* controls */
.fig .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
.fig .row.spread { justify-content: space-between; }
.fig .status { margin: 0; font-size: 14px; min-height: 1.5em; }
.fig .stats { display: flex; flex-wrap: wrap; gap: 4px 16px; font: 12.5px var(--mono); color: var(--muted); margin: 0; }
.fig .stats b { color: var(--fg); font-weight: 600; }
.fig label.ctl { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }
.fig label.ctl > span.v { min-width: 3ch; font: 12.5px var(--mono); color: var(--fg); }
.fig input[type=range] { accent-color: var(--accent); width: 160px; }
.fig button, .fig select, .fig input[type=text] { font: 500 13px var(--font); color: var(--fg); background: var(--surface); border: 1px solid var(--faint); border-radius: 6px; padding: 4px 10px; }
.fig button { cursor: pointer; }
.fig button:hover:not(:disabled) { background: var(--muted-fill); }
.fig button:disabled { opacity: .4; cursor: default; }
.fig .seg { display: inline-flex; border: 1px solid var(--faint); border-radius: 6px; overflow: hidden; }
.fig .seg button { border: 0; border-radius: 0; background: transparent; }
.fig .seg button + button { border-left: 1px solid var(--faint); }
.fig .seg button[aria-pressed=true] { background: var(--accent-fill); }
.fig .stepper { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); }
.fig .stepper b { min-width: 3ch; text-align: center; color: var(--fg); font: 600 14px var(--mono); }
.fig .transport { display: flex; align-items: center; gap: 8px; }
.fig .transport input[type=range] { flex: 1; width: auto; }
.fig .transport .count { font: 12.5px var(--mono); color: var(--muted); white-space: nowrap; }
.fig .codetrace { margin: 0; padding: 6px 0; background: var(--muted-fill); border-radius: 8px; font: 13px/1.7 var(--mono); overflow-x: auto; }
.fig .codetrace div { padding: 0 12px; white-space: pre; border-left: 3px solid transparent; }
.fig .codetrace div.on { background: var(--band); border-left-color: var(--active-outline); }
`;

function style() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

// ── the figure: a wrapper div with an svg inside ───────────────────────────
// Returns { el, svg, add }. `svg` is a d3 selection, so you carry on in d3.
// `add(node)` appends controls or text under the drawing. Return `el` from the cell.
// The svg has a viewBox and max-width:100%, so it shrinks on a narrow screen
// and 1 unit is 1px otherwise.
function figure(width, height, { pad = 0 } = {}) {
  style();
  const el = document.createElement('div');
  el.className = 'fig';
  const svg = d3
    .select(el)
    .append('svg')
    .attr('viewBox', [-pad, -pad, width + 2 * pad, height + 2 * pad])
    .attr('width', width + 2 * pad);
  return { el, svg, add: (node) => (el.appendChild(node), node) };
}

// ── markers (arrowheads) ───────────────────────────────────────────────────
// Call once on a <defs>. Use them as `.attr('marker-end', 'url(#m-arrow)')`.
// They take the colour of the line they sit on (context-stroke), so a tone
// class on the line recolours its head too. Ids: m-arrow m-open m-tri m-dia m-diaf
// (m-tri / m-dia are hollow, m-diaf filled: the UML ones).
function markers(svg, prefix = 'm') {
  const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');
  const mk = (id, w, h, ref, draw) => {
    const m = defs.append('marker').attr('id', `${prefix}-${id}`).attr('viewBox', `0 0 ${w} ${h}`).attr('refX', ref).attr('refY', h / 2)
      .attr('markerWidth', w).attr('markerHeight', h).attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto-start-reverse');
    draw(m);
  };
  mk('arrow', 10, 8, 9, (m) => m.append('path').attr('d', 'M0,0 L10,4 L0,8 z').style('fill', 'context-stroke').style('stroke', 'context-stroke'));
  mk('open', 10, 10, 9, (m) => m.append('path').attr('d', 'M1,1 L9,5 L1,9').style('fill', 'none').style('stroke', 'context-stroke').style('stroke-width', 1.5));
  mk('tri', 12, 10, 11, (m) => m.append('path').attr('d', 'M1,1 L11,5 L1,9 z').style('fill', 'var(--surface)').style('stroke', 'context-stroke').style('stroke-width', 1.5));
  mk('dia', 16, 10, 15, (m) => m.append('path').attr('d', 'M1,5 L8,1 L15,5 L8,9 z').style('fill', 'var(--surface)').style('stroke', 'context-stroke').style('stroke-width', 1.5));
  mk('diaf', 16, 10, 15, (m) => m.append('path').attr('d', 'M1,5 L8,1 L15,5 L8,9 z').style('fill', 'context-stroke').style('stroke', 'context-stroke').style('stroke-width', 1.5));
  return (id) => `url(#${prefix}-${id})`;
}

// ── small helpers ──────────────────────────────────────────────────────────
const cls = (...parts) => parts.filter(Boolean).join(' ');
const tone = (t) => (t ? `tone-${t}` : '');
// tr(selection, ms) = selection.transition() with this kit's timing. Use it as kit.tr(sel).attr(...).
// A second unnamed transition on the same element cancels the first: put every attribute and
// style you want to animate in ONE transition (or give them names: sel.transition('fade')).
// (Don't pass a shared d3.transition() object to selection.transition(t): d3 looks the
// transition up on an ancestor element, which fails while the figure isn't in the page yet.)
const tr = (selection, ms = 450) => selection.transition().duration(ms).ease(d3.easeCubicInOut);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v != null && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null) n.append(kid);
  return n;
};

// ── drag ───────────────────────────────────────────────────────────────────
// d3.drag with the things every handle here wants: pointer position in the svg's
// own coordinates (not the page's), a "dragging" class on the figure while it is
// held, and arrow keys as a virtual drag. Use it the d3 way:
//     handleSelection.call(kit.draggable((point, datum) => { ... }))
// `point` is [x, y] in the coordinates of `space` (default: the owning svg).
// Keyboard needs the element's current position, read from its translate().
function draggable(onMove, { space, onStart, onEnd, step = 6 } = {}) {
  const here = (node) => {
    const m = node.transform?.baseVal?.consolidate?.()?.matrix;
    return m ? [m.e, m.f] : [0, 0];
  };
  return (selection) => {
    selection
      .call(
        d3.drag()
          .on('start', function (event, d) { d3.select(this.closest('.fig')).classed('dragging', true); onStart?.(d); })
          .on('drag', function (event, d) { onMove(d3.pointer(event, space ?? this.ownerSVGElement), d, event); })
          .on('end', function (event, d) { d3.select(this.closest('.fig')).classed('dragging', false); onEnd?.(d); }),
      )
      .attr('tabindex', 0)
      .on('keydown.drag', function (event, d) {
        const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!dir) return;
        event.preventDefault();
        const [x, y] = here(this);
        onMove([x + dir[0] * step, y + dir[1] * step], d, event);
      });
  };
}

// A draggable dot: invisible hit circle + visible handle, in one <g>.
// Returns the <g> selection; move it with .attr('transform', ...) (or a transition).
function handle(parent, { r = 8, hit = 22, tone: tn, hint = false } = {}) {
  const g = parent.append('g').attr('class', cls('drag', tone(tn)));
  if (hint) g.append('circle').attr('class', 'halo-ring').attr('r', r);
  g.append('circle').attr('class', 'hit').attr('r', hit);
  g.append('circle').attr('class', 'handle').attr('r', r);
  return g;
}

// ── TeX-lite for text: a^2  x_{i}  \\cap  \\pi ──────────────────────────────
const GLYPHS = { cap: '∩', cup: '∪', pi: 'π', theta: 'θ', alpha: 'α', beta: 'β', times: '×', cdot: '·', le: '≤', ge: '≥', neq: '≠', approx: '≈', sqrt: '√', infty: '∞', Delta: 'Δ', sum: 'Σ', int: '∫', prime: '′', bar: '̄', mu: 'μ', sigma: 'σ', lambda: 'λ' };
function tex(textSel, source) {
  textSel.text(null);
  const re = /\\([A-Za-z]+)|([\^_])(\{[^}]*\}|.)|([^\\^_]+)/g;
  let m;
  while ((m = re.exec(source))) {
    if (m[1]) textSel.append('tspan').text(GLYPHS[m[1]] ?? m[1]);
    else if (m[2]) {
      const body = m[3].replace(/^\{|\}$/g, '').replace(/\\([A-Za-z]+)/g, (_, k) => GLYPHS[k] ?? k);
      textSel.append('tspan').attr('baseline-shift', m[2] === '^' ? 'super' : 'sub').attr('font-size', '70%').text(body);
    } else textSel.append('tspan').text(m[4]);
  }
  return textSel;
}

// ── form controls (plain DOM; swap for Observable Inputs if you prefer) ─────
// Each returns an element. Pass `onInput(value)`. Keep a reference and call
// `.set(value)` on it to change it from code.
function slider({ label, min = 0, max = 100, step = 1, value = min, format = (v) => v, onInput }) {
  const input = el('input', { type: 'range', min, max, step, value });
  const out = el('span', { class: 'v' }, format(value));
  input.addEventListener('input', () => { const v = +input.value; out.textContent = format(v); onInput?.(v); });
  const node = el('label', { class: 'ctl' }, label, input, out);
  node.set = (v) => { input.value = v; out.textContent = format(v); };
  return node;
}
function segmented({ options, value, onInput, label }) {
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) }));
  const node = el('span', { class: 'seg', role: 'group', 'aria-label': label ?? null });
  const sync = (v) => [...node.children].forEach((b, i) => b.setAttribute('aria-pressed', String(opts[i].value === v)));
  opts.forEach((o) => node.append(el('button', { type: 'button', onclick: () => { sync(o.value); onInput?.(o.value); } }, o.label)));
  sync(value);
  node.set = sync;
  return node;
}
function select({ options, value, onInput, label }) {
  const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) }));
  const sel = el('select', {}, opts.map((o) => el('option', { value: o.value }, o.label)));
  sel.value = value;
  sel.addEventListener('input', () => onInput?.(sel.value));
  const node = label ? el('label', { class: 'ctl' }, label, sel) : sel;
  node.set = (v) => { sel.value = v; };
  return node;
}
function toggle({ label, value = false, onInput }) {
  const input = el('input', { type: 'checkbox' });
  input.checked = value;
  input.addEventListener('input', () => onInput?.(input.checked));
  const node = el('label', { class: 'ctl' }, input, label);
  node.set = (v) => { input.checked = v; };
  return node;
}
function button(label, onClick) {
  return el('button', { type: 'button', onclick: onClick }, label);
}
function stepper({ label, value, min = -Infinity, max = Infinity, step = 1, onInput }) {
  let v = value;
  const out = el('b', {}, v);
  const dec = button('−', () => set(v - step));
  const inc = button('+', () => set(v + step));
  const set = (x, silent) => { v = clamp(x, min, max); out.textContent = v; dec.disabled = v <= min; inc.disabled = v >= max; if (!silent) onInput?.(v); };
  set(v, true);
  const node = el('span', { class: 'stepper' }, label, dec, out, inc);
  node.set = (x) => set(x, true);
  return node;
}
function row(...kids) {
  return el('div', { class: 'row' }, ...kids);
}
function status(text = '') {
  const p = el('p', { class: 'status' }, text);
  p.set = (s) => { p.textContent = s; };
  return p;
}
// The line stats under a figure: stats([['x', '1.00'], ...]) then .set([...]).
function stats() {
  const p = el('p', { class: 'stats' });
  p.set = (pairs) => p.replaceChildren(...pairs.map(([k, v]) => el('span', {}, `${k} `, el('b', {}, v))));
  return p;
}

// ── code trace: lines of code, one highlighted ─────────────────────────────
function codeTrace(lines) {
  const node = el('pre', { class: 'codetrace' }, lines.map((l) => el('div', {}, l || ' ')));
  node.set = (i) => [...node.children].forEach((c, j) => c.classList.toggle('on', j === i));
  return node;
}

// ── player: a list of frames, an index, play/pause ─────────────────────────
// An algorithm written as a generator becomes a player like this:
//     const p = kit.player([...binarySearch(nums, 9)], { onFrame: draw, invalidation });
// `onFrame(frame, index)` is called whenever the index changes (and once at the start).
function player(frames, { interval = 800, onFrame, start = 0, invalidation } = {}) {
  let i = Math.min(start, frames.length - 1);
  let timer = null;
  const listeners = new Set(onFrame ? [onFrame] : []);
  const api = {
    frames,
    get index() { return i; },
    get frame() { return frames[i]; },
    get playing() { return timer != null; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set(n) { i = clamp(n, 0, frames.length - 1); listeners.forEach((f) => f(frames[i], i)); },
    next() { api.set(i + 1); },
    prev() { api.set(i - 1); },
    pause() { if (timer == null) return; clearInterval(timer); timer = null; listeners.forEach((f) => f(frames[i], i)); }, // only notifies if it was playing: the transport needs the redraw to flip its icon, nothing else does
    play() {
      if (i >= frames.length - 1) i = -1;
      timer = setInterval(() => { if (i >= frames.length - 1) api.pause(); else api.next(); }, interval);
      api.next();
    },
    replace(newFrames, at = 0) { frames = newFrames; api.frames = newFrames; clearInterval(timer); timer = null; api.set(at); },
  };
  invalidation?.then(() => clearInterval(timer));
  api.set(i);
  return api;
}

// first / previous / play / next / last + a scrubber + "Step 3 / 8"
function transport(p) {
  const first = button('⏮', () => (p.pause(), p.set(0)));
  const prev = button('◀', () => (p.pause(), p.prev()));
  const play = button('▶', () => (p.playing ? p.pause() : p.play()));
  const next = button('▶|', () => (p.pause(), p.next()));
  const scrub = el('input', { type: 'range', min: 0, step: 1, value: 0, 'aria-label': 'Step' });
  const count = el('span', { class: 'count' });
  scrub.addEventListener('input', () => { const v = +scrub.value; p.pause(); p.set(v); }); // read first: pause() re-syncs the scrubber
  const sync = () => {
    const last = p.frames.length - 1;
    scrub.max = last; scrub.value = p.index;
    count.textContent = `Step ${p.index} / ${last}`;
    first.disabled = prev.disabled = p.index === 0;
    next.disabled = p.index === last && !p.playing;
    play.textContent = p.playing ? '⏸' : p.index === last ? '↻' : '▶';
  };
  p.subscribe(sync);
  sync();
  return el('div', { class: 'transport' }, first, prev, play, next, scrub, count);
}

return { style, figure, markers, cls, tone, tr, clamp, el, draggable, handle, tex, slider, segmented, select, toggle, button, stepper, row, status, stats, codeTrace, player, transport };
