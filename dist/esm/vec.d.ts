/**
 * Tiny 2D vector helpers. Everything in dsviz uses plain `{x, y}` objects
 * (not a class) so that positions stay serialisable and easy to diff.
 *
 * Coordinates are SVG-native: +x goes right, +y goes DOWN.
 */
export interface Vec {
    x: number;
    y: number;
}
export declare const V2: (x: number, y: number) => Vec;
export declare const vadd: (a: Vec, b: Vec) => Vec;
export declare const vsub: (a: Vec, b: Vec) => Vec;
export declare const vscale: (a: Vec, k: number) => Vec;
export declare const vlen: (a: Vec) => number;
export declare const vdist: (a: Vec, b: Vec) => number;
export declare const vlerp: (a: Vec, b: Vec, t: number) => Vec;
/** Unit vector in the same direction (or (0,0) for the zero vector). */
export declare const vnorm: (a: Vec) => Vec;
/** Rotate 90° clockwise on screen (because +y is down). */
export declare const vperp: (a: Vec) => Vec;
