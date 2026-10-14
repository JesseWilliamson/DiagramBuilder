/* dsviz — MIT */
// ── vec.js ──
const V2 = (x, y) => ({ x, y });
const vadd = (a, b) => V2(a.x + b.x, a.y + b.y);
const vsub = (a, b) => V2(a.x - b.x, a.y - b.y);
const vscale = (a, k) => V2(a.x * k, a.y * k);
const vlen = (a) => Math.hypot(a.x, a.y);
const vdist = (a, b) => vlen(vsub(a, b));
const vlerp = (a, b, t) => V2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
/** Unit vector in the same direction (or (0,0) for the zero vector). */
const vnorm = (a) => {
    const l = vlen(a);
    return l < 1e-9 ? V2(0, 0) : V2(a.x / l, a.y / l);
};
/** Rotate 90° clockwise on screen (because +y is down). */
const vperp = (a) => V2(-a.y, a.x);

// ── easing.js ──
const linear = (t) => t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Overshoots by ~8% then settles: the "bouncy" feel of playful UIs. */
const easeOutBack = (t) => {
    const c1 = 1.4, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// ── themes.js ──
/**
 * Themes.
 *
 * A theme is three things, because "how it looks" lives in three places:
 *
 *  1. LOOK     – colours, fonts, stroke widths, shadows. Pure CSS, keyed off the
 *                class `dv-theme-<name>` on the <svg> (see styles.ts).
 *  2. GEOMETRY – things CSS can't reliably change on SVG: corner radius scale,
 *                line thickness (the arrowhead size depends on it), arrowhead shape.
 *                The renderer applies these in describe().
 *  3. FEEL     – easing + duration. A bouncy spring-ish ease reads as playful;
 *                a quick ease-in-out reads as precise.
 *
 * The layouts never see the theme. They emit semantic parts (a cell, a value,
 * a pointer tag) and the theme decides how each part looks — including whether
 * it's shown at all (the textbook theme hides pointer tags).
 */

const themes = {
    plain: {
        name: 'plain',
        ease: easeInOutCubic,
        duration: 450,
        geometry: { rxScale: 1, strokeScale: 1, head: 'chevron', headScale: 1 },
    },
    /** Chunky, tactile, playful: soft fills, a darker lip under each tile, bouncy motion. */
    brilliant: {
        name: 'brilliant',
        ease: easeOutBack,
        duration: 560,
        lift: true,
        geometry: { rxScale: 1.6, strokeScale: 1.4, head: 'triangle', headScale: 0.85 },
        fonts: 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap',
    },
    /** Textbook figure, Diagramatics-style: hairline black strokes, light named fills, serif italic labels. */
    textbook: {
        name: 'textbook',
        ease: easeInOutCubic,
        duration: 380,
        geometry: { rxScale: 0.12, strokeScale: 0.7, head: 'triangle', headScale: 1.05 },
        fonts: 'https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;1,400&display=swap',
    },
};
let defaultTheme = themes.plain;
/** The theme createView() uses when you don't pass one. */
function setDefaultTheme(t) {
    defaultTheme = t;
}
function getDefaultTheme() {
    return defaultTheme;
}

// ── scene.js ──
// ── constructors ─────────────────────────────────────────────────────────────
// They only add `kind`; nodes are plain objects so you can spread / tweak them.
const circle = (o) => ({ kind: 'circle', ...o });
const rect = (o) => ({ kind: 'rect', ...o });
const text = (o) => ({ kind: 'text', ...o });
const arrow = (o) => ({ kind: 'arrow', ...o });
/**
 * Flatten any mix of layouts / nodes / arrays into one Scene.
 * Falsy parts are skipped so you can write `showMid && pointer(...)`.
 */
function combine(...parts) {
    const nodes = [];
    for (const p of parts) {
        if (!p)
            continue;
        if (Array.isArray(p))
            nodes.push(...p);
        else if ('nodes' in p)
            nodes.push(...p.nodes);
        else
            nodes.push(p);
    }
    return { nodes };
}
/** Shift every node in a part by (dx, dy). Returns new nodes (inputs untouched). */
function translate(part, dx, dy) {
    return {
        nodes: combine(part).nodes.map((n) => {
            if (n.kind === 'arrow')
                return { ...n, x1: n.x1 + dx, y1: n.y1 + dy, x2: n.x2 + dx, y2: n.y2 + dy };
            return { ...n, x: n.x + dx, y: n.y + dy };
        }),
    };
}
/** Apply the same tone/role/etc to every node of a part. */
function style(part, patch) {
    return { nodes: combine(part).nodes.map((n) => ({ ...n, ...patch })) };
}
/** Rough text width: SVG can't measure text without the DOM, so we estimate. */
const estimateTextWidth = (s, size) => s.length * size * 0.6;
/** Axis-aligned bounds of a node (text and curves are approximated). */
function nodeBounds(n) {
    switch (n.kind) {
        case 'circle':
            return { x: n.x - n.r, y: n.y - n.r, w: 2 * n.r, h: 2 * n.r };
        case 'rect':
            return { x: n.x - n.w / 2, y: n.y - n.h / 2, w: n.w, h: n.h };
        case 'text': {
            const size = n.size ?? 16;
            const w = estimateTextWidth(n.text, size);
            const x = n.anchor === 'start' ? n.x : n.anchor === 'end' ? n.x - w : n.x - w / 2;
            return { x, y: n.y - size / 2, w, h: size };
        }
        case 'arrow': {
            const b = Math.abs(n.bend ?? 0) / 2; // a quadratic peaks at half its control offset
            const x = Math.min(n.x1, n.x2) - b;
            const y = Math.min(n.y1, n.y2) - b;
            return { x, y, w: Math.abs(n.x2 - n.x1) + 2 * b, h: Math.abs(n.y2 - n.y1) + 2 * b };
        }
    }
}
function bounds(part) {
    const nodes = combine(part).nodes;
    if (!nodes.length)
        return { x: 0, y: 0, w: 0, h: 0 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodes) {
        const b = nodeBounds(n);
        x0 = Math.min(x0, b.x);
        y0 = Math.min(y0, b.y);
        x1 = Math.max(x1, b.x + b.w);
        y1 = Math.max(y1, b.y + b.h);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/** Point where the segment from `center` toward `toward` exits a circle of radius r. */
function circleEdge(center, toward, r) {
    const dx = toward.x - center.x, dy = toward.y - center.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: center.x + (dx / l) * r, y: center.y + (dy / l) * r };
}

// ── describe.js ──
function numericProps(n) {
    const opacity = n.opacity ?? 1;
    switch (n.kind) {
        case 'circle':
            return { x: n.x, y: n.y, r: n.r, opacity };
        case 'rect':
            return { x: n.x, y: n.y, w: n.w, h: n.h, rx: n.rx ?? 0, opacity };
        case 'text':
            return { x: n.x, y: n.y, size: n.size ?? 16, opacity };
        case 'arrow':
            return { x1: n.x1, y1: n.y1, x2: n.x2, y2: n.y2, bend: n.bend ?? 0, width: n.width ?? 2, opacity };
    }
}
const tagFor = (kind) => (kind === 'arrow' ? 'path' : kind);
function classFor(n) {
    const c = ['dv', `dv-${n.kind}`, `dv-tone-${n.tone ?? 'default'}`];
    if (n.role)
        c.push(`dv-role-${n.role}`);
    if (n.dashed)
        c.push('dv-dashed');
    if (n.draggable)
        c.push('dv-draggable');
    if (n.interactive || n.draggable)
        c.push('dv-interactive');
    return c.join(' ');
}
/** Round to 2 decimals so the DOM / SVG strings stay readable. */
const f = (v) => String(Math.round(v * 100) / 100);
const PLAIN = { rxScale: 1, strokeScale: 1, head: 'chevron', headScale: 1 };
function describe(n, p, g = PLAIN) {
    const solidHead = n.kind === 'arrow' && (n.head ?? true) && g.head === 'triangle';
    const attrs = {
        class: classFor(n) + (solidHead ? ' dv-head-solid' : ''),
        'data-id': n.id,
        opacity: f(p.opacity),
    };
    switch (n.kind) {
        case 'circle':
            return { tag: 'circle', attrs: { ...attrs, cx: f(p.x), cy: f(p.y), r: f(Math.max(0, p.r)) } };
        case 'rect':
            return {
                tag: 'rect',
                attrs: {
                    ...attrs,
                    x: f(p.x - p.w / 2),
                    y: f(p.y - p.h / 2),
                    width: f(Math.max(0, p.w)),
                    height: f(Math.max(0, p.h)),
                    rx: f(p.rx * g.rxScale),
                },
            };
        case 'text':
            return {
                tag: 'text',
                text: n.text,
                attrs: {
                    ...attrs,
                    x: f(p.x),
                    y: f(p.y),
                    'font-size': f(p.size),
                    'text-anchor': n.anchor ?? 'middle',
                    'dominant-baseline': 'central',
                    ...(n.weight != null ? { 'font-weight': String(n.weight) } : {}),
                },
            };
        case 'arrow': {
            const w = p.width * g.strokeScale;
            return {
                tag: 'path',
                attrs: {
                    ...attrs,
                    d: arrowPath(V2(p.x1, p.y1), V2(p.x2, p.y2), p.bend, n.head ?? true, w, g.head, g.headScale),
                    'stroke-width': f(w),
                },
            };
        }
    }
}
/** Control point of a bent line: midpoint pushed `bend` px sideways. */
function bendControl(a, b, bend) {
    const mid = V2((a.x + b.x) / 2, (a.y + b.y) / 2);
    return vadd(mid, vscale(vperp(vnorm(vsub(b, a))), bend));
}
/**
 * Path data for a (possibly curved) line plus its arrowhead, as ONE path so a
 * single element can be tweened.
 *
 *  - 'chevron':  an open "V" — stroke only.
 *  - 'triangle': a closed triangle that CSS fills (class dv-head-solid).
 *    Filling a path fills EVERY sub-path, and an open curve "M a Q c b" would
 *    fill the lens between the curve and its chord. So the line part retraces
 *    itself back to the start: a shape that goes there and back encloses zero
 *    area, so only the triangle gets filled. (A straight line has zero area anyway.)
 */
function arrowPath(a, b, bend, head, width, style = 'chevron', headScale = 1) {
    const curved = Math.abs(bend) > 0.5;
    const c = curved ? bendControl(a, b, bend) : null;
    // A quadratic curve arrives along (end - control), a straight line along (end - start).
    const dir = vnorm(vsub(b, c ?? a));
    const hasHead = head && (dir.x !== 0 || dir.y !== 0);
    const size = (6 + width * 1.5) * headScale;
    const solid = hasHead && style === 'triangle';
    // A solid head covers the last bit of the line, so stop the line at its base.
    const end = solid ? vsub(b, vscale(dir, size * 0.8)) : b;
    let d = c ? `M${f(a.x)} ${f(a.y)}Q${f(c.x)} ${f(c.y)} ${f(end.x)} ${f(end.y)}` : `M${f(a.x)} ${f(a.y)}L${f(end.x)} ${f(end.y)}`;
    if (solid && c)
        d += `Q${f(c.x)} ${f(c.y)} ${f(a.x)} ${f(a.y)}`; // retrace: zero fill area
    if (!hasHead)
        return d;
    const back = vsub(b, vscale(dir, size));
    const spread = solid ? 0.55 : 0.6;
    const side = vscale(vperp(dir), size * spread);
    const l = vadd(back, side), r = vsub(back, side);
    d += solid
        ? `M${f(b.x)} ${f(b.y)}L${f(l.x)} ${f(l.y)}L${f(r.x)} ${f(r.y)}Z`
        : `M${f(l.x)} ${f(l.y)}L${f(b.x)} ${f(b.y)}L${f(r.x)} ${f(r.y)}`;
    return d;
}
/** Point at parameter t on the (possibly curved) line — handy for edge labels. */
function pointOnArrow(a, b, bend, t) {
    const c = bendControl(a, b, bend);
    const u = 1 - t;
    return V2(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y);
}

// ── styles.js ──
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
const DEFAULT_CSS = /* css */ `
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
const LIFT_DEFS = /* svg */ `
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
function injectStyles(doc = document) {
    if (doc.getElementById(STYLE_ID))
        return;
    const el = doc.createElement('style');
    el.id = STYLE_ID;
    el.textContent = DEFAULT_CSS;
    doc.head.appendChild(el);
}

// ── render.js ──
/**
 * The DOM renderer: a tiny "keyed reconciler + tween engine" for SVG.
 *
 * Every call to view.render(scene) does three things:
 *
 *  1. DIFF by id     — new ids are created, missing ids start exiting,
 *                      surviving ids are updated in place.
 *  2. RETARGET       — each surviving node tweens from WHERE IT IS RIGHT NOW
 *                      (not where it was last told to go) to its new target.
 *                      That's what makes interrupting an animation look smooth.
 *  3. ANIMATE        — one requestAnimationFrame loop interpolates every node's
 *                      numeric props and repaints via describe().
 *
 * Colours are NOT tweened here: tones are CSS classes, and CSS transitions
 * handle colour. JS only animates geometry.
 */






const SVG_NS = 'http://www.w3.org/2000/svg';
const lerp = (a, b, t) => a + (b - a) * t;
/** Create a view inside an existing <svg> element. */
function createView(svg, options = {}) {
    const opts = { viewBox: 'auto', padding: 24, injectStyles: true, ...options };
    if (opts.injectStyles && typeof document !== 'undefined')
        injectStyles(svg.ownerDocument);
    svg.classList.add('dv-root');
    // Two layers: nodes that are leaving fade out *underneath* the live scene.
    const defs = document.createElementNS(SVG_NS, 'defs');
    const exitLayer = document.createElementNS(SVG_NS, 'g');
    const liveLayer = document.createElementNS(SVG_NS, 'g');
    svg.append(defs, exitLayer, liveLayer);
    // Theme: CSS class (look) + geometry (describe) + easing/duration (feel).
    let theme = getDefaultTheme();
    const ease = () => opts.ease ?? theme.ease;
    const duration = () => opts.duration ?? theme.duration;
    function applyTheme(t) {
        theme = typeof t === 'string' ? themes[t] : t;
        for (const c of [...svg.classList])
            if (c.startsWith('dv-theme-'))
                svg.classList.remove(c);
        svg.classList.add(`dv-theme-${theme.name}`);
        defs.innerHTML = theme.lift ? LIFT_DEFS : '';
    }
    applyTheme(options.theme ?? theme);
    const entries = new Map();
    let current = { nodes: [] };
    let raf = 0;
    // The viewBox is animated exactly like a node: from → to over a duration.
    let vb = { from: [0, 0, 1, 1], to: [0, 0, 1, 1], cur: [0, 0, 1, 1], start: 0, dur: 0 };
    if (Array.isArray(opts.viewBox)) {
        vb.cur = vb.to = vb.from = [...opts.viewBox];
        svg.setAttribute('viewBox', vb.cur.join(' '));
    }
    const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function paint(e) {
        const d = describe(e.node, e.cur, theme.geometry);
        for (const k in d.attrs) {
            if (e.el.getAttribute(k) !== d.attrs[k])
                e.el.setAttribute(k, d.attrs[k]);
        }
        if (d.text !== undefined && e.el.textContent !== d.text)
            e.el.textContent = d.text;
    }
    function frame(now) {
        let busy = false;
        for (const [id, e] of entries) {
            if (e.settled)
                continue;
            const t = e.dur <= 0 ? 1 : Math.min(1, Math.max(0, (now - e.start) / e.dur));
            const k = ease()(t);
            for (const key in e.to)
                e.cur[key] = lerp(e.from[key] ?? e.to[key], e.to[key], k);
            paint(e);
            if (t < 1)
                busy = true;
            else if (e.exiting) {
                e.el.remove();
                entries.delete(id);
            }
            else
                e.settled = true;
        }
        if (!Array.isArray(opts.viewBox)) {
            // The camera never bounces, whatever the theme's easing.
            const t = vb.dur <= 0 ? 1 : Math.min(1, (now - vb.start) / vb.dur);
            const k = easeInOutCubic(t);
            vb.cur = vb.to.map((v, i) => lerp(vb.from[i], v, k));
            svg.setAttribute('viewBox', vb.cur.map((v) => Math.round(v * 100) / 100).join(' '));
            if (t < 1)
                busy = true;
        }
        raf = busy ? requestAnimationFrame(frame) : 0;
    }
    function render(scene, ro = {}) {
        const dur = reducedMotion() ? 0 : (ro.duration ?? duration());
        const now = performance.now();
        current = scene;
        // Dedupe ids (and warn: duplicate ids are the #1 bug with keyed rendering).
        const next = new Map();
        for (const n of scene.nodes) {
            if (next.has(n.id))
                console.warn(`[dsviz] duplicate node id "${n.id}" — only the first is drawn`);
            else
                next.set(n.id, n);
        }
        // 1. Exits: anything on screen that is no longer in the scene.
        for (const [id, e] of entries) {
            if (next.has(id) || e.exiting)
                continue;
            e.exiting = true;
            e.settled = false;
            e.from = { ...e.cur };
            e.to = { ...e.cur, opacity: 0, ...(e.node.exit ?? {}) };
            e.start = now;
            e.dur = dur;
            exitLayer.appendChild(e.el);
        }
        // 2. Enters + updates, and put DOM order == scene order (paint order).
        let i = 0;
        for (const node of next.values()) {
            const to = numericProps(node);
            let e = entries.get(node.id);
            if (e && tagFor(e.node.kind) !== tagFor(node.kind)) {
                e.el.remove(); // same id but a different shape type: just replace it
                entries.delete(node.id);
                e = undefined;
            }
            if (!e) {
                const from = { ...to, opacity: 0, ...(node.enter ?? {}) };
                e = {
                    node,
                    el: document.createElementNS(SVG_NS, tagFor(node.kind)),
                    from,
                    to,
                    cur: { ...from },
                    start: now,
                    dur,
                    exiting: false,
                    settled: false,
                };
                entries.set(node.id, e);
            }
            else {
                e.exiting = false; // it may have been mid-exit and come back
                e.from = { ...to, ...e.cur }; // start from what's on screen right now
                e.to = to;
                e.node = node;
                e.start = now;
                e.dur = dur;
                e.settled = false;
            }
            const at = liveLayer.childNodes[i] ?? null;
            if (at !== e.el)
                liveLayer.insertBefore(e.el, at);
            i++;
        }
        // 3. Retarget the viewBox.
        if (!Array.isArray(opts.viewBox) && next.size) {
            const b = bounds(scene);
            const p = opts.padding;
            const target = [b.x - p, b.y - p, Math.max(1, b.w + 2 * p), Math.max(1, b.h + 2 * p)];
            const first = vb.to[2] === 1 && vb.to[3] === 1;
            vb = { from: first ? target : [...vb.cur], to: target, cur: [...vb.cur], start: now, dur: first ? 0 : dur };
        }
        // Paint the first frame synchronously (instant feedback while dragging),
        // then let requestAnimationFrame take over.
        if (raf)
            cancelAnimationFrame(raf);
        frame(now);
    }
    // ── events ────────────────────────────────────────────────────────────────
    const handlers = new Map();
    function toWorld(clientX, clientY) {
        const m = svg.getScreenCTM();
        if (!m)
            return V2(clientX, clientY);
        const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
        return V2(p.x, p.y);
    }
    function emit(type, id, ev) {
        const e = entries.get(id);
        const set = handlers.get(type);
        if (!e || !set)
            return;
        const w = toWorld(ev.clientX, ev.clientY);
        for (const h of set)
            h({ type, id, node: e.node, x: w.x, y: w.y, original: ev });
    }
    const idOf = (t) => t instanceof Element ? (t.closest('[data-id]')?.getAttribute('data-id') ?? null) : null;
    let drag = null;
    let swallowClick = false;
    const onPointerDown = (ev) => {
        const id = idOf(ev.target);
        const e = id ? entries.get(id) : undefined;
        if (!id || !e?.node.draggable)
            return;
        ev.preventDefault();
        svg.setPointerCapture(ev.pointerId);
        drag = { id, pointer: ev.pointerId, sx: ev.clientX, sy: ev.clientY, moved: false };
        svg.classList.add('dv-dragging');
        emit('dragstart', id, ev);
    };
    const onPointerMove = (ev) => {
        if (!drag || ev.pointerId !== drag.pointer)
            return;
        if (Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 3)
            drag.moved = true;
        emit('drag', drag.id, ev);
    };
    const onPointerUp = (ev) => {
        if (!drag || ev.pointerId !== drag.pointer)
            return;
        swallowClick = drag.moved; // a drag shouldn't also count as a click
        emit('dragend', drag.id, ev);
        svg.classList.remove('dv-dragging');
        drag = null;
    };
    const onClick = (ev) => {
        if (swallowClick) {
            swallowClick = false;
            return;
        }
        const id = idOf(ev.target);
        if (id)
            emit('click', id, ev);
    };
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
    svg.addEventListener('click', onClick);
    return {
        svg,
        get scene() {
            return current;
        },
        render,
        get theme() {
            return theme;
        },
        setTheme(t) {
            applyTheme(t);
            for (const e of entries.values())
                paint(e);
        },
        toWorld,
        on(type, handler) {
            if (!handlers.has(type))
                handlers.set(type, new Set());
            handlers.get(type).add(handler);
            return () => handlers.get(type)?.delete(handler);
        },
        destroy() {
            if (raf)
                cancelAnimationFrame(raf);
            svg.removeEventListener('pointerdown', onPointerDown);
            svg.removeEventListener('pointermove', onPointerMove);
            svg.removeEventListener('pointerup', onPointerUp);
            svg.removeEventListener('pointercancel', onPointerUp);
            svg.removeEventListener('click', onClick);
            defs.remove();
            exitLayer.remove();
            liveLayer.remove();
            entries.clear();
            handlers.clear();
        },
    };
}

// ── static.js ──
/**
 * Render a scene to a standalone SVG string (no DOM needed).
 * Useful for server-side rendering, tests, thumbnails, or pasting into docs.
 */




const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function toSVG(scene, o = {}) {
    const pad = o.padding ?? 24;
    const theme = typeof o.theme === 'string' ? themes[o.theme] : (o.theme ?? getDefaultTheme());
    const b = bounds(scene);
    const vb = [b.x - pad, b.y - pad, b.w + 2 * pad, b.h + 2 * pad].map((v) => Math.round(v * 100) / 100);
    const seen = new Set();
    const body = scene.nodes
        .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
        .map((n) => {
        const d = describe(n, numericProps(n), theme.geometry);
        const attrs = Object.entries(d.attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
        return d.text !== undefined ? `<${d.tag} ${attrs}>${esc(d.text)}</${d.tag}>` : `<${d.tag} ${attrs}/>`;
    })
        .join('\n  ');
    const style = (o.embedStyles === false ? '' : `<style>${DEFAULT_CSS}</style>\n  `) + (theme.lift ? `<defs>${LIFT_DEFS}</defs>\n  ` : '');
    const width = o.width ? ` width="${o.width}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" class="dv-root dv-theme-${theme.name}" viewBox="${vb.join(' ')}"${width}>\n  ${style}${body}\n</svg>`;
}

// ── player.js ──
/**
 * Step through an algorithm frame by frame.
 *
 * Pattern: write your algorithm as a generator that `yield`s a SNAPSHOT of its
 * state at each interesting moment. The player runs it to completion up front
 * and keeps every frame, which is what makes "previous step" and a scrubber
 * possible — you can't run a generator backwards, but you can index an array.
 *
 *   function* binarySearch(a, target) {
 *     let lo = 0, hi = a.length - 1;
 *     while (lo <= hi) {
 *       const mid = (lo + hi) >> 1;
 *       yield { lo, hi, mid };              // ← snapshot
 *       ...
 *     }
 *   }
 *
 * ⚠ Yield COPIES of mutable data (`[...arr]`, `structuredClone(x)`). If you
 * yield the same array you keep mutating, every stored frame points at the
 * same final array and the animation looks frozen.
 */
function createPlayer(source, o = {}) {
    let interval = o.interval ?? 700;
    const max = o.maxFrames ?? 10000;
    let frames = [];
    let index = 0;
    let timer = null;
    const subs = new Set();
    if (o.onFrame)
        subs.add(o.onFrame);
    const collect = (src) => {
        const out = [];
        for (const f of src) {
            out.push(f);
            if (out.length >= max) {
                console.warn(`[dsviz] player stopped collecting at ${max} frames`);
                break;
            }
        }
        return out;
    };
    const notify = () => {
        if (!frames.length)
            return;
        for (const fn of subs)
            fn(frames[index], index, player);
    };
    const tick = () => {
        if (index >= frames.length - 1) {
            if (!o.loop)
                return pause();
            index = -1;
        }
        index++;
        notify();
        timer = setTimeout(tick, interval);
    };
    function pause() {
        if (timer)
            clearTimeout(timer);
        timer = null;
        notify(); // so UIs can update their play/pause button
    }
    const player = {
        get frames() {
            return frames;
        },
        get index() {
            return index;
        },
        get frame() {
            return frames[index];
        },
        get playing() {
            return timer !== null;
        },
        get atEnd() {
            return index >= frames.length - 1;
        },
        next() {
            if (index < frames.length - 1)
                (index++, notify());
        },
        prev() {
            if (index > 0)
                (index--, notify());
        },
        seek(i) {
            const j = Math.max(0, Math.min(frames.length - 1, Math.round(i)));
            if (j !== index)
                (index = j, notify());
        },
        play() {
            if (timer)
                return;
            if (index >= frames.length - 1)
                index = -1; // restart from the top
            timer = setTimeout(tick, 0);
        },
        pause,
        toggle() {
            timer ? pause() : player.play();
        },
        load(src) {
            if (timer)
                clearTimeout(timer);
            timer = null;
            frames = collect(src);
            index = 0;
            notify();
        },
        setInterval(ms) {
            interval = ms;
        },
        subscribe(fn) {
            subs.add(fn);
            return () => subs.delete(fn);
        },
        destroy() {
            if (timer)
                clearTimeout(timer);
            timer = null;
            subs.clear();
        },
    };
    frames = collect(source);
    queueMicrotask(notify); // let the caller finish wiring up before the first frame
    return player;
}

// ── layouts/common.js ──
function resolveTone(spec, key, value) {
    if (!spec)
        return undefined;
    return typeof spec === 'function' ? spec(key, value) : spec[String(key)];
}
const show = (v) => (v === null || v === undefined ? '' : String(v));

// ── layouts/array.js ──
/**
 * Arrays: a row of cells, with index labels underneath.
 *
 * The important design decision is WHAT A CELL'S ID IS:
 *  - the cell box + value text are identified by the element's `key`
 *    (default: its index). Give elements stable keys and a swap becomes two
 *    cells sliding past each other instead of two numbers changing in place.
 *  - the index labels (0, 1, 2…) are identified by POSITION, because index 3
 *    is always index 3 no matter what value sits in it.
 */



function array(values, o = {}) {
    const id = o.id ?? 'arr';
    const x0 = o.x ?? 0, y0 = o.y ?? 0;
    const cell = o.cell ?? 48;
    const gap = o.gap ?? 6;
    const step = cell + gap;
    const keys = o.keys ?? values.map((_, i) => i);
    const size = Math.round(cell * 0.4);
    const center = (i) => o.vertical ? V2(x0 + cell / 2, y0 + i * step + cell / 2) : V2(x0 + i * step + cell / 2, y0 + cell / 2);
    const nodes = [];
    values.forEach((v, i) => {
        const c = center(i);
        const key = keys[i];
        const tone = resolveTone(o.tones, i, v);
        const enter = o.enterOffset ? { x: c.x + o.enterOffset.x, y: c.y + o.enterOffset.y } : undefined;
        const exit = o.exitOffset ? { x: c.x + o.exitOffset.x, y: c.y + o.exitOffset.y } : undefined;
        nodes.push(rect({ id: `${id}:cell:${key}`, x: c.x, y: c.y, w: cell, h: cell, rx: cell * 0.16, tone, enter, exit, interactive: o.interactive, data: { index: i, key, value: v } }), text({ id: `${id}:val:${key}`, x: c.x, y: c.y, text: o.format ? o.format(v, i) : show(v), size, weight: 600, role: 'value', tone, enter, exit }));
    });
    if (o.showIndices ?? true) {
        values.forEach((_, i) => {
            const c = center(i);
            const p = o.vertical ? V2(c.x - cell / 2 - 10, c.y) : V2(c.x, c.y + cell / 2 + 14);
            nodes.push(text({ id: `${id}:idx:${i}`, x: p.x, y: p.y, text: String(i), size: 12, role: 'index', anchor: o.vertical ? 'end' : 'middle' }));
        });
    }
    const half = cell / 2;
    return {
        nodes,
        length: values.length,
        cell,
        center,
        top: (i) => V2(center(i).x, center(i).y - half),
        bottom: (i) => V2(center(i).x, center(i).y + half),
        left: (i) => V2(center(i).x - half, center(i).y),
        right: (i) => V2(center(i).x + half, center(i).y),
        window(lo, hi, w = {}) {
            if (lo > hi || hi < 0 || lo >= values.length)
                return null;
            const pad = w.pad ?? 5;
            const a = center(Math.max(0, lo)), b = center(Math.min(values.length - 1, hi));
            return rect({
                id: w.id ?? `${id}:window`,
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2,
                w: Math.abs(b.x - a.x) + cell + 2 * pad,
                h: Math.abs(b.y - a.y) + cell + 2 * pad,
                rx: cell * 0.22,
                role: 'window',
                tone: w.tone,
            });
        },
    };
}

// ── layouts/pointer.js ──
/**
 * A labelled pointer arrow (lo / hi / mid / curr / prev …).
 *
 * Give each pointer a stable `id` (e.g. 'mid') and just change `at` between
 * renders — the arrow and its label slide to the new target.
 */

function pointer(o) {
    const len = o.length ?? 26;
    const gap = o.gap ?? 4;
    const side = o.side ?? 'top';
    const out = (o.level ?? 0) * 18; // labels stack outward, arrows stay put
    const dir = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side];
    const tip = { x: o.at.x + dir[0] * gap, y: o.at.y + dir[1] * gap };
    const tail = { x: tip.x + dir[0] * len, y: tip.y + dir[1] * len };
    const tone = o.tone ?? 'accent';
    const lab = { x: tail.x + dir[0] * (13 + out), y: tail.y + dir[1] * (13 + out) };
    const nodes = [arrow({ id: `${o.id}:arrow`, x1: tail.x, y1: tail.y, x2: tip.x, y2: tip.y, tone, width: 2 })];
    if (o.label) {
        // A pill behind the label. Hidden by default; themes that want tags (brilliant) show it.
        const w = estimateTextWidth(o.label, 13) + 16;
        const tx = side === 'left' ? lab.x - w / 2 : side === 'right' ? lab.x + w / 2 : lab.x;
        nodes.push(rect({ id: `${o.id}:tag`, x: tx, y: lab.y, w, h: 21, rx: 10.5, role: 'tag', tone }));
        nodes.push(text({
            id: `${o.id}:label`,
            x: lab.x,
            y: lab.y,
            text: o.label,
            size: 13,
            role: 'pointer-label',
            tone,
            anchor: side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle',
        }));
    }
    return { nodes };
}

// ── layouts/linkedList.js ──
/**
 * Singly linked lists drawn as [value|•]──▶ boxes.
 *
 * You describe the list as data — each node says who its `next` is — and the
 * layout draws whatever those pointers say, even mid-algorithm states where the
 * list is broken in two (that's exactly what you want for "reverse a list").
 *
 *  - Boxes are placed left→right in `order` (default: walk from the first node).
 *  - Each `next` arrow is identified by the node it STARTS from, so when you
 *    change `a.next` from b to z the arrow swings over instead of popping.
 *  - Arrows pointing backwards curve underneath the row.
 */



/** Convenience: turn [1, 2, 3] into node specs keyed 'n0', 'n1', … */
function listFromValues(values, prefix = 'n') {
    return values.map((value, i) => ({ key: `${prefix}${i}`, value, next: i + 1 < values.length ? `${prefix}${i + 1}` : null }));
}
function linkedList(list, o = {}) {
    const id = o.id ?? 'list';
    const x0 = o.x ?? 0, y0 = o.y ?? 0;
    const w = o.w ?? 52, h = o.h ?? 44, gap = o.gap ?? 44;
    const pw = h * 0.62; // width of the "next" compartment
    const boxW = w + pw;
    const step = boxW + gap;
    const byKey = new Map(list.map((n) => [String(n.key), n]));
    // Placement order: explicit, or walk from the head, then any stragglers.
    let order = o.order ? [...o.order] : [];
    if (!o.order && list.length) {
        const seen = new Set();
        let cur = list[0];
        while (cur && !seen.has(String(cur.key))) {
            seen.add(String(cur.key));
            order.push(cur.key);
            cur = cur.next == null ? undefined : byKey.get(String(cur.next));
        }
        for (const n of list)
            if (!seen.has(String(n.key)))
                order.push(n.key);
    }
    const slotOf = new Map(order.map((k, i) => [String(k), i]));
    // Slot i's value box centre; the pointer compartment sits to its right.
    const slot = (i) => V2(x0 + i * step + w / 2, y0 + h / 2);
    const center = (k) => slot(slotOf.get(String(k)) ?? 0);
    const boxes = [];
    const arrows = [];
    for (const n of list) {
        const c = center(n.key);
        const pc = V2(c.x + w / 2 + pw / 2, c.y); // pointer compartment centre
        boxes.push(rect({ id: `${id}:val:${n.key}`, x: c.x, y: c.y, w, h, rx: 8, tone: n.tone, data: n }), rect({ id: `${id}:ptr:${n.key}`, x: pc.x, y: pc.y, w: pw, h, rx: 8, tone: n.tone }), text({ id: `${id}:txt:${n.key}`, x: c.x, y: c.y, text: show(n.value), size: 17, weight: 600, role: 'value', tone: n.tone }));
        const target = n.next == null ? undefined : byKey.get(String(n.next));
        if (!target) {
            boxes.push(text({ id: `${id}:null:${n.key}`, x: pc.x, y: pc.y + 1, text: '∅', size: 16, role: 'null' }));
            continue;
        }
        boxes.push(circle({ id: `${id}:dot:${n.key}`, x: pc.x, y: pc.y, r: 3.5, role: 'dot' }));
        const t = center(target.key);
        const tone = o.arrowTones?.[String(n.key)];
        if (t.x > pc.x) {
            // forward: straight across to the target's left edge
            arrows.push(arrow({ id: `${id}:next:${n.key}`, x1: pc.x, y1: pc.y, x2: t.x - w / 2 - 3, y2: t.y, tone }));
        }
        else {
            // backward (or self): leave from the bottom and curve under the row
            const span = Math.abs(t.x - pc.x);
            arrows.push(arrow({ id: `${id}:next:${n.key}`, x1: pc.x, y1: pc.y + h / 2, x2: t.x, y2: t.y + h / 2 + 3, bend: -(26 + span * 0.18), tone }));
        }
    }
    return {
        nodes: [...arrows, ...boxes],
        center,
        top: (k) => V2(center(k).x + pw / 2, center(k).y - h / 2),
        bottom: (k) => V2(center(k).x + pw / 2, center(k).y + h / 2),
        slot,
    };
}

// ── layouts/tree.js ──
/**
 * Binary trees.
 *
 * Layout algorithm (the simplest one that never overlaps):
 *   x = the node's position in an IN-ORDER traversal
 *   y = its depth
 * For a BST this has a lovely property: nodes are sorted left→right by key,
 * exactly like the array you'd get from an in-order walk. It's wider than a
 * "tidy" (Reingold–Tilford) layout — implementing that is a great exercise.
 *
 * Ids: a node's circle/label use its key; an edge uses its CHILD's key (every
 * node has exactly one parent edge), so after a rotation the edge re-attaches.
 * New nodes grow out of their parent via `enter`.
 */



function binaryTree(root, o = {}) {
    const id = o.id ?? 'tree';
    const r = o.r ?? 20, dx = o.dx ?? 46, dy = o.dy ?? 66;
    const x0 = o.x ?? 0, y0 = (o.y ?? 0) + r;
    // 1. in-order index + depth for every node
    const placed = [];
    let counter = 0;
    const walk = (n, parent, depth) => {
        if (!n)
            return;
        walk(n.left, n, depth + 1);
        placed.push({ node: n, parent, order: counter++, depth });
        walk(n.right, n, depth + 1);
    };
    walk(root, null, 0);
    // 2. centre the whole thing horizontally on x0
    const pos = new Map();
    for (const p of placed)
        pos.set(String(p.node.key), V2(x0 + (p.order - (counter - 1) / 2) * dx, y0 + p.depth * dy));
    // 3. emit nodes: edges first so they sit underneath the circles
    const edges = [];
    const circles = [];
    const labels = [];
    for (const { node, parent } of placed) {
        const p = pos.get(String(node.key));
        const from = parent ? pos.get(String(parent.key)) : undefined;
        const enter = from ? { x: from.x, y: from.y } : undefined;
        const tone = resolveTone(o.tones, node.key, node);
        circles.push(circle({ id: `${id}:node:${node.key}`, x: p.x, y: p.y, r, tone, enter, interactive: o.interactive, data: node }));
        labels.push(text({ id: `${id}:label:${node.key}`, x: p.x, y: p.y, text: show(node.label ?? node.key), size: 15, weight: 600, role: 'value', tone, enter }));
        if (from) {
            const a = circleEdge(from, p, r), b = circleEdge(p, from, r);
            edges.push(arrow({
                id: `${id}:edge:${node.key}`,
                x1: a.x, y1: a.y, x2: b.x, y2: b.y,
                head: false,
                tone: resolveTone(o.edgeTones, node.key, node),
                enter: { x1: a.x, y1: a.y, x2: a.x, y2: a.y }, // grows out of the parent
            }));
        }
        if (o.showNulls) {
            for (const side of ['left', 'right']) {
                if (node[side])
                    continue;
                const q = V2(p.x + (side === 'left' ? -1 : 1) * dx * 0.42, p.y + dy * 0.62);
                const a = circleEdge(p, q, r);
                edges.push(arrow({ id: `${id}:nulledge:${node.key}:${side}`, x1: a.x, y1: a.y, x2: q.x, y2: q.y - 6, head: false, tone: 'muted', dashed: true }));
                labels.push(text({ id: `${id}:null:${node.key}:${side}`, x: q.x, y: q.y + 4, text: '∅', size: 12, role: 'null' }));
            }
        }
    }
    const get = (k) => pos.get(String(k)) ?? V2(x0, y0);
    return {
        nodes: [...edges, ...circles, ...labels],
        pos: (k) => pos.get(String(k)),
        top: (k) => V2(get(k).x, get(k).y - r),
        bottom: (k) => V2(get(k).x, get(k).y + r),
        left: (k) => V2(get(k).x - r, get(k).y),
        right: (k) => V2(get(k).x + r, get(k).y),
    };
}
/**
 * Build a tree from LeetCode-style level order: [3, 9, 20, null, null, 15, 7].
 * Keys are the array indices, so the same input always gets the same ids.
 */
function treeFromLevelOrder(values) {
    if (!values.length || values[0] == null)
        return null;
    const mk = (i) => ({ key: i, label: values[i], left: null, right: null });
    const root = mk(0);
    const queue = [root];
    let i = 1;
    while (queue.length && i < values.length) {
        const n = queue.shift();
        for (const side of ['left', 'right']) {
            if (i < values.length && values[i] != null) {
                n[side] = mk(i);
                queue.push(n[side]);
            }
            i++;
        }
    }
    return root;
}

// ── layouts/graph.js ──
/**
 * General graphs: nodes as circles, edges as (optionally curved, optionally
 * directed, optionally weighted) lines.
 *
 * Positions are YOUR state. Give nodes x/y (e.g. updated from drag events) or
 * let the layout place unpositioned nodes on a circle. Real force-directed
 * layout is out of scope — but because positions are just data, you can plug
 * one in (d3-force, or your own) and feed the results back in.
 */




/** Place n points evenly on a circle, starting at 12 o'clock. */
function circularPositions(n, cx = 0, cy = 0, radius = 120) {
    return Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
        return V2(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
    });
}
function graph(nodes, edges, o = {}) {
    const id = o.id ?? 'graph';
    const r = o.r ?? 22;
    const ring = circularPositions(nodes.length, o.cx ?? 0, o.cy ?? 0, o.radius ?? Math.max(90, nodes.length * 22));
    const pos = new Map();
    nodes.forEach((n, i) => pos.set(String(n.id), n.x != null && n.y != null ? V2(n.x, n.y) : ring[i]));
    const P = (k) => pos.get(String(k)) ?? V2(0, 0);
    const pairs = new Set(edges.map((e) => `${e.from}→${e.to}`));
    const out = [];
    const labels = [];
    for (const e of edges) {
        const directed = e.directed ?? o.directed ?? false;
        const a = P(e.from), b = P(e.to);
        const antiparallel = directed && pairs.has(`${e.to}→${e.from}`);
        const bend = e.bend ?? (antiparallel ? 22 : 0);
        // Trim both ends to the circle boundary, along the curve's actual tangent.
        const c = bendControl(a, b, bend);
        const da = vnorm(vsub(Math.abs(bend) > 0.5 ? c : b, a));
        const db = vnorm(vsub(Math.abs(bend) > 0.5 ? c : a, b));
        const pad = directed ? 3 : 0;
        const s = V2(a.x + da.x * r, a.y + da.y * r);
        const t = V2(b.x + db.x * (r + pad), b.y + db.y * (r + pad));
        const eid = `${id}:edge:${e.from}-${e.to}`;
        out.push(arrow({ id: eid, x1: s.x, y1: s.y, x2: t.x, y2: t.y, bend, head: directed, tone: e.tone, data: e }));
        if (e.label != null) {
            const m = pointOnArrow(s, t, bend, 0.5);
            labels.push(text({ id: `${eid}:label`, x: m.x, y: m.y, text: show(e.label), size: 13, role: 'edge-label', tone: e.tone }));
        }
    }
    for (const n of nodes) {
        const p = P(n.id);
        out.push(circle({ id: `${id}:node:${n.id}`, x: p.x, y: p.y, r, tone: n.tone, draggable: o.draggable, interactive: o.interactive, data: n }));
        labels.push(text({ id: `${id}:label:${n.id}`, x: p.x, y: p.y, text: show(n.label ?? n.id), size: 15, weight: 600, role: 'value', tone: n.tone }));
    }
    return {
        nodes: [...out, ...labels],
        pos: P,
        top: (k) => V2(P(k).x, P(k).y - r),
        bottom: (k) => V2(P(k).x, P(k).y + r),
    };
}

// ── layouts/grid.js ──
/**
 * 2D grids: DP tables, BFS on a maze, matrices, game boards.
 * Cells are identified by (row, col), with optional row/column headers
 * (e.g. the two strings of an LCS / edit-distance table).
 */



function grid(rows, o = {}) {
    const id = o.id ?? 'grid';
    const cell = o.cell ?? 40, gap = o.gap ?? 4, step = cell + gap;
    const x0 = o.x ?? 0, y0 = o.y ?? 0;
    const center = (r, c) => V2(x0 + c * step + cell / 2, y0 + r * step + cell / 2);
    const nodes = [];
    const texts = [];
    rows.forEach((row, r) => row.forEach((v, c) => {
        const p = center(r, c);
        const tone = o.tones?.(r, c, v);
        nodes.push(rect({ id: `${id}:cell:${r},${c}`, x: p.x, y: p.y, w: cell, h: cell, rx: 6, tone, interactive: o.interactive, data: { r, c, value: v } }));
        const s = o.format ? o.format(v, r, c) : show(v);
        if (s)
            texts.push(text({ id: `${id}:val:${r},${c}`, x: p.x, y: p.y, text: s, size: Math.round(cell * 0.38), weight: 600, role: 'value', tone }));
    }));
    o.colLabels?.forEach((l, c) => {
        const p = center(0, c);
        texts.push(text({ id: `${id}:col:${c}`, x: p.x, y: p.y - cell / 2 - 14, text: show(l), size: 13, role: 'caption' }));
    });
    o.rowLabels?.forEach((l, r) => {
        const p = center(r, 0);
        texts.push(text({ id: `${id}:row:${r}`, x: p.x - cell / 2 - 12, y: p.y, text: show(l), size: 13, role: 'caption', anchor: 'end' }));
    });
    const h = cell / 2;
    return {
        nodes: [...nodes, ...texts],
        center,
        top: (r, c) => V2(center(r, c).x, center(r, c).y - h),
        bottom: (r, c) => V2(center(r, c).x, center(r, c).y + h),
        left: (r, c) => V2(center(r, c).x - h, center(r, c).y),
        right: (r, c) => V2(center(r, c).x + h, center(r, c).y),
    };
}

// ── layouts/stackQueue.js ──
/**
 * Stacks and queues are just arrays with opinions about where things come
 * from and go to. Both are thin wrappers around array() that set
 * enter/exit offsets, so pushes drop in and pops/dequeues slide away.
 *
 * Remember to pass stable `keys` — otherwise popping the top looks like
 * "the last cell faded out", which happens to be right for a stack but is
 * wrong for a queue (dequeue removes index 0, and every key shifts).
 */



/** Bottom of the stack is index 0, drawn at the bottom. */
function stack(values, o = {}) {
    const cell = o.cell ?? 44;
    const gap = o.gap ?? 4;
    // Draw top-to-bottom reversed so index 0 is at the bottom; y is the stack's BOTTOM edge.
    const n = values.length;
    const reversed = [...values].reverse();
    const keys = (o.keys ?? values.map((_, i) => i)).slice().reverse();
    const bottomY = o.y ?? 0;
    const d = array(reversed, {
        showIndices: false,
        ...o,
        id: o.id ?? 'stack',
        cell,
        gap,
        keys,
        vertical: true,
        y: bottomY - n * (cell + gap) + gap,
        tones: o.tones ? (i, v) => resolveTone(o.tones, n - 1 - i, v) : undefined,
        enterOffset: V2(0, -cell * 1.5),
        exitOffset: V2(0, -cell * 1.5),
    });
    // Re-index helpers so stack.center(0) is the bottom element.
    const flip = (i) => n - 1 - i;
    return {
        ...d,
        center: (i) => d.center(flip(i)),
        top: (i) => d.top(flip(i)),
        bottom: (i) => d.bottom(flip(i)),
        left: (i) => d.left(flip(i)),
        right: (i) => d.right(flip(i)),
    };
}
/** Front of the queue is index 0, on the left. Enqueue enters right, dequeue exits left. */
function queue(values, o = {}) {
    const cell = o.cell ?? 44;
    return array(values, {
        showIndices: false,
        ...o,
        id: o.id ?? 'queue',
        cell,
        enterOffset: V2(cell * 1.5, 0),
        exitOffset: V2(-cell * 1.5, 0),
    });
}

// ── index.js ──
/**
 * dsviz — interactive, animated SVG diagrams for data structures & algorithms.
 *
 *   state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ renderer
 *
 * The renderer is swappable: createView() animates in the DOM, toSVG() makes a
 * static string, and examples/react-motion.tsx shows framer-motion doing it.
 */

export { DEFAULT_CSS, LIFT_DEFS, V2, array, arrow, arrowPath, bendControl, binaryTree, bounds, circle, circleEdge, circularPositions, classFor, combine, createPlayer, createView, describe, easeInOutCubic, easeOutBack, easeOutCubic, estimateTextWidth, getDefaultTheme, graph, grid, injectStyles, linear, linkedList, listFromValues, nodeBounds, numericProps, pointOnArrow, pointer, queue, rect, resolveTone, setDefaultTheme, show, stack, style, tagFor, text, themes, toSVG, translate, treeFromLevelOrder, vadd, vdist, vlen, vlerp, vnorm, vperp, vscale, vsub };
