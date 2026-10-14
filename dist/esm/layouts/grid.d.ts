/**
 * 2D grids: DP tables, BFS on a maze, matrices, game boards.
 * Cells are identified by (row, col), with optional row/column headers
 * (e.g. the two strings of an LCS / edit-distance table).
 */
import { Scene, Tone } from '../scene';
import { Vec } from '../vec';
export interface GridOptions<T = unknown> {
    id?: string;
    x?: number;
    y?: number;
    cell?: number;
    gap?: number;
    tones?: (r: number, c: number, v: T) => Tone | undefined;
    rowLabels?: readonly (string | number)[];
    colLabels?: readonly (string | number)[];
    format?: (v: T, r: number, c: number) => string;
    interactive?: boolean;
}
export interface GridDiagram extends Scene {
    center(r: number, c: number): Vec;
    top(r: number, c: number): Vec;
    bottom(r: number, c: number): Vec;
    left(r: number, c: number): Vec;
    right(r: number, c: number): Vec;
}
export declare function grid<T>(rows: readonly (readonly T[])[], o?: GridOptions<T>): GridDiagram;
