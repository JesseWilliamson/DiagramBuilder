/**
 * Binary trees.
 *
 * Layout algorithm (the simplest one that never overlaps):
 *   x = the node's position in an IN-ORDER traversal
 *   y = its depth
 * For a BST this has a lovely property: nodes are sorted left→right by key,
 * exactly like the array you'd get from an in-order walk. It's wider than a
 * "tidy" (Reingold–Tilford) layout — implementing that is a great exercise.
 *
 * Ids: a node's circle/label use its key; an edge uses its CHILD's key (every
 * node has exactly one parent edge), so after a rotation the edge re-attaches.
 * New nodes grow out of their parent via `enter`.
 */
import { Scene } from '../scene';
import { Vec } from '../vec';
import { Key, ToneSpec } from './common';
export interface BinaryTreeNode {
    key: Key;
    label?: string | number;
    left?: BinaryTreeNode | null;
    right?: BinaryTreeNode | null;
}
export interface TreeOptions {
    id?: string;
    /** Top-centre of the tree. */
    x?: number;
    y?: number;
    r?: number;
    /** Horizontal spacing between in-order neighbours. Default 46. */
    dx?: number;
    /** Vertical spacing between levels. Default 66. */
    dy?: number;
    tones?: ToneSpec<Key, BinaryTreeNode>;
    /** Tone for the edge INTO a node (keyed by child key). */
    edgeTones?: ToneSpec<Key, BinaryTreeNode>;
    interactive?: boolean;
    /** Show small "null" stubs for missing children. Default false. */
    showNulls?: boolean;
}
export interface TreeDiagram extends Scene {
    pos(key: Key): Vec | undefined;
    top(key: Key): Vec;
    bottom(key: Key): Vec;
    left(key: Key): Vec;
    right(key: Key): Vec;
}
export declare function binaryTree(root: BinaryTreeNode | null | undefined, o?: TreeOptions): TreeDiagram;
/**
 * Build a tree from LeetCode-style level order: [3, 9, 20, null, null, 15, 7].
 * Keys are the array indices, so the same input always gets the same ids.
 */
export declare function treeFromLevelOrder(values: readonly (string | number | null)[]): BinaryTreeNode | null;
