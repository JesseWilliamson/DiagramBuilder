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
 * and the stylesheet decides the actual colour, so themes / dark mode are a
 * pure-CSS concern and colour changes animate with CSS transitions.
 */
export type Tone = 'default' | 'active' | 'accent' | 'success' | 'danger' | 'visited' | 'muted' | 'ghost' | (string & {});
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
export type SceneNode = CircleNode | RectNode | TextNode | ArrowNode;
export interface Scene {
    nodes: SceneNode[];
}
/** Anything that contributes nodes: a layout result, a node, a list, or nothing. */
export type Part = Scene | SceneNode | SceneNode[] | null | undefined | false;
export declare const circle: (o: Omit<CircleNode, "kind">) => CircleNode;
export declare const rect: (o: Omit<RectNode, "kind">) => RectNode;
export declare const text: (o: Omit<TextNode, "kind">) => TextNode;
export declare const arrow: (o: Omit<ArrowNode, "kind">) => ArrowNode;
/**
 * Flatten any mix of layouts / nodes / arrays into one Scene.
 * Falsy parts are skipped so you can write `showMid && pointer(...)`.
 */
export declare function combine(...parts: Part[]): Scene;
/** Shift every node in a part by (dx, dy). Returns new nodes (inputs untouched). */
export declare function translate(part: Part, dx: number, dy: number): Scene;
/** Apply the same tone/role/etc to every node of a part. */
export declare function style(part: Part, patch: Partial<Pick<BaseNode, 'tone' | 'role' | 'opacity' | 'dashed'>>): Scene;
export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}
/** Rough text width: SVG can't measure text without the DOM, so we estimate. */
export declare const estimateTextWidth: (s: string, size: number) => number;
/** Axis-aligned bounds of a node (text and curves are approximated). */
export declare function nodeBounds(n: SceneNode): Box;
export declare function bounds(part: Part): Box;
/** Point where the segment from `center` toward `toward` exits a circle of radius r. */
export declare function circleEdge(center: Vec, toward: Vec, r: number): Vec;
export {};
