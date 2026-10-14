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
import { Part, Scene, Tone } from '../scene';
import { Vec } from '../vec';
import { Key, ToneSpec } from './common';
export interface ArrayOptions<T = unknown> {
    id?: string;
    /** Top-left corner of the first cell. */
    x?: number;
    y?: number;
    /** Cell size in px. Default 48. */
    cell?: number;
    gap?: number;
    /** Stable identity per element (must be unique). Default: the index. */
    keys?: Key[];
    /** Tone per INDEX: `{ 2: 'active' }` or `(i, v) => …`. */
    tones?: ToneSpec<number, T>;
    showIndices?: boolean;
    /** Text to show instead of String(value). */
    format?: (v: T, i: number) => string;
    /** Lay the cells out top-to-bottom instead of left-to-right. */
    vertical?: boolean;
    /** Where new cells fly in from / old cells fly out to (offset in px). */
    enterOffset?: Vec;
    exitOffset?: Vec;
    interactive?: boolean;
}
export interface ArrayDiagram extends Scene {
    length: number;
    cell: number;
    center(i: number): Vec;
    top(i: number): Vec;
    bottom(i: number): Vec;
    left(i: number): Vec;
    right(i: number): Vec;
    /** A highlight band behind cells lo..hi (inclusive). Put it BEFORE the array in combine(). */
    window(lo: number, hi: number, o?: {
        id?: string;
        tone?: Tone;
        pad?: number;
    }): Part;
}
export declare function array<T>(values: readonly T[], o?: ArrayOptions<T>): ArrayDiagram;
