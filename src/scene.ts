/**
 * The scene graph: the one data format everything in dsviz agrees on.
 *
 *   your state  ──layout()──▶  Scene (plain objects)  ──renderer──▶  SVG
 *
 * A Scene is just an ordered list of primitive nodes. Each node has a
 * stable `id`. That id is the whole trick behind animation: when you render
 * a new scene, a node whose id already exists is *moved* (tweened) instead of
 * being destroyed and recreated. It's the same idea as React's `key` prop and
 * framer-motion's `layoutId`.
 *
 * Array order = paint order. Earlier nodes are drawn underneath later ones.
 */
import { Vec } from './vec';

/**
 * Semantic colour. The renderer turns this into a CSS class (`dv-tone-active`)
 * and the stylesheet decides the actual colour, so dark mode / re-skinning is a
 * pure-CSS concern and colour changes animate with CSS transitions.
 */
export type Tone =
  | 'default'
  | 'active'
  | 'accent'
  | 'success'
  | 'danger'
  | 'visited'
  | 'orange'
  | 'muted'
  | 'ghost'
  | (string & {});

/** The numeric props that the renderer is allowed to tween. */
export type NumericProps = Record<string, number>;

interface BaseNode {
  /** Stable identity across renders. Must be unique within one scene. */
  id: string;
  tone?: Tone;
  /** Extra semantic hook for CSS, becomes class `dv-role-<role>`. */
  role?: string;
  opacity?: number;
  dashed?: boolean;
  /** Emits drag events from the view when true. */
  draggable?: boolean;
  /** Pointer cursor + hover affordance; click events fire either way. */
  interactive?: boolean;
  /** Numeric props to START from when this node first appears (e.g. its parent's x/y). */
  enter?: Partial<NumericProps>;
  /** Numeric props to END at when this node is removed (e.g. slide out left). */
  exit?: Partial<NumericProps>;
  /** Anything you want back in event handlers. */
  data?: unknown;
}

/** A circle centred at (x, y). */
export interface CircleNode extends BaseNode {
  kind: 'circle';
  x: number;
  y: number;
  r: number;
}

/** A rectangle CENTRED at (x, y) (centring makes layouts and tweening simpler). */
export interface RectNode extends BaseNode {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
}

export interface TextNode extends BaseNode {
  kind: 'text';
  x: number;
  y: number;
  text: string;
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number | string;
}

/**
 * A line from (x1,y1) to (x2,y2). `bend` bows it into a quadratic curve:
 * the control point sits `bend` px off the midpoint, perpendicular to the line.
 */
export interface ArrowNode extends BaseNode {
  kind: 'arrow';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  bend?: number;
  /** Draw an arrowhead at (x2, y2). Default true. */
  head?: boolean;
  width?: number;
}

/**
 * A polyline or smooth curve through `points`. Covers function plots, polygons,
 * filled areas, arcs and Venn regions with one primitive.
 *
 *  - closed: join last point to first (and fill it, like a polygon).
 *  - smooth: pass a Catmull-Rom spline through the points instead of straight segments.
 *
 * Tweening is point-wise. When the point count changes between renders the
 * renderer first resamples the old shape to the new count (see path.ts), so a
 * curve with 40 points can morph into one with 80 without jumping.
 */
export interface PathNode extends BaseNode {
  kind: 'path';
  points: ReadonlyArray<readonly [number, number]>;
  closed?: boolean;
  smooth?: boolean;
  width?: number;
}

export type SceneNode = CircleNode | RectNode | TextNode | ArrowNode | PathNode;

export interface Scene {
  nodes: SceneNode[];
}

/** Anything that contributes nodes: a layout result, a node, a (nested) list of parts, or nothing. */
export type Part = Scene | SceneNode | readonly Part[] | null | undefined | false;

// ── constructors ─────────────────────────────────────────────────────────────
// They only add `kind`; nodes are plain objects so you can spread / tweak them.

