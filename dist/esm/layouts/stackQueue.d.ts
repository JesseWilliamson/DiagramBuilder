import { ArrayDiagram, ArrayOptions } from './array';
/** Bottom of the stack is index 0, drawn at the bottom. */
export declare function stack<T>(values: readonly T[], o?: ArrayOptions<T>): ArrayDiagram;
/** Front of the queue is index 0, on the left. Enqueue enters right, dequeue exits left. */
export declare function queue<T>(values: readonly T[], o?: ArrayOptions<T>): ArrayDiagram;
