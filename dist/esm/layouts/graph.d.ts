import { Scene, Tone } from '../scene';
import { Vec } from '../vec';
import { Key } from './common';
export interface GraphNodeSpec {
    id: Key;
    label?: string | number;
    x?: number;
    y?: number;
    tone?: Tone;
}
export interface GraphEdgeSpec {
    from: Key;
    to: Key;
    label?: string | number;
    tone?: Tone;
    /** Override the graph-wide `directed` for this edge. */
    directed?: boolean;
    /** Force a curve. Antiparallel directed pairs (a→b, b→a) curve automatically. */
    bend?: number;
}
export interface GraphOptions {
    id?: string;
    r?: number;
    directed?: boolean;
    /** Centre + radius for the circular fallback layout. */
    cx?: number;
    cy?: number;
    radius?: number;
    draggable?: boolean;
    interactive?: boolean;
}
export interface GraphDiagram extends Scene {
    pos(id: Key): Vec;
    top(id: Key): Vec;
    bottom(id: Key): Vec;
}
/** Place n points evenly on a circle, starting at 12 o'clock. */
export declare function circularPositions(n: number, cx?: number, cy?: number, radius?: number): Vec[];
export declare function graph(nodes: readonly GraphNodeSpec[], edges: readonly GraphEdgeSpec[], o?: GraphOptions): GraphDiagram;
