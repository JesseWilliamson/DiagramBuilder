/**
 * Stylesheet. Two layers:
 *
 *  1. Variables on `.dv-root` — the full vocabulary of the look. Dark-first,
 *     matched to getbetter: near-black surface, thin 1px ink outlines, small
 *     type, monospace numerals, a blue accent, green for "good".
 *  2. Base rules that only ever read variables (never literal colours).
 *
 * Light mode is a variable override, not a second theme: it applies under
 * `[data-theme="light"]` / `.light` (or the OS setting when neither is set). Controls carry the `dvc` class so they get the same variables..
 * Apps re-skin by overriding variables on any ancestor, no JS needed:
 *   .my-app .dv-root { --dv-accent: hotpink; }
 *
 * Tones (`tone: 'active'`) become classes. Each tone exposes three colours:
 *   --dv-c   ink    (arrows, text)
 *   --dv-cf  fill   (shapes)
 *   --dv-cs  stroke (shape outlines)
 * so "highlighted cells get a light tint but keep a crisp outline" is just
 * the default fill/stroke formula, and any tone can override either half.
 */
const TONES = ['active', 'accent', 'success', 'danger', 'visited'];
const toneVars = (t: string) =>
  `.dv-tone-${t} { --dv-c: var(--dv-${t}); --dv-cf: var(--dv-${t}-fill); --dv-cs: var(--dv-${t}-stroke); }`;
const toneDefaults = TONES.map(
  (t) => `--dv-${t}-fill: color-mix(in srgb, var(--dv-${t}) var(--dv-tint), var(--dv-surface)); --dv-${t}-stroke: var(--dv-${t});`,
).join('\n  ');
const anyTone = `:is(${TONES.map((t) => `.dv-tone-${t}`).join(', ')})`;

const LIGHT = `
  --dv-fg: #1a1d24; --dv-muted: #8b919d; --dv-surface: #ffffff; --dv-muted-fill: #f1f2f5;
  --dv-stroke: #3a4150; --dv-edge: #3a4150; --dv-halo: #ffffff;
  --dv-active: #b7791f; --dv-accent: #2f6fe4; --dv-success: #1b8a52; --dv-danger: #d03a3a; --dv-visited: #7c5ce0;
  --dv-tint: 16%;`;

export const DEFAULT_CSS = /* css */ `
/* ── 1. vocabulary (dark-first) ────────────────────────────────── */
.dv-root, .dvc {
  --dv-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --dv-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --dv-label-font: var(--dv-mono);
  --dv-math-font: "STIX Two Text", "Latin Modern Roman", Georgia, serif;
  --dv-value-weight: 500;
  --dv-fg: #e8eaee; --dv-muted: #7a8190; --dv-surface: #17191e; --dv-muted-fill: #1d2026;
  --dv-stroke: #9aa2b1; --dv-edge: #9aa2b1; --dv-halo: #17191e; --dv-stroke-w: 1px;
  --dv-active: #e9b44c; --dv-accent: #5b9dff; --dv-success: #4cc38a; --dv-danger: #ff7a7a; --dv-visited: #a993ff;
  --dv-tint: 22%;
  ${toneDefaults}
  --dv-band: color-mix(in srgb, var(--dv-accent) 8%, transparent);
  font-family: var(--dv-font);
}
.dv-root { overflow: visible; }
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]):not(.dark) :is(.dv-root, .dvc) {${LIGHT}
  }
}
:root[data-theme="light"] :is(.dv-root, .dvc), :root.light :is(.dv-root, .dvc), .light :is(.dv-root, .dvc) {${LIGHT}
}

/* ── 2. base rules ─────────────────────────────────────────────── */
.dv { transition: fill .3s ease, stroke .3s ease, stroke-width .2s ease; }
.dv-circle, .dv-rect, .dv-path { fill: var(--dv-surface); stroke: var(--dv-stroke); stroke-width: var(--dv-stroke-w); }
.dv-path { stroke-linecap: round; stroke-linejoin: round; }
.dv-path.dv-open { fill: none; }
.dv-arrow { --dv-ink: var(--dv-edge); fill: none; stroke: var(--dv-ink); stroke-linecap: round; stroke-linejoin: round; }
.dv-head-solid { fill: var(--dv-ink); }
.dv-text { fill: var(--dv-fg); pointer-events: none; user-select: none; font-variant-numeric: tabular-nums; }
.dv-dashed { stroke-dasharray: 5 5; }

${TONES.map(toneVars).join('\n')}
:is(.dv-circle, .dv-rect, .dv-path)${anyTone} { fill: var(--dv-cf); stroke: var(--dv-cs); }
.dv-path.dv-open${anyTone} { fill: none; }
.dv-arrow${anyTone} { --dv-ink: var(--dv-c); }
.dv-text${anyTone} { fill: var(--dv-c); }
.dv-tone-muted:is(.dv-circle, .dv-rect, .dv-path) { fill: var(--dv-muted-fill); stroke: var(--dv-muted); }
.dv-path.dv-open.dv-tone-muted { fill: none; }
.dv-arrow.dv-tone-muted { --dv-ink: var(--dv-muted); }
.dv-text.dv-tone-muted { fill: var(--dv-muted); }
.dv-tone-ghost:is(.dv-circle, .dv-rect, .dv-path) { fill: none; stroke: var(--dv-muted); stroke-dasharray: 4 4; }

/* roles: semantic parts emitted by the layouts */
.dv-text.dv-role-value { fill: var(--dv-fg); font-family: var(--dv-label-font); font-weight: var(--dv-value-weight); }
.dv-text.dv-role-value.dv-tone-muted { fill: var(--dv-muted); }
.dv-text.dv-role-math { font-family: var(--dv-math-font); font-style: italic; }
.dv-role-index, .dv-role-caption { fill: var(--dv-muted); font-family: var(--dv-label-font); }
.dv-role-pointer-label { font-weight: 500; font-family: var(--dv-label-font); }
.dv-role-tag { display: none; }
.dv-rect.dv-role-window { fill: var(--dv-band); stroke: var(--dv-accent); stroke-width: 1; stroke-dasharray: 4 3; }
.dv-role-edge-label { paint-order: stroke; stroke: var(--dv-halo); stroke-width: 5px; stroke-linejoin: round; }
.dv-role-null { fill: var(--dv-muted); }
.dv-circle.dv-role-dot { fill: var(--dv-edge); stroke: none; }

.dv-interactive { cursor: pointer; }
.dv-draggable { cursor: grab; touch-action: none; }
.dv-root.dv-dragging, .dv-root.dv-dragging .dv-draggable { cursor: grabbing; }
.dv-interactive:hover { stroke-width: 1.8; }
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
