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
import { Scene, Tone } from '../scene';
import { Vec } from '../vec';
import { Key } from './common';
export interface ListNodeSpec {
    key: Key;
    value: unknown;
    next: Key | null;
    tone?: Tone;
}
export interface LinkedListOptions {
    id?: string;
    x?: number;
    y?: number;
    /** Width of the value part. Default 52. */
    w?: number;
    h?: number;
    /** Horizontal space between boxes (room for the arrow). Default 44. */
    gap?: number;
    /** Explicit left→right placement. Default: follow `next` from nodes[0]. */
    order?: Key[];
    /** Tone for the next-arrow leaving a node. */
    arrowTones?: Partial<Record<string, Tone>>;
}
export interface LinkedListDiagram extends Scene {
    /** Centre of a node's value box. */
    center(key: Key): Vec;
    top(key: Key): Vec;
    bottom(key: Key): Vec;
    /** A point left of slot 0 / right of the last slot (for null pointers). */
    slot(i: number): Vec;
}
/** Convenience: turn [1, 2, 3] into node specs keyed 'n0', 'n1', … */
export declare function listFromValues(values: readonly unknown[], prefix?: string): ListNodeSpec[];
export declare function linkedList(list: readonly ListNodeSpec[], o?: LinkedListOptions): LinkedListDiagram;
