/**
 * Stylesheet. The look: clean textbook figures with a little colour.
 *
 *   - crisp 1.5px ink lines, filled triangle arrowheads
 *   - flat fills from one palette (yellow / blue / green / red / purple /
 *     orange), always outlined in ink
 *   - very light #e5e5e5 grids, thick blue curves, pale blue areas
 *   - maths labels in an italic serif, everything else in a plain sans
 *
 * Two layers:
 *  1. Variables on `.dv-root` (and `.dvc` for the controls): the vocabulary.
 *  2. Base rules that only ever read variables.
 *
 * Dark mode is a variable swap under `[data-theme="dark"]` / `.dark` (or the OS
 * setting when neither is set). Re-skin from your app without touching JS:
 *   .my-app .dv-root { --dv-active-fill: hotpink; }
 *
 * Tones (`tone: 'active'`) become classes. Each tone has three colours:
 *   --dv-c   ink    (text, arrows, curves)
 *   --dv-cf  fill   (shapes)
 *   --dv-cs  stroke (shape outlines: ink by default)
 */
const TONES = ['active', 'accent', 'success', 'danger', 'visited', 'orange'];
const toneVars = (t: string) =>
  `.dv-tone-${t} { --dv-c: var(--dv-${t}); --dv-cf: var(--dv-${t}-fill); --dv-cs: var(--dv-${t}-stroke); --dv-cl: var(--dv-${t}-lip); }`;
const anyTone = `:is(${TONES.map((t) => `.dv-tone-${t}`).join(', ')})`;

// palette: 200 / 400 / 500 / 700 steps of each hue
const P = {
  yellow: ['#fdf3d3', '#f9d25c', '#f7c325', '#b78900'], // 200, 400, 500, 700
  blue: ['#dae2ff', '#abbdff', '#456dff', '#294bc6'], // 200, 300, 500, 700
  green: ['#d4f5dd', '#9fe8b3', '#29cc57', '#009b2b'],
  red: ['#ffdfdf', '#ffb6b6', '#ff5d5d', '#c43939'],
  purple: ['#ebe0ff', '#d3b8ff', '#9d62ff', '#7139cc'],
  orange: ['#ffe8d3', '#ffcc9c', '#ff8d23', '#ce6809'],
};

const LIGHT = `
  --dv-fg: #000; --dv-muted: #999; --dv-faint: #ccc; --dv-surface: #fff; --dv-muted-fill: #f2f2f2;
  --dv-stroke: #000; --dv-edge: #000; --dv-halo: #fff; --dv-grid: #e5e5e5;
  --dv-curve: ${P.blue[2]}; --dv-area: color-mix(in srgb, ${P.blue[1]} 70%, transparent); --dv-point: #ff775c;
  --dv-active: ${P.yellow[3]}; --dv-active-fill: ${P.yellow[1]}; --dv-active-stroke: #000;
  --dv-accent: ${P.blue[2]}; --dv-accent-fill: ${P.blue[1]}; --dv-accent-stroke: #000;
  --dv-success: ${P.green[3]}; --dv-success-fill: ${P.green[1]}; --dv-success-stroke: #000;
  --dv-danger: ${P.red[3]}; --dv-danger-fill: ${P.red[1]}; --dv-danger-stroke: #000;
  --dv-visited: ${P.purple[3]}; --dv-visited-fill: ${P.purple[1]}; --dv-visited-stroke: #000;
  --dv-orange: ${P.orange[3]}; --dv-orange-fill: ${P.orange[0]}; --dv-orange-stroke: ${P.orange[1]};
  --dv-band: ${P.yellow[0]};
  --dv-lip: #d4d4d4; --dv-active-lip: ${P.yellow[3]}; --dv-accent-lip: ${P.blue[3]}; --dv-success-lip: ${P.green[3]};
  --dv-danger-lip: ${P.red[3]}; --dv-visited-lip: ${P.purple[3]}; --dv-orange-lip: ${P.orange[3]}; --dv-muted-lip: #e5e5e5;`;

