// ── constructors ─────────────────────────────────────────────────────────────
// They only add `kind`; nodes are plain objects so you can spread / tweak them.
export const circle = (o) => ({ kind: 'circle', ...o });
export const rect = (o) => ({ kind: 'rect', ...o });
export const text = (o) => ({ kind: 'text', ...o });
export const arrow = (o) => ({ kind: 'arrow', ...o });
/**
 * Flatten any mix of layouts / nodes / arrays into one Scene.
 * Falsy parts are skipped so you can write `showMid && pointer(...)`.
 */
export function combine(...parts) {
    const nodes = [];
    for (const p of parts) {
        if (!p)
            continue;
        if (Array.isArray(p))
            nodes.push(...p);
        else if ('nodes' in p)
            nodes.push(...p.nodes);
        else
            nodes.push(p);
    }
    return { nodes };
}
/** Shift every node in a part by (dx, dy). Returns new nodes (inputs untouched). */
export function translate(part, dx, dy) {
    return {
        nodes: combine(part).nodes.map((n) => {
            if (n.kind === 'arrow')
                return { ...n, x1: n.x1 + dx, y1: n.y1 + dy, x2: n.x2 + dx, y2: n.y2 + dy };
            return { ...n, x: n.x + dx, y: n.y + dy };
        }),
    };
}
/** Apply the same tone/role/etc to every node of a part. */
export function style(part, patch) {
    return { nodes: combine(part).nodes.map((n) => ({ ...n, ...patch })) };
}
/** Rough text width: SVG can't measure text without the DOM, so we estimate. */
export const estimateTextWidth = (s, size) => s.length * size * 0.6;
/** Axis-aligned bounds of a node (text and curves are approximated). */
export function nodeBounds(n) {
    switch (n.kind) {
        case 'circle':
            return { x: n.x - n.r, y: n.y - n.r, w: 2 * n.r, h: 2 * n.r };
        case 'rect':
            return { x: n.x - n.w / 2, y: n.y - n.h / 2, w: n.w, h: n.h };
        case 'text': {
            const size = n.size ?? 16;
            const w = estimateTextWidth(n.text, size);
            const x = n.anchor === 'start' ? n.x : n.anchor === 'end' ? n.x - w : n.x - w / 2;
            return { x, y: n.y - size / 2, w, h: size };
        }
        case 'arrow': {
            const b = Math.abs(n.bend ?? 0) / 2; // a quadratic peaks at half its control offset
            const x = Math.min(n.x1, n.x2) - b;
            const y = Math.min(n.y1, n.y2) - b;
            return { x, y, w: Math.abs(n.x2 - n.x1) + 2 * b, h: Math.abs(n.y2 - n.y1) + 2 * b };
        }
    }
}
export function bounds(part) {
    const nodes = combine(part).nodes;
    if (!nodes.length)
        return { x: 0, y: 0, w: 0, h: 0 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodes) {
        const b = nodeBounds(n);
        x0 = Math.min(x0, b.x);
        y0 = Math.min(y0, b.y);
        x1 = Math.max(x1, b.x + b.w);
        y1 = Math.max(y1, b.y + b.h);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/** Point where the segment from `center` toward `toward` exits a circle of radius r. */
export function circleEdge(center, toward, r) {
    const dx = toward.x - center.x, dy = toward.y - center.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: center.x + (dx / l) * r, y: center.y + (dy / l) * r };
}
