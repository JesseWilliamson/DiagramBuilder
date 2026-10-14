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
import { describe, numericProps, tagFor } from './describe';
import { bounds } from './scene';
import { easeInOutCubic } from './easing';
import { LIFT_DEFS, injectStyles } from './styles';
import { getDefaultTheme, themes } from './themes';
import { V2 } from './vec';
const SVG_NS = 'http://www.w3.org/2000/svg';
const lerp = (a, b, t) => a + (b - a) * t;
/** Create a view inside an existing <svg> element. */
export function createView(svg, options = {}) {
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