const DARK = `
  --dv-fg: #fff; --dv-muted: #8c8c8c; --dv-faint: #4c4c4c; --dv-surface: #1e1e1e; --dv-muted-fill: #2a2a2a;
  --dv-stroke: #f2f2f2; --dv-edge: #f2f2f2; --dv-halo: #1e1e1e; --dv-grid: #333;
  --dv-curve: #7491ff; --dv-area: color-mix(in srgb, #7491ff 35%, transparent); --dv-point: #ff8871;
  --dv-active: ${P.yellow[1]}; --dv-active-fill: #b78900; --dv-active-stroke: #f2f2f2;
  --dv-accent: #7491ff; --dv-accent-fill: #375ce3; --dv-accent-stroke: #f2f2f2;
  --dv-success: ${P.green[1]}; --dv-success-fill: #15b441; --dv-success-stroke: #f2f2f2;
  --dv-danger: ${P.red[1]}; --dv-danger-fill: #e14b4b; --dv-danger-stroke: #f2f2f2;
  --dv-visited: ${P.purple[1]}; --dv-visited-fill: #874de5; --dv-visited-stroke: #f2f2f2;
  --dv-orange: ${P.orange[1]}; --dv-orange-fill: #673404; --dv-orange-stroke: #ce6809;
  --dv-band: #5c4400;
  --dv-lip: #4c4c4c; --dv-active-lip: #5c4400; --dv-accent-lip: #142563; --dv-success-lip: #004e16;
  --dv-danger-lip: #621c1c; --dv-visited-lip: #381d66; --dv-orange-lip: #291502; --dv-muted-lip: #333;`;

/*
 * The tactile look: solid things sit on a lip, like Brilliant's chunky tiles.
 * Opt in with data-dv-look="tactile" on any ancestor (data-dv-look="flat" on
 * a diagram opts back out). It is pure CSS, so layouts know nothing about it:
 *
 *   - the lip is a hard drop-shadow (no blur) in a darker shade of the fill;
 *   - hover lifts a clickable shape 1px, pressing sinks it onto its lip;
 *   - a dragged shape gets .dv-grabbed from the renderer and lifts right off;
 *   - each layout emits a shape's label right after it, so "shape + text"
 *     selectors carry the label along with the shape.
 */
const T = ':is(:where([data-dv-look="tactile"]) .dv-root, .dv-root[data-dv-look="tactile"]):not([data-dv-look="flat"])';
const SOLID = ':is(.dv-rect, .dv-circle):not([class*="dv-role-"], .dv-tone-ghost)';
const lip = (extra = '0px') => `drop-shadow(0 calc(var(--dv-depth) + ${extra}) 0 var(--dv-cl, var(--dv-lip)))`;
const TACTILE = /* css */ `
${T} { --dv-depth: 4px; }
/* outline and lip are one colour: the tile reads as a single solid object */
${T} ${SOLID} { stroke: var(--dv-cl, var(--dv-lip)); stroke-width: 2px; filter: ${lip()}; }
${T} ${SOLID}.dv-tone-muted { --dv-cl: var(--dv-muted-lip); }
${T} ${SOLID}.dv-interactive:not(.dv-draggable):hover { transform: translateY(-1px); filter: ${lip('1px')}; }
${T} ${SOLID}.dv-interactive:not(.dv-draggable):hover + .dv-text { transform: translateY(-1px); }
${T} ${SOLID}.dv-interactive:not(.dv-draggable):active { transform: translateY(var(--dv-depth)); filter: ${lip('-1 * var(--dv-depth)')}; transition-duration: .05s; }
${T} ${SOLID}.dv-interactive:not(.dv-draggable):active + .dv-text { transform: translateY(var(--dv-depth)); transition-duration: .05s; }
${T} ${SOLID}.dv-grabbed { transform: translateY(-4px); filter: ${lip('4px')} drop-shadow(0 10px 8px rgb(0 0 0 / .18)); }
${T} ${SOLID}.dv-grabbed + .dv-text { transform: translateY(-4px); }
/* handles become little buttons too */
${T} .dv-circle.dv-role-handle { filter: drop-shadow(0 3px 0 color-mix(in srgb, var(--dv-c, var(--dv-point)) 55%, #000)); }
${T} .dv-role-hit.dv-grabbed + .dv-role-handle { transform: translateY(-3px) scale(1.35); filter: drop-shadow(0 6px 0 color-mix(in srgb, var(--dv-c, var(--dv-point)) 55%, #000)) drop-shadow(0 10px 8px rgb(0 0 0 / .2)); }
`;

