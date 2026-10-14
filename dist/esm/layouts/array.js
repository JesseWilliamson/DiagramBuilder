/**
 * Arrays: a row of cells, with index labels underneath.
 *
 * The important design decision is WHAT A CELL'S ID IS:
 *  - the cell box + value text are identified by the element's `key`
 *    (default: its index). Give elements stable keys and a swap becomes two
 *    cells sliding past each other instead of two numbers changing in place.
 *  - the index labels (0, 1, 2…) are identified by POSITION, because index 3
 *    is always index 3 no matter what value sits in it.
 */
import { rect, text } from '../scene';
import { V2 } from '../vec';
import { resolveTone, show } from './common';
export function array(values, o = {}) {
    const id = o.id ?? 'arr';
    const x0 = o.x ?? 0, y0 = o.y ?? 0;
    const cell = o.cell ?? 48;
    const gap = o.gap ?? 6;
    const step = cell + gap;
    const keys = o.keys ?? values.map((_, i) => i);
    const size = Math.round(cell * 0.4);
    const center = (i) => o.vertical ? V2(x0 + cell / 2, y0 + i * step + cell / 2) : V2(x0 + i * step + cell / 2, y0 + cell / 2);
    const nodes = [];
    values.forEach((v, i) => {
        const c = center(i);
        const key = keys[i];
        const tone = resolveTone(o.tones, i, v);
        const enter = o.enterOffset ? { x: c.x + o.enterOffset.x, y: c.y + o.enterOffset.y } : undefined;
        const exit = o.exitOffset ? { x: c.x + o.exitOffset.x, y: c.y + o.exitOffset.y } : undefined;
        nodes.push(rect({ id: `${id}:cell:${key}`, x: c.x, y: c.y, w: cell, h: cell, rx: cell * 0.16, tone, enter, exit, interactive: o.interactive, data: { index: i, key, value: v } }), text({ id: `${id}:val:${key}`, x: c.x, y: c.y, text: o.format ? o.format(v, i) : show(v), size, weight: 600, role: 'value', tone, enter, exit }));
    });
    if (o.showIndices ?? true) {
        values.forEach((_, i) => {
            const c = center(i);
            const p = o.vertical ? V2(c.x - cell / 2 - 10, c.y) : V2(c.x, c.y + cell / 2 + 14);
            nodes.push(text({ id: `${id}:idx:${i}`, x: p.x, y: p.y, text: String(i), size: 12, role: 'index', anchor: o.vertical ? 'end' : 'middle' }));
        });
    }
    const half = cell / 2;
    return {
        nodes,
        length: values.length,
        cell,
        center,
        top: (i) => V2(center(i).x, center(i).y - half),
        bottom: (i) => V2(center(i).x, center(i).y + half),
        left: (i) => V2(center(i).x - half, center(i).y),
        right: (i) => V2(center(i).x + half, center(i).y),
        window(lo, hi, w = {}) {
            if (lo > hi || hi < 0 || lo >= values.length)
                return null;
            const pad = w.pad ?? 5;
            const a = center(Math.max(0, lo)), b = center(Math.min(values.length - 1, hi));
            return rect({
                id: w.id ?? `${id}:window`,
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2,
                w: Math.abs(b.x - a.x) + cell + 2 * pad,
                h: Math.abs(b.y - a.y) + cell + 2 * pad,
                rx: cell * 0.22,
                role: 'window',
                tone: w.tone,
            });
        },
    };
}
