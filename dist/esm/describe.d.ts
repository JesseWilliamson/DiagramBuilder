/**
 * Turning a node into SVG, split into two halves:
 *
 *  - numericProps(node): the numbers that can be tweened (x, y, r, opacity…)
 *  - describe(node, props): which SVG tag + attributes to draw for those numbers
 *
 * The DOM renderer calls describe() every animation frame with interpolated
 * props; the string renderer calls it once with the final props. Sharing this
 * one function means both renderers can never disagree about what a node looks like.
 */
import { NumericProps, SceneNode } from './scene';
import { ThemeGeometry } from './themes';
import { Vec } from './vec';
export declare function numericProps(n: SceneNode): NumericProps;
export type SvgTag = 'circle' | 'rect' | 'text' | 'path';
export interface Description {
    tag: SvgTag;
    attrs: Record<string, string>;
    text?: string;
}
export declare const tagFor: (kind: SceneNode["kind"]) => SvgTag;
export declare function classFor(n: SceneNode): string;
export declare function describe(n: SceneNode, p: NumericProps, g?: ThemeGeometry): Description;
/** Control point of a bent line: midpoint pushed `bend` px sideways. */
export declare function bendControl(a: Vec, b: Vec, bend: number): Vec;
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
export declare function arrowPath(a: Vec, b: Vec, bend: number, head: boolean, width: number, style?: 'chevron' | 'triangle', headScale?: number): string;
/** Point at parameter t on the (possibly curved) line — handy for edge labels. */
export declare function pointOnArrow(a: Vec, b: Vec, bend: number, t: number): Vec;
