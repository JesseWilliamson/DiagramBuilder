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
import { Scene, SceneNode, Tone, arrow, circle, rect, text } from '../scene';
import { V2, Vec } from '../vec';
import { Key, show } from './common';

export interface ListNodeSpec {
  key: Key;
  value: unknown;
  next: Key | null;
  tone?: Tone;
}

export interface LinkedListOptions {
  id?: string;
  x?: number;
  y?: number;
  /** Width of the value part. Default 52. */
  w?: number;
  h?: number;
  /** Horizontal space between boxes (room for the arrow). Default 44. */
  gap?: number;
  /** Explicit left→right placement. Default: follow `next` from nodes[0]. */
  order?: Key[];
  /** Tone for the next-arrow leaving a node. */
  arrowTones?: Partial<Record<string, Tone>>;
}

export interface LinkedListDiagram extends Scene {
  /** Centre of a node's value box. */
  center(key: Key): Vec;
  top(key: Key): Vec;
  bottom(key: Key): Vec;
  /** A point left of slot 0 / right of the last slot (for null pointers). */
  slot(i: number): Vec;
}

/** Convenience: turn [1, 2, 3] into node specs keyed 'n0', 'n1', … */
export function listFromValues(values: readonly unknown[], prefix = 'n'): ListNodeSpec[] {
  return values.map((value, i) => ({ key: `${prefix}${i}`, value, next: i + 1 < values.length ? `${prefix}${i + 1}` : null }));
}

export function linkedList(list: readonly ListNodeSpec[], o: LinkedListOptions = {}): LinkedListDiagram {
  const id = o.id ?? 'list';
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const w = o.w ?? 44, h = o.h ?? 38, gap = o.gap ?? 34;
  const pw = h * 0.62; // width of the "next" compartment
  const boxW = w + pw;
  const step = boxW + gap;
  const byKey = new Map(list.map((n) => [String(n.key), n]));

  // Placement order: explicit, or walk from the head, then any stragglers.
  let order: Key[] = o.order ? [...o.order] : [];
  if (!o.order && list.length) {
    const seen = new Set<string>();
    let cur: ListNodeSpec | undefined = list[0];
    while (cur && !seen.has(String(cur.key))) {
      seen.add(String(cur.key));
      order.push(cur.key);
      cur = cur.next == null ? undefined : byKey.get(String(cur.next));
    }
    for (const n of list) if (!seen.has(String(n.key))) order.push(n.key);
  }
  const slotOf = new Map(order.map((k, i) => [String(k), i]));

  // Slot i's value box centre; the pointer compartment sits to its right.
  const slot = (i: number) => V2(x0 + i * step + w / 2, y0 + h / 2);
  const center = (k: Key) => slot(slotOf.get(String(k)) ?? 0);

  const boxes: SceneNode[] = [];
  const arrows: SceneNode[] = [];
  for (const n of list) {
    const c = center(n.key);
    const pc = V2(c.x + w / 2 + pw / 2, c.y); // pointer compartment centre
    boxes.push(
      rect({ id: `${id}:val:${n.key}`, x: c.x, y: c.y, w, h, rx: 6, tone: n.tone, data: n }),
      text({ id: `${id}:txt:${n.key}`, x: c.x, y: c.y, text: show(n.value), size: 15, role: 'value', tone: n.tone }),
      rect({ id: `${id}:ptr:${n.key}`, x: pc.x, y: pc.y, w: pw, h, rx: 6, tone: n.tone }),
    );
    const target = n.next == null ? undefined : byKey.get(String(n.next));
    if (!target) {
      boxes.push(text({ id: `${id}:null:${n.key}`, x: pc.x, y: pc.y + 1, text: '∅', size: 14, role: 'null' }));
      continue;
    }
    boxes.push(circle({ id: `${id}:dot:${n.key}`, x: pc.x, y: pc.y, r: 3.5, role: 'dot' }));
    const t = center(target.key);
    const tone = o.arrowTones?.[String(n.key)];
    if (t.x > pc.x) {
      // forward: straight across to the target's left edge
      arrows.push(arrow({ id: `${id}:next:${n.key}`, x1: pc.x, y1: pc.y, x2: t.x - w / 2 - 3, y2: t.y, tone }));
    } else {
      // backward (or self): leave from the bottom and curve under the row
      const span = Math.abs(t.x - pc.x);
      arrows.push(
        arrow({ id: `${id}:next:${n.key}`, x1: pc.x, y1: pc.y + h / 2, x2: t.x, y2: t.y + h / 2 + 3, bend: -(26 + span * 0.18), tone }),
      );
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
