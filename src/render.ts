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
import { resampleProps } from './path';
import { describe, numericProps, tagFor } from './describe';
import { Box, NumericProps, Scene, SceneNode, bounds } from './scene';
import { Easing, easeInOutCubic } from './easing';
import { injectStyles } from './styles';
import { feel, geometry } from './themes';
import { V2, Vec } from './vec';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ViewOptions {
  /** Animation length in ms. Default 380. */
  duration?: number;
  ease?: Easing;
  /** 'auto' fits the viewBox to the scene (and animates it); or pass a fixed [x, y, w, h]. */
  viewBox?: 'auto' | [number, number, number, number];
  /** Padding around the scene in 'auto' mode. Default 24. */
  padding?: number;
  /** Inject the default stylesheet into <head>. Default true. */
  injectStyles?: boolean;
}

export interface RenderOptions {
  /** Override the duration for this render only. Use 0 while dragging. */
  duration?: number;
}

export type ViewEventType = 'click' | 'dragstart' | 'drag' | 'dragend';

export interface ViewEvent {
  type: ViewEventType;
  id: string;
  node: SceneNode;
  /** Pointer position in scene (world) coordinates. */
  x: number;
  y: number;
  original: Event;
}

export interface View {
  readonly svg: SVGSVGElement;
  /** The last scene passed to render(). */
  readonly scene: Scene;
  render(scene: Scene, opts?: RenderOptions): void;
  /** Switch between auto-fit and a fixed camera (e.g. a plot whose axes must not move). */
  setViewBox(viewBox: 'auto' | [number, number, number, number]): void;
  on(type: ViewEventType, handler: (e: ViewEvent) => void): () => void;
  /** Convert browser client coords (e.g. event.clientX) into scene coords. */
  toWorld(clientX: number, clientY: number): Vec;
  destroy(): void;
}

/** Per-node bookkeeping. `cur` is what is on screen this frame. */
interface Entry {
  node: SceneNode;
  el: SVGElement;
  from: NumericProps;
  to: NumericProps;
  cur: NumericProps;
  start: number;
  dur: number;
  exiting: boolean;
  settled: boolean;
}

