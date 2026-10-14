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
import { arrow, circle, circleEdge, text } from '../scene';
import { V2 } from '../vec';
import { resolveTone, show } from './common';
export function binaryTree(root, o = {}) {
    const id = o.id ?? 'tree';
    const r = o.r ?? 20, dx = o.dx ?? 46, dy = o.dy ?? 66;
    const x0 = o.x ?? 0, y0 = (o.y ?? 0) + r;
    // 1. in-order index + depth for every node
    const placed = [];
    let counter = 0;
    const walk = (n, parent, depth) => {
        if (!n)
            return;
        walk(n.left, n, depth + 1);
        placed.push({ node: n, parent, order: counter++, depth });
        walk(n.right, n, depth + 1);
    };
    walk(root, null, 0);
    // 2. centre the whole thing horizontally on x0
    const pos = new Map();
    for (const p of placed)
        pos.set(String(p.node.key), V2(x0 + (p.order - (counter - 1) / 2) * dx, y0 + p.depth * dy));
    // 3. emit nodes: edges first so they sit underneath the circles
    const edges = [];
    const circles = [];
    const labels = [];
    for (const { node, parent } of placed) {
        const p = pos.get(String(node.key));
        const from = parent ? pos.get(String(parent.key)) : undefined;
        const enter = from ? { x: from.x, y: from.y } : undefined;
        const tone = resolveTone(o.tones, node.key, node);
        circles.push(circle({ id: `${id}:node:${node.key}`, x: p.x, y: p.y, r, tone, enter, interactive: o.interactive, data: node }));
        labels.push(text({ id: `${id}:label:${node.key}`, x: p.x, y: p.y, text: show(node.label ?? node.key), size: 15, weight: 600, role: 'value', tone, enter }));
        if (from) {
            const a = circleEdge(from, p, r), b = circleEdge(p, from, r);
            edges.push(arrow({
                id: `${id}:edge:${node.key}`,
                x1: a.x, y1: a.y, x2: b.x, y2: b.y,
                head: false,
                tone: resolveTone(o.edgeTones, node.key, node),
                enter: { x1: a.x, y1: a.y, x2: a.x, y2: a.y }, // grows out of the parent
            }));
        }
        if (o.showNulls) {
            for (const side of ['left', 'right']) {
                if (node[side])
                    continue;
                const q = V2(p.x + (side === 'left' ? -1 : 1) * dx * 0.42, p.y + dy * 0.62);
                const a = circleEdge(p, q, r);
                edges.push(arrow({ id: `${id}:nulledge:${node.key}:${side}`, x1: a.x, y1: a.y, x2: q.x, y2: q.y - 6, head: false, tone: 'muted', dashed: true }));
                labels.push(text({ id: `${id}:null:${node.key}:${side}`, x: q.x, y: q.y + 4, text: '∅', size: 12, role: 'null' }));
            }
        }
    }
    const get = (k) => pos.get(String(k)) ?? V2(x0, y0);
    return {
        nodes: [...edges, ...circles, ...labels],
        pos: (k) => pos.get(String(k)),
        top: (k) => V2(get(k).x, get(k).y - r),
        bottom: (k) => V2(get(k).x, get(k).y + r),
        left: (k) => V2(get(k).x - r, get(k).y),
        right: (k) => V2(get(k).x + r, get(k).y),
    };
}
/**
 * Build a tree from LeetCode-style level order: [3, 9, 20, null, null, 15, 7].
 * Keys are the array indices, so the same input always gets the same ids.
 */
export function treeFromLevelOrder(values) {
    if (!values.length || values[0] == null)
        return null;
    const mk = (i) => ({ key: i, label: values[i], left: null, right: null });
    const root = mk(0);
    const queue = [root];
    let i = 1;
    while (queue.length && i < values.length) {
        const n = queue.shift();
        for (const side of ['left', 'right']) {
            if (i < values.length && values[i] != null) {
                n[side] = mk(i);
                queue.push(n[side]);
            }
            i++;
        }
    }
    return root;
}