export const circle = (o: Omit<CircleNode, 'kind'>): CircleNode => ({ kind: 'circle', ...o });
export const rect = (o: Omit<RectNode, 'kind'>): RectNode => ({ kind: 'rect', ...o });
export const text = (o: Omit<TextNode, 'kind'>): TextNode => ({ kind: 'text', ...o });
export const arrow = (o: Omit<ArrowNode, 'kind'>): ArrowNode => ({ kind: 'arrow', ...o });
export const path = (o: Omit<PathNode, 'kind'>): PathNode => ({ kind: 'path', ...o });

/**
 * Flatten any mix of layouts / nodes / arrays into one Scene.
 * Falsy parts are skipped so you can write `showMid && pointer(...)`.
 */
export function combine(...parts: Part[]): Scene {
  const nodes: SceneNode[] = [];
  const add = (p: Part) => {
    if (!p) return;
    if (Array.isArray(p)) (p as readonly Part[]).forEach(add);
    else if ('nodes' in (p as Scene)) nodes.push(...(p as Scene).nodes);
    else nodes.push(p as SceneNode);
  };
  parts.forEach(add);
  return { nodes };
}

/** Shift every node in a part by (dx, dy). Returns new nodes (inputs untouched). */
export function translate(part: Part, dx: number, dy: number): Scene {
  return {
    nodes: combine(part).nodes.map((n): SceneNode => {
      if (n.kind === 'arrow') return { ...n, x1: n.x1 + dx, y1: n.y1 + dy, x2: n.x2 + dx, y2: n.y2 + dy };
      if (n.kind === 'path') return { ...n, points: n.points.map(([x, y]) => [x + dx, y + dy] as const) };
      return { ...n, x: n.x + dx, y: n.y + dy };
    }),
  };
}

/** Apply the same tone/role/etc to every node of a part. */
export function style(part: Part, patch: Partial<Pick<BaseNode, 'tone' | 'role' | 'opacity' | 'dashed'>>): Scene {
  return { nodes: combine(part).nodes.map((n) => ({ ...n, ...patch }) as SceneNode) };
}

/**
 * Prefix every id in a part, so two copies of the same layout (or two
 * diagrams sharing a view) can't collide: `namespace(array(a), 'left')` has ids like `left/arr:cell:0`.
 */
export function namespace(part: Part, prefix: string): Scene {
  return { nodes: combine(part).nodes.map((n) => ({ ...n, id: `${prefix}/${n.id}` }) as SceneNode) };
}

// ── geometry helpers ─────────────────────────────────────────────────────────

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rough text width: SVG can't measure text without the DOM, so we estimate. */
export const estimateTextWidth = (s: string, size: number) => s.length * size * 0.6;

/** Axis-aligned bounds of a node (text and curves are approximated). */
export function nodeBounds(n: SceneNode): Box {
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
    case 'path': {
      const w = (n.width ?? 1) / 2;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of n.points) (x0 = Math.min(x0, x), y0 = Math.min(y0, y), x1 = Math.max(x1, x), y1 = Math.max(y1, y));
      if (!n.points.length) return { x: 0, y: 0, w: 0, h: 0 };
      return { x: x0 - w, y: y0 - w, w: x1 - x0 + 2 * w, h: y1 - y0 + 2 * w };
    }
    case 'arrow': {
      const b = Math.abs(n.bend ?? 0) / 2; // a quadratic peaks at half its control offset
      const x = Math.min(n.x1, n.x2) - b;
      const y = Math.min(n.y1, n.y2) - b;
      return { x, y, w: Math.abs(n.x2 - n.x1) + 2 * b, h: Math.abs(n.y2 - n.y1) + 2 * b };
    }
  }
}

export function bounds(part: Part): Box {
  const nodes = combine(part).nodes;
  if (!nodes.length) return { x: 0, y: 0, w: 0, h: 0 };
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
export function circleEdge(center: Vec, toward: Vec, r: number): Vec {
  const dx = toward.x - center.x, dy = toward.y - center.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: center.x + (dx / l) * r, y: center.y + (dy / l) * r };
}