/** `{ ...defaults, ...options }` lets an explicit `undefined` erase a default; drop those keys first. */
const definedOnly = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Create a view inside an existing <svg> element. */
export function createView(svg: SVGSVGElement, options: ViewOptions = {}): View {
  const opts = { viewBox: 'auto' as 'auto' | [number, number, number, number], padding: 24, injectStyles: true, ...definedOnly(options) } as Required<Pick<ViewOptions, 'viewBox' | 'padding' | 'injectStyles'>> & ViewOptions;
  if (opts.injectStyles && typeof document !== 'undefined') injectStyles(svg.ownerDocument);
  svg.classList.add('dv-root');

  // Two layers: nodes that are leaving fade out *underneath* the live scene.
  const exitLayer = document.createElementNS(SVG_NS, 'g');
  const liveLayer = document.createElementNS(SVG_NS, 'g');
  svg.append(exitLayer, liveLayer);

  const ease = () => opts.ease ?? feel.ease;
  const duration = () => opts.duration ?? feel.duration;

  const entries = new Map<string, Entry>();
  let current: Scene = { nodes: [] };
  let raf = 0;

  // The viewBox is animated exactly like a node: from → to over a duration.
  let vb = { from: [0, 0, 1, 1], to: [0, 0, 1, 1], cur: [0, 0, 1, 1], start: 0, dur: 0 };
  if (Array.isArray(opts.viewBox)) {
    vb.cur = vb.to = vb.from = [...opts.viewBox];
    svg.setAttribute('viewBox', vb.cur.join(' '));
  }

  const reducedMotion = () =>
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function paint(e: Entry) {
    const d = describe(e.node, e.cur, geometry);
    for (const k in d.attrs) {
      if (e.el.getAttribute(k) !== d.attrs[k]) e.el.setAttribute(k, d.attrs[k]);
    }
    if (d.text !== undefined && e.el.textContent !== d.text) e.el.textContent = d.text;
  }

  function frame(now: number) {
    let busy = false;
    for (const [id, e] of entries) {
      if (e.settled) continue;
      const t = e.dur <= 0 ? 1 : Math.min(1, Math.max(0, (now - e.start) / e.dur));
      const k = ease()(t);
      for (const key in e.to) e.cur[key] = lerp(e.from[key] ?? e.to[key], e.to[key], k);
      paint(e);
      if (t < 1) busy = true;
      else if (e.exiting) {
        e.el.remove();
        entries.delete(id);
      } else e.settled = true;
    }
    if (!Array.isArray(opts.viewBox)) {
      // The camera never bounces, whatever the theme's easing.
      const t = vb.dur <= 0 ? 1 : Math.min(1, (now - vb.start) / vb.dur);
      const k = easeInOutCubic(t);
      vb.cur = vb.to.map((v, i) => lerp(vb.from[i], v, k));
      svg.setAttribute('viewBox', vb.cur.map((v) => Math.round(v * 100) / 100).join(' '));
      if (t < 1) busy = true;
    }
    raf = busy ? requestAnimationFrame(frame) : 0;
  }

  function render(scene: Scene, ro: RenderOptions = {}) {
    const dur = reducedMotion() ? 0 : (ro.duration ?? duration());
    const now = performance.now();
    current = scene;

    // Dedupe ids (and warn: duplicate ids are the #1 bug with keyed rendering).
    const next = new Map<string, SceneNode>();
    for (const n of scene.nodes) {
      if (next.has(n.id)) console.warn(`[dsviz] duplicate node id "${n.id}" — only the first is drawn`);
      else next.set(n.id, n);
    }

    // 1. Exits: anything on screen that is no longer in the scene.
    for (const [id, e] of entries) {
      if (next.has(id) || e.exiting) continue;
      e.exiting = true;
      e.settled = false;
      e.from = { ...e.cur };
      e.to = { ...e.cur, opacity: 0, ...(e.node.exit ?? {}) } as NumericProps;
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
        const from = { ...to, opacity: 0, ...(node.enter ?? {}) } as NumericProps;
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
      } else {
        // A path whose point count changed: resample what is on screen to the new
        // count first, so tweening point i -> point i still means something.
        if (node.kind === 'path' && e.node.kind === 'path' && e.node.points.length !== node.points.length) {
          e.cur = { ...e.cur, ...resampleProps(e.cur, e.node.points.length, node.points.length, !!node.closed) };
        }
        e.exiting = false; // it may have been mid-exit and come back
        e.from = { ...to, ...e.cur }; // start from what's on screen right now
        e.to = to;
        e.node = node;
        e.start = now;
        e.dur = dur;
        e.settled = false;
      }
      const at = liveLayer.childNodes[i] ?? null;
      if (at !== e.el) liveLayer.insertBefore(e.el, at);
      i++;
    }

    // 3. Retarget the viewBox.
    if (!Array.isArray(opts.viewBox) && next.size) {
      const b: Box = bounds(scene);
      const p = opts.padding;
      const target = [b.x - p, b.y - p, Math.max(1, b.w + 2 * p), Math.max(1, b.h + 2 * p)];
      const first = vb.to[2] === 1 && vb.to[3] === 1;
      vb = { from: first ? target : [...vb.cur], to: target, cur: [...vb.cur], start: now, dur: first ? 0 : dur };
    }

    // Paint the first frame synchronously (instant feedback while dragging),
    // then let requestAnimationFrame take over.
    if (raf) cancelAnimationFrame(raf);
    frame(now);
  }

  // ── events ────────────────────────────────────────────────────────────────
  const handlers = new Map<ViewEventType, Set<(e: ViewEvent) => void>>();

  function toWorld(clientX: number, clientY: number): Vec {
    const m = svg.getScreenCTM();
    if (!m) return V2(clientX, clientY);
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return V2(p.x, p.y);
  }

  function emit(type: ViewEventType, id: string, ev: PointerEvent | MouseEvent) {
    const e = entries.get(id);
    const set = handlers.get(type);
    if (!e || !set) return;
    const w = toWorld(ev.clientX, ev.clientY);
    for (const h of set) h({ type, id, node: e.node, x: w.x, y: w.y, original: ev });
  }

  const idOf = (t: EventTarget | null): string | null =>
    t instanceof Element ? (t.closest('[data-id]')?.getAttribute('data-id') ?? null) : null;

  let drag: { id: string; pointer: number; sx: number; sy: number; moved: boolean } | null = null;
  let swallowClick = false;

  const onPointerDown = (ev: PointerEvent) => {
    const id = idOf(ev.target);
    const e = id ? entries.get(id) : undefined;
    if (!id || !e?.node.draggable) return;
    ev.preventDefault();
    svg.setPointerCapture(ev.pointerId);
    drag = { id, pointer: ev.pointerId, sx: ev.clientX, sy: ev.clientY, moved: false };
    svg.classList.add('dv-dragging');
    emit('dragstart', id, ev);
  };
  const onPointerMove = (ev: PointerEvent) => {
    if (!drag || ev.pointerId !== drag.pointer) return;
    if (Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 3) drag.moved = true;
    emit('drag', drag.id, ev);
  };
  const onPointerUp = (ev: PointerEvent) => {
    if (!drag || ev.pointerId !== drag.pointer) return;
    swallowClick = drag.moved; // a drag shouldn't also count as a click
    emit('dragend', drag.id, ev);
    svg.classList.remove('dv-dragging');
    drag = null;
  };
  const onClick = (ev: MouseEvent) => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    const id = idOf(ev.target);
    if (id) emit('click', id, ev);
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
    setViewBox(v) {
      opts.viewBox = v;
      if (Array.isArray(v)) {
        vb.cur = vb.to = vb.from = [...v];
        svg.setAttribute('viewBox', v.join(' '));
      } else render(current, { duration: 0 });
    },
    toWorld,
    on(type, handler) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(handler);
      return () => handlers.get(type)?.delete(handler);
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onPointerUp);
      svg.removeEventListener('click', onClick);
      exitLayer.remove();
      liveLayer.remove();
      entries.clear();
      handlers.clear();
    },
  };
}
