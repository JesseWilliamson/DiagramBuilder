/**
 * Tidy trees (Reingold–Tilford): as narrow as possible, parents centred over
 * their children, and the same subtree always drawn the same way wherever it
 * appears.
 *
 * Built bottom-up. Lay out each child's subtree on its own, then push the
 * subtrees together from left to right until they ALMOST touch. "Touch" is
 * decided by CONTOURS: for every depth below the subtree root, the leftmost
 * and rightmost edge of anything at that depth. The next subtree has to sit
 * far enough right that, at every depth they share, its left contour clears
 * the right contour of everything placed so far by `gap`. Then the parent
 * goes midway between its first and last child.
 *
 *   depth 0          A                    contours of A's subtree:
 *   depth 1      B       C                  left:  [-w/2, xB - w/2, …]
 *   depth 2    D   E       F                right: [ w/2, xC + w/2, …]
 *
 * Comparing whole contours (not just the children's own boxes) is what keeps
 * a deep, wide grandchild from overlapping a cousin. This version keeps every
 * contour as an array, so it costs O(nodes × depth): fine for diagrams. The
 * 1981 paper threads the contours through the tree to make it linear.
 *
 * A child may be `null`: an empty slot that takes up room but draws nothing.
 * Binary trees use it so a lone right child still sits to the right.
 *
 * Known limit (the classic one): small subtrees between two big ones pack to
 * the left instead of spreading evenly. Walker's 1990 variant fixes it; that
 * is a good exercise.
 */

export interface TidyOptions<T> {
  /** Width of a node's box. Default 40. */
  width?: (node: T) => number;
  /** Minimum space between neighbouring subtrees at any depth. Default 16. */
  gap?: number;
  /** Width of an empty (null) slot. Default 40. */
  slot?: number;
}

export interface TidyPlacement<T> {
  node: T;
  /** Centre, relative to the root (root at 0). */
  x: number;
  depth: number;
  parent: T | null;
}

interface Sub<T> {
  /** Every node of the subtree, x relative to the subtree root. */
  nodes: TidyPlacement<T>[];
  /** Per depth (0 = the subtree root): leftmost and rightmost edge, relative to the root. */
  left: number[];
  right: number[];
}

export function tidy<T>(root: T, children: (node: T) => readonly (T | null | undefined)[] | undefined, o: TidyOptions<T> = {}): TidyPlacement<T>[] {
  const width = o.width ?? (() => 40);
  const gap = o.gap ?? 16;
  const slot = o.slot ?? 40;

  const layout = (n: T, parent: T | null): Sub<T> => {
    const w = width(n);
    const kids = children(n) ?? [];
    // a node whose children are all empty slots is a leaf
    if (!kids.some((k) => k != null)) return { nodes: [{ node: n, x: 0, depth: 0, parent }], left: [-w / 2], right: [w / 2] };
    const subs: Sub<T>[] = kids.map((k) => (k != null ? layout(k, n) : { nodes: [], left: [-slot / 2], right: [slot / 2] }));

    // Push each subtree right until its left contour clears everything so far.
    const offsets: number[] = [0];
    const left = [...subs[0].left], right = [...subs[0].right];
    for (let i = 1; i < subs.length; i++) {
      const s = subs[i];
      let shift = -Infinity;
      for (let d = 0; d < Math.min(right.length, s.left.length); d++) shift = Math.max(shift, right[d] + gap - s.left[d]);
      offsets.push(shift);
      for (let d = 0; d < s.left.length; d++) {
        right[d] = s.right[d] + shift; // the new subtree is now the rightmost at every depth it reaches
        if (d >= left.length) left[d] = s.left[d] + shift; // and the leftmost only where nothing else reaches
      }
    }
    // The parent sits midway between its first and last child (slots count, so a lone child leans).
    const mid = (offsets[0] + offsets[offsets.length - 1]) / 2;
    const nodes: TidyPlacement<T>[] = [{ node: n, x: 0, depth: 0, parent }];
    subs.forEach((s, i) => s.nodes.forEach((p) => nodes.push({ ...p, x: p.x + offsets[i] - mid, depth: p.depth + 1 })));
    return { nodes, left: [-w / 2, ...left.map((v) => v - mid)], right: [w / 2, ...right.map((v) => v - mid)] };
  };

  return layout(root, null).nodes;
}
