/**
 * Stylesheet. Three layers:
 *
 *  1. Variables on `.dv-root` — the full vocabulary a theme can set.
 *  2. Base rules that only ever read variables (never literal colours).
 *  3. One block per theme: `.dv-theme-<name>` redefines variables, plus a few
 *     rules for things a variable can't express (the lip shadow, pill tags).
 *
 * Tones (`tone: 'active'`) become classes. Each tone exposes three colours:
 *   --dv-c   ink    (arrows, text)
 *   --dv-cf  fill   (shapes)
 *   --dv-cs  stroke (shape outlines)
 * so a theme can say "highlighted cells are light blue but keep black outlines"
 * (textbook) or "highlighted cells are tinted with a matching coloured edge" (brilliant).
 *
 * Re-theme from your app without touching JS:
 *   .my-app .dv-theme-brilliant { --dv-active: hotpink; }
 */
const TONES = ['active', 'accent', 'success', 'danger', 'visited'];
const toneVars = (t) => `.dv-tone-${t} { --dv-c: var(--dv-${t}); --dv-cf: var(--dv-${t}-fill); --dv-cs: var(--dv-${t}-stroke); }`;
const toneDefaults = TONES.map((t) => `--dv-${t}-fill: color-mix(in srgb, var(--dv-${t}) var(--dv-tint), var(--dv-surface)); --dv-${t}-stroke: var(--dv-${t});`).join('\n  ');
const anyTone = `:is(${TONES.map((t) => `.dv-tone-${t}`).join(', ')})`;
export const DEFAULT_CSS = /* css */ `
/* ── 1. vocabulary ─────────────────────────────────────────────── */
.dv-root {
  --dv-font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --dv-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --dv-label-font: var(--dv-mono);
  --dv-value-weight: 600;
  --dv-fg: #1d2330; --dv-muted: #8a93a3; --dv-surface: #ffffff; --dv-muted-fill: var(--dv-surface);
  --dv-stroke: #3a4252; --dv-edge: #3a4252; --dv-halo: #ffffff; --dv-stroke-w: 2px;
  --dv-active: #e8a317; --dv-accent: #3d6cf0; --dv-success: #1f9d63; --dv-danger: #e04848; --dv-visited: #8b6cf0;
  --dv-tint: 20%;
  ${toneDefaults}
  --dv-band: color-mix(in srgb, var(--dv-accent) 8%, transparent);
  font-family: var(--dv-font);
  overflow: visible;
}

/* ── 2. base rules ─────────────────────────────────────────────── */
.dv { transition: fill .3s ease, stroke .3s ease, stroke-width .2s ease; }
.dv-circle, .dv-rect { fill: var(--dv-surface); stroke: var(--dv-stroke); stroke-width: var(--dv-stroke-w); }
.dv-arrow { --dv-ink: var(--dv-edge); fill: none; stroke: var(--dv-ink); stroke-linecap: round; stroke-linejoin: round; }
.dv-head-solid { fill: var(--dv-ink); }
.dv-text { fill: var(--dv-fg); pointer-events: none; user-select: none; font-variant-numeric: tabular-nums; }
.dv-dashed { stroke-dasharray: 5 5; }

${TONES.map(toneVars).join('\n')}
:is(.dv-circle, .dv-rect)${anyTone} { fill: var(--dv-cf); stroke: var(--dv-cs); }
.dv-arrow${anyTone} { --dv-ink: var(--dv-c); }
.dv-text${anyTone} { fill: var(--dv-c); }
.dv-tone-muted:is(.dv-circle, .dv-rect) { fill: var(--dv-muted-fill); stroke: var(--dv-muted); }
.dv-arrow.dv-tone-muted { --dv-ink: var(--dv-muted); }
.dv-text.dv-tone-muted { fill: var(--dv-muted); }
.dv-tone-ghost:is(.dv-circle, .dv-rect) { fill: none; stroke: var(--dv-muted); stroke-dasharray: 4 4; }

/* roles: semantic parts emitted by the layouts */
.dv-text.dv-role-value { fill: var(--dv-fg); font-weight: var(--dv-value-weight); }
.dv-text.dv-role-value.dv-tone-muted { fill: var(--dv-muted); }
.dv-role-index, .dv-role-caption { fill: var(--dv-muted); font-family: var(--dv-label-font); }
.dv-role-pointer-label { font-weight: 600; font-family: var(--dv-label-font); }
.dv-role-tag { display: none; }
.dv-rect.dv-role-window { fill: var(--dv-band); stroke: var(--dv-accent); stroke-width: 1.5; stroke-dasharray: 6 4; }
.dv-role-edge-label { paint-order: stroke; stroke: var(--dv-halo); stroke-width: 5px; stroke-linejoin: round; }
.dv-role-null { fill: var(--dv-muted); }
.dv-circle.dv-role-dot { fill: var(--dv-edge); stroke: none; }

.dv-interactive { cursor: pointer; }
.dv-draggable { cursor: grab; touch-action: none; }
.dv-root.dv-dragging, .dv-root.dv-dragging .dv-draggable { cursor: grabbing; }
.dv-theme-plain .dv-interactive:hover { stroke-width: 3; }

/* ── 3a. plain: dark mode ──────────────────────────────────────── */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .dv-theme-plain {
    --dv-fg: #e6e9ef; --dv-muted: #7d8696; --dv-surface: #1b2029; --dv-stroke: #aab3c2; --dv-edge: #aab3c2; --dv-halo: #12161d;
    --dv-active: #f2b84b; --dv-accent: #7b9cff; --dv-success: #3cc488; --dv-danger: #ff6b6b; --dv-visited: #a993ff; --dv-tint: 28%;
  }
}
:root[data-theme="dark"] .dv-theme-plain {
  --dv-fg: #e6e9ef; --dv-muted: #7d8696; --dv-surface: #1b2029; --dv-stroke: #aab3c2; --dv-edge: #aab3c2; --dv-halo: #12161d;
  --dv-active: #f2b84b; --dv-accent: #7b9cff; --dv-success: #3cc488; --dv-danger: #ff6b6b; --dv-visited: #a993ff; --dv-tint: 28%;
}

/* ── 3b. brilliant: chunky tiles, soft fills, lip shadow, pill tags ── */
.dv-theme-brilliant {
  --dv-font: "Nunito", ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
  --dv-label-font: var(--dv-font);
  --dv-value-weight: 800;
  --dv-fg: #1b2240; --dv-muted: #a3abbf; --dv-surface: #ffffff; --dv-muted-fill: #f0f2f7;
  --dv-stroke: #d9deea; --dv-edge: #8c96ad; --dv-halo: #f5f7fb; --dv-stroke-w: 2.5px;
  --dv-active: #f4b000; --dv-accent: #3f7dff; --dv-success: #22b366; --dv-danger: #ff5b4f; --dv-visited: #8b5cf6;
  --dv-tint: 34%;
  --dv-band: color-mix(in srgb, var(--dv-accent) 11%, transparent);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .dv-theme-brilliant {
    --dv-fg: #eef1fa; --dv-muted: #7a84a0; --dv-surface: #262c41; --dv-muted-fill: #1f2436;
    --dv-stroke: #3a425c; --dv-edge: #8a93ad; --dv-halo: #171b28; --dv-tint: 42%;
    --dv-active: #ffc229; --dv-accent: #6b9bff; --dv-success: #39cc7f; --dv-danger: #ff6f63; --dv-visited: #a37bff;
  }
}
:root[data-theme="dark"] .dv-theme-brilliant {
  --dv-fg: #eef1fa; --dv-muted: #7a84a0; --dv-surface: #262c41; --dv-muted-fill: #1f2436;
  --dv-stroke: #3a425c; --dv-edge: #8a93ad; --dv-halo: #171b28; --dv-tint: 42%;
  --dv-active: #ffc229; --dv-accent: #6b9bff; --dv-success: #39cc7f; --dv-danger: #ff6f63; --dv-visited: #a37bff;
}
.dv-theme-brilliant :is(.dv-rect, .dv-circle):not(.dv-role-window, .dv-role-tag, .dv-role-dot, .dv-tone-ghost) { filter: url(#dv-lift); }
.dv-theme-brilliant .dv-interactive:hover, .dv-theme-brilliant .dv-draggable:hover { filter: url(#dv-lift-hi); }
.dv-theme-brilliant .dv-rect.dv-role-window { stroke: none; }
.dv-theme-brilliant .dv-rect.dv-role-tag { display: inline; fill: var(--dv-c, var(--dv-accent)); stroke: none; }
.dv-theme-brilliant .dv-text.dv-role-pointer-label { fill: #ffffff; font-weight: 800; }
.dv-theme-brilliant .dv-role-index { font-weight: 700; }
.dv-theme-brilliant .dv-role-edge-label { font-weight: 800; }

/* ── 3c. textbook: Diagramatics / LaTeX figure ─────────────────── */
.dv-theme-textbook {
  --dv-font: "STIX Two Text", "Latin Modern Roman", "Cambria Math", Georgia, serif;
  --dv-label-font: var(--dv-font);
  --dv-value-weight: 400;
  --dv-fg: #111111; --dv-muted: #8f8f8f; --dv-surface: #ffffff; --dv-muted-fill: #eeeeee;
  --dv-stroke: #111111; --dv-edge: #111111; --dv-halo: #ffffff; --dv-stroke-w: 1.4px;
  --dv-active: #0b57d0; --dv-accent: #0b57d0; --dv-success: #127a3a; --dv-danger: #c0262d; --dv-visited: #7a2fb8;
  --dv-active-fill: #add8e6; --dv-accent-fill: #dce9fb; --dv-success-fill: #90ee90; --dv-danger-fill: #f08080; --dv-visited-fill: #dda0dd;
  --dv-active-stroke: var(--dv-stroke); --dv-accent-stroke: var(--dv-stroke); --dv-success-stroke: var(--dv-stroke);
  --dv-danger-stroke: var(--dv-stroke); --dv-visited-stroke: var(--dv-stroke);
  --dv-band: transparent;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .dv-theme-textbook {
    --dv-fg: #ececec; --dv-muted: #8a8a8a; --dv-surface: #161616; --dv-muted-fill: #232323; --dv-stroke: #ececec; --dv-edge: #ececec; --dv-halo: #161616;
    --dv-active: #8ab4ff; --dv-accent: #8ab4ff; --dv-success: #7ddc97; --dv-danger: #ff8a8a; --dv-visited: #d3a4ff;
    --dv-active-fill: #1f4d63; --dv-accent-fill: #1d2c47; --dv-success-fill: #1f5130; --dv-danger-fill: #6b2626; --dv-visited-fill: #4f2a5a;
  }
}
:root[data-theme="dark"] .dv-theme-textbook {
  --dv-fg: #ececec; --dv-muted: #8a8a8a; --dv-surface: #161616; --dv-muted-fill: #232323; --dv-stroke: #ececec; --dv-edge: #ececec; --dv-halo: #161616;
  --dv-active: #8ab4ff; --dv-accent: #8ab4ff; --dv-success: #7ddc97; --dv-danger: #ff8a8a; --dv-visited: #d3a4ff;
  --dv-active-fill: #1f4d63; --dv-accent-fill: #1d2c47; --dv-success-fill: #1f5130; --dv-danger-fill: #6b2626; --dv-visited-fill: #4f2a5a;
}
.dv-theme-textbook .dv-rect.dv-role-window { stroke: var(--dv-stroke); stroke-width: 1; stroke-dasharray: 4 3; }
.dv-theme-textbook :is(.dv-role-pointer-label, .dv-role-index, .dv-role-caption) { font-style: italic; font-weight: 400; }
.dv-theme-textbook .dv-role-pointer-label { font-size: 16px; }
.dv-theme-textbook .dv-interactive:hover { stroke-width: 2.2; }
`;
/** Filters for the "lip" under tiles: the shape itself, offset down and darkened. */
export const LIFT_DEFS = /* svg */ `
<filter id="dv-lift" x="-20%" y="-20%" width="140%" height="160%" color-interpolation-filters="sRGB">
  <feOffset in="SourceGraphic" dy="3.5" result="o"/>
  <feComponentTransfer in="o" result="d"><feFuncR type="linear" slope="0.8"/><feFuncG type="linear" slope="0.8"/><feFuncB type="linear" slope="0.84"/></feComponentTransfer>
  <feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="dv-lift-hi" x="-20%" y="-20%" width="140%" height="170%" color-interpolation-filters="sRGB">
  <feOffset in="SourceGraphic" dy="6" result="o"/>
  <feComponentTransfer in="o" result="d"><feFuncR type="linear" slope="0.78"/><feFuncG type="linear" slope="0.78"/><feFuncB type="linear" slope="0.82"/></feComponentTransfer>
  <feMerge><feMergeNode in="d"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>`;
const STYLE_ID = 'dsviz-default-styles';
/** Add the default stylesheet to <head> once. Safe to call repeatedly. */
export function injectStyles(doc = document) {
    if (doc.getElementById(STYLE_ID))
        return;
    const el = doc.createElement('style');
    el.id = STYLE_ID;
    el.textContent = DEFAULT_CSS;
    doc.head.appendChild(el);
}
