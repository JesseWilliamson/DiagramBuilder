/**
 * Singly linked lists drawn as [value|•]──▶ boxes.
 *
 * You describe the list as data — each node says who its `next` is — and the
 * layout draws whatever those pointers say, even mid-algorithm states where the
 * list is broken in two (that's exactly what you want for "reverse a list").
 *
 *  - Boxes are placed left→right in `order` (default: walk from the first node).
 *  - Each `next` arrow is identified by the node it STARTS from, so when you
 *    change `a.next` from b to z the arrow swings over instead of popping.
 *  - Arrows pointing backwards curve underneath the row.
 */
import { arrow, circle, rect, text } from '../scene';
import { V2 } from '../vec';
import { show } from './common';
/** Convenience: turn [1, 2, 3] into node specs keyed 'n0', 'n1', … */
export function listFromValues(values, prefix = 'n') {
    return values.map((value, i) => ({ key: `${prefix}${i}`, value, next: i + 1 < values.length ? `${prefix}${i + 1}` : null }));
}
export function linkedList(list, o = {}) {
    const id = o.id ?? 'list';
    const x0 = o.x ?? 0, y0 = o.y ?? 0;
    const w = o.w ?? 52, h = o.h ?? 44, gap = o.gap ?? 44;
    const pw = h * 0.62; // width of the "next" compartment
    const boxW = w + pw;
    const step = boxW + gap;
    const byKey = new Map(list.map((n) => [String(n.key), n]));
    // Placement order: explicit, or walk from the head, then any stragglers.
    let order = o.order ? [...o.order] : [];
    if (!o.order && list.length) {
        const seen = new Set();
        let cur = list[0];
        while (cur && !seen.has(String(cur.key))) {
            seen.add(String(cur.key));
            order.push(cur.key);
            cur = cur.next == null ? undefined : byKey.get(String(cur.next));
        }
        for (const n of list)
            if (!seen.has(String(n.key)))
                order.push(n.key);
    }
    const slotOf = new Map(order.map((k, i) => [String(k), i]));
    // Slot i's value box centre; the pointer compartment sits to its right.
    const slot = (i) => V2(x0 + i * step + w / 2, y0 + h / 2);
    const center = (k) => slot(slotOf.get(String(k)) ?? 0);
    const boxes = [];
    const arrows = [];
    for (const n of list) {
        const c = center(n.key);
        const pc = V2(c.x + w / 2 + pw / 2, c.y); // pointer compartment centre
        boxes.push(rect({ id: `${id}:val:${n.key}`, x: c.x, y: c.y, w, h, rx: 8, tone: n.tone, data: n }), rect({ id: `${id}:ptr:${n.key}`, x: pc.x, y: pc.y, w: pw, h, rx: 8, tone: n.tone }), text({ id: `${id}:txt:${n.key}`, x: c.x, y: c.y, text: show(n.value), size: 17, weight: 600, role: 'value', tone: n.tone }));
        const target = n.next == null ? undefined : byKey.get(String(n.next));
        if (!target) {
            boxes.push(text({ id: `${id}:null:${n.key}`, x: pc.x, y: pc.y + 1, text: '∅', size: 16, role: 'null' }));
            continue;
        }
        boxes.push(circle({ id: `${id}:dot:${n.key}`, x: pc.x, y: pc.y, r: 3.5, role: 'dot' }));
        const t = center(target.key);
        const tone = o.arrowTones?.[String(n.key)];
        if (t.x > pc.x) {
            // forward: straight across to the target's left edge
            arrows.push(arrow({ id: `${id}:next:${n.key}`, x1: pc.x, y1: pc.y, x2: t.x - w / 2 - 3, y2: t.y, tone }));
        }
        else {
            // backward (or self): leave from the bottom and curve under the row
            const span = Math.abs(t.x - pc.x);
            arrows.push(arrow({ id: `${id}:next:${n.key}`, x1: pc.x, y1: pc.y + h / 2, x2: t.x, y2: t.y + h / 2 + 3, bend: -(26 + span * 0.18), tone }));
        }
    }
    return {
        nodes: [...arrows, ...boxes],
        center,
        top: (k) => V2(center(k).x + pw / 2, center(k).y - h / 2),
        bottom: (k) => V2(center(k).x + pw / 2, center(k).y + h / 2),
        slot,
    };
}