export const DEFAULT_CSS = /* css */ `
/* ── 1. vocabulary ─────────────────────────────────────────────── */
.dv-root, .dvc {
  --dv-font: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --dv-mono: "Source Code Pro", ui-monospace, "SF Mono", Menlo, monospace;
  --dv-math-font: "STIX Two Text", "Latin Modern Roman", "Cambria Math", "Times New Roman", serif;
  --dv-stroke-w: 1.5px;${LIGHT}
  font-family: var(--dv-font);
}
.dv-root { overflow: visible; }
/* the svg itself can take focus on click in Chromium; only its draggable parts are real focus targets */
.dv-root:focus { outline: none; }
.dv-root.dv-clip { overflow: hidden; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not(.light) :is(.dv-root, .dvc) {${DARK}
  }
}
:root[data-theme="dark"] :is(.dv-root, .dvc), :root.dark :is(.dv-root, .dvc), .dark :is(.dv-root, .dvc) {${DARK}
}

/* ── 2. base rules ─────────────────────────────────────────────── */
.dv { transition: fill .25s ease, stroke .25s ease, filter .12s ease, transform .12s ease; }
.dv-circle, .dv-rect, .dv-path { fill: var(--dv-surface); stroke: var(--dv-stroke); stroke-width: var(--dv-stroke-w); }
.dv-path { stroke-linecap: round; stroke-linejoin: round; }
.dv-path.dv-open { fill: none; }
.dv-arrow { --dv-ink: var(--dv-edge); fill: none; stroke: var(--dv-ink); stroke-linecap: round; stroke-linejoin: round; }
.dv-head-solid { fill: var(--dv-ink); }
/* lines never steal the pointer from the handle or shape underneath them */
.dv-arrow:not(.dv-interactive, .dv-draggable), .dv-path.dv-open:not(.dv-interactive, .dv-draggable), .dv-role-outline { pointer-events: none; }
.dv-text { fill: var(--dv-fg); pointer-events: none; user-select: none; font-variant-numeric: tabular-nums; font-weight: 500; }
.dv-dashed { stroke-dasharray: 6 5; }

${TONES.map(toneVars).join('\n')}
:is(.dv-circle, .dv-rect, .dv-path)${anyTone} { fill: var(--dv-cf); stroke: var(--dv-cs); }
.dv-path.dv-open${anyTone} { fill: none; }
.dv-arrow${anyTone} { --dv-ink: var(--dv-c); }
.dv-text${anyTone} { fill: var(--dv-fg); }
.dv-tone-muted:is(.dv-circle, .dv-rect, .dv-path) { fill: var(--dv-muted-fill); stroke: var(--dv-faint); }
.dv-path.dv-open.dv-tone-muted { fill: none; }
.dv-arrow.dv-tone-muted { --dv-ink: var(--dv-faint); }
.dv-text.dv-tone-muted { fill: var(--dv-muted); }
.dv-tone-ghost:is(.dv-circle, .dv-rect, .dv-path) { fill: none; stroke: var(--dv-faint); stroke-dasharray: 4 4; }

/* ── roles: semantic parts emitted by the layouts ─────────────── */
.dv-text.dv-role-value { fill: var(--dv-fg); font-weight: 600; }
.dv-text.dv-role-value.dv-tone-muted { fill: var(--dv-muted); }
.dv-text.dv-role-math { font-family: var(--dv-math-font); font-weight: 400; }
/* numbers on plot axes and measurements are maths too: upright serif */
.dv-text.dv-role-tick-label { font-family: var(--dv-math-font); font-weight: 400; fill: var(--dv-fg); }
/* code identifiers (lo, hi, mid, curr…) are code: monospace */
.dv-text.dv-role-pointer-label, .dv-text.dv-role-code { font-family: var(--dv-mono); font-weight: 600; }
/* maths labels sitting on grids and curves get a halo so they stay legible */
.dv-text.dv-role-math, .dv-text.dv-role-tick-label { paint-order: stroke; stroke: var(--dv-halo); stroke-width: 4px; stroke-linejoin: round; }
.dv-text.dv-role-index { fill: var(--dv-muted); font-weight: 500; }
.dv-text.dv-role-caption { fill: var(--dv-muted); font-weight: 500; letter-spacing: .02em; }
.dv-text.dv-role-pointer-label${anyTone}, .dv-text.dv-role-label${anyTone} { fill: var(--dv-c); }
.dv-role-tag { display: none; }
.dv-rect.dv-role-window { fill: var(--dv-band); stroke: none; }
.dv-role-edge-label { paint-order: stroke; stroke: var(--dv-halo); stroke-width: 5px; stroke-linejoin: round; font-weight: 600; }
.dv-text.dv-role-edge-label${anyTone} { fill: var(--dv-c); }
.dv-role-null { fill: var(--dv-muted); }
.dv-circle.dv-role-dot { fill: var(--dv-edge); stroke: none; }

/* plots */
.dv-path.dv-role-grid { stroke: var(--dv-grid); fill: none; }
.dv-path.dv-role-axis { stroke: var(--dv-fg); fill: none; }
.dv-arrow.dv-role-axis { --dv-ink: var(--dv-fg); }
.dv-path.dv-role-tick { stroke: var(--dv-fg); }
.dv-path.dv-role-curve { fill: none; }
.dv-path.dv-role-curve:not(${anyTone}, .dv-tone-muted) { stroke: var(--dv-curve); }
.dv-path.dv-role-curve${anyTone} { stroke: var(--dv-c); }
.dv-path.dv-role-area { stroke: none; fill: var(--dv-area); }
.dv-path.dv-role-region { stroke: none; fill: var(--dv-area); }
.dv-path.dv-role-region${anyTone} { fill: var(--dv-cf); }
.dv-path.dv-role-region.dv-tone-muted { fill: transparent; }
.dv-path.dv-role-guide { fill: none; stroke: var(--dv-fg); stroke-dasharray: 4 4; stroke-width: 1.5; }
.dv-path.dv-role-glow { fill: none; stroke: var(--dv-fg); stroke-dasharray: 5 5; stroke-width: 2; filter: drop-shadow(0 0 3px #5cf0b6) drop-shadow(0 0 7px #5cf0b6); }
.dv-path.dv-role-marker { fill: var(--dv-c, var(--dv-muted)); stroke: none; }
.dv-path.dv-role-bar, .dv-rect.dv-role-bar { stroke: var(--dv-stroke); stroke-width: 1.5px; }
.dv-rect.dv-role-bar:not(${anyTone}, .dv-tone-muted), .dv-path.dv-role-bar:not(${anyTone}, .dv-tone-muted) { fill: var(--dv-accent-fill); }
.dv-rect.dv-role-track { fill: var(--dv-muted-fill); stroke: none; }
:is(.dv-path, .dv-circle).dv-role-outline { fill: none; }
.dv-circle.dv-role-outline${anyTone} { stroke: var(--dv-c); }
.dv-rect.dv-role-universe { fill: var(--dv-surface); stroke: var(--dv-stroke); }
.dv-rect.dv-role-universe${anyTone} { fill: var(--dv-cf); }
.dv-rect.dv-role-frame { fill: var(--dv-muted-fill); stroke: none; }
.dv-rect.dv-role-frame${anyTone} { fill: color-mix(in srgb, var(--dv-cf) 45%, var(--dv-surface)); }

/* draggable handles: a big invisible hit target, then the visible dot */
:is(.dv-circle, .dv-rect).dv-role-hit { fill: transparent; stroke: none; pointer-events: all; }
.dv-circle.dv-role-handle { pointer-events: none; transform-box: fill-box; transform-origin: center; stroke: var(--dv-surface); stroke-width: 2.5px; transition: transform .15s ease, fill .25s ease; filter: drop-shadow(0 1px 2px rgb(0 0 0 / .3)); }
.dv-circle.dv-role-handle:not(${anyTone}) { fill: var(--dv-point); }
.dv-circle.dv-role-handle${anyTone} { fill: var(--dv-c); }
.dv-role-hit:hover + .dv-role-handle { transform: scale(1.35); }
/* keyboard focus: no browser box around the invisible target; ring the dot instead */
.dv-draggable:focus { outline: none; }
.dv-role-hit:focus-visible + .dv-role-handle { transform: scale(1.35); stroke: var(--dv-fg); stroke-width: 2.5px; }
.dv-draggable:not(.dv-role-hit):focus-visible { stroke: var(--dv-fg); stroke-width: 3px; }
.dv-circle.dv-role-pulse { fill: none; stroke: var(--dv-c, var(--dv-point)); stroke-width: 2px; pointer-events: none; transform-box: fill-box; transform-origin: center; animation: dv-pulse 1.6s ease-out infinite; }
@keyframes dv-pulse { 0% { transform: scale(1); opacity: .9; } 80%, 100% { transform: scale(3); opacity: 0; } }
.dv-circle.dv-role-particle { stroke: none; fill: var(--dv-cf); pointer-events: none; }
.dv-text.dv-role-label { fill: var(--dv-fg); }

/* interactive: clickable shapes get a pointer and a gentle hover; nothing else changes */
.dv-interactive { cursor: pointer; }
:is(.dv-rect, .dv-circle).dv-interactive:not(.dv-role-hit, .dv-role-universe):hover { filter: brightness(.96); stroke-width: 2px; }
:root[data-theme="dark"] :is(.dv-rect, .dv-circle).dv-interactive:not(.dv-role-hit, .dv-role-universe):hover { filter: brightness(1.15); }
.dv-path.dv-role-region.dv-interactive { cursor: pointer; }
.dv-path.dv-role-region.dv-interactive:hover { fill: color-mix(in srgb, var(--dv-cf, var(--dv-active-fill)) 60%, transparent); }
.dv-draggable { cursor: grab; touch-action: none; }
.dv-root.dv-dragging, .dv-root.dv-dragging .dv-draggable { cursor: grabbing; }
@media (prefers-reduced-motion: reduce) { .dv-circle.dv-role-pulse { animation: none; opacity: .5; } }
${TACTILE}
`;

const STYLE_ID = 'dsviz-default-styles';

/** Add the default stylesheet to <head> once. Safe to call repeatedly. */
export function injectStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const el = doc.createElement('style');
  el.id = STYLE_ID;
  el.textContent = DEFAULT_CSS;
  doc.head.appendChild(el);
}
