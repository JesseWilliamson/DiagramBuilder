/**
 * Python-Tutor-style memory pictures: stack frames on the left, heap objects
 * on the right, and an arrow for every reference.
 *
 * The thing this makes visible is ALIASING. `b = a` doesn't copy a list; it
 * adds a second arrow to the same object. `b.append(3)` then changes what `a`
 * points at too, and you can see why.
 *
 * Primitives (numbers, strings, None) are drawn inline in their slot. A
 * `{ ref: 'id' }` value draws a dot in the slot and an arrow to heap object `id`.
 */
import { Scene, SceneNode, Tone, V2, Vec, arrow, circle, estimateTextWidth, rect, text } from '@figurae/core';

export type MemValue = number | string | boolean | null | { ref: string };

export interface StackFrame {
  name: string;
  vars: ReadonlyArray<{ name: string; value: MemValue }>;
}

export interface HeapObject {
  id: string;
  /** Shown above the object: 'list', 'tuple', 'dict', a class name… */
  kind: string;
  /** Sequence items, or [key, value] pairs for dicts / instances. */
  items: ReadonlyArray<MemValue> | ReadonlyArray<readonly [string, MemValue]>;
}

export interface StackHeapOptions {
  id?: string;
  x?: number;
  y?: number;
  frameWidth?: number;
  /** x of the heap column. Default frameWidth + 110. */
  heapX?: number;
  rowHeight?: number;
  /** Tones keyed by `frame.var` (e.g. 'Global.a') or heap object id. */
  tones?: Record<string, Tone | undefined>;
  /** Heap layout: explicit positions per object id, relative to (heapX, y). */
  positions?: Record<string, Vec>;
}

export interface StackHeapDiagram extends Scene {
  slot(frame: string, name: string): Vec;
  object(id: string): Vec;
}

const show = (v: MemValue) => (v === null ? 'None' : typeof v === 'string' ? `"${v}"` : typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v));
const isRef = (v: MemValue): v is { ref: string } => typeof v === 'object' && v !== null;

export function stackHeap(frames: readonly StackFrame[], heap: readonly HeapObject[], o: StackHeapOptions = {}): StackHeapDiagram {
  const id = o.id ?? 'mem';
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const fw = o.frameWidth ?? 150;
  const hx = o.heapX ?? x0 + fw + 110;
  const rh = o.rowHeight ?? 28;
  const cellW = 40;
  const nodes: SceneNode[] = [];
  const arrows: SceneNode[] = [];
  const slots = new Map<string, Vec>();
  const objPos = new Map<string, Vec>();

  // ── heap layout first (arrows need to know where objects are) ──
  let hy = y0 + 18;
  for (const obj of heap) {
    const p = o.positions?.[obj.id];
    const at = p ? V2(hx + p.x, y0 + p.y) : V2(hx, hy);
    objPos.set(obj.id, at);
    if (!p) hy += rh + 40;
  }

  // ── stack frames ──
  let fy = y0;
  for (const f of frames) {
    const h = 26 + f.vars.length * rh + 8;
    nodes.push(rect({ id: `${id}:frame:${f.name}`, x: x0 + fw / 2, y: fy + h / 2, w: fw, h, rx: 6, role: 'frame' }));
    nodes.push(text({ id: `${id}:frame:${f.name}:t`, x: x0 + 10, y: fy + 13, text: f.name, size: 11, role: 'caption', anchor: 'start' }));
    f.vars.forEach((v, i) => {
      const cy = fy + 26 + i * rh + rh / 2;
      const key = `${f.name}.${v.name}`;
      const tone = o.tones?.[key];
      const slotX = x0 + fw - 34;
      slots.set(key, V2(slotX, cy));
      nodes.push(text({ id: `${id}:var:${key}`, x: slotX - 26, y: cy, text: v.name, size: 13, role: 'value', anchor: 'end', tone }));
      nodes.push(rect({ id: `${id}:slot:${key}`, x: slotX, y: cy, w: 40, h: rh - 6, rx: 4, tone }));
      if (isRef(v.value)) {
        nodes.push(circle({ id: `${id}:dot:${key}`, x: slotX, y: cy, r: 3.5, role: 'dot', tone }));
        const t = objPos.get(v.value.ref);
        if (t) arrows.push(refArrow(`${id}:ref:${key}`, V2(slotX, cy), V2(t.x - 4, t.y), tone));
      } else {
        nodes.push(text({ id: `${id}:val:${key}`, x: slotX, y: cy, text: show(v.value), size: 12, role: 'value', tone }));
      }
    });
    fy += h + 12;
  }

  // ── heap objects ──
  for (const obj of heap) {
    const at = objPos.get(obj.id)!;
    const tone = o.tones?.[obj.id];
    nodes.push(text({ id: `${id}:obj:${obj.id}:kind`, x: at.x, y: at.y - rh / 2 - 9, text: obj.kind, size: 11, role: 'caption', anchor: 'start' }));
    const pairs = obj.items.length && Array.isArray(obj.items[0]);
    obj.items.forEach((item, i) => {
      const [k, v] = pairs ? (item as readonly [string, MemValue]) : [String(i), item as MemValue];
      const w = pairs ? Math.max(cellW, estimateTextWidth(k, 11) + 14) + cellW : cellW;
      const cx = at.x + i * (pairs ? w : cellW) + (pairs ? w : cellW) / 2;
      nodes.push(rect({ id: `${id}:obj:${obj.id}:${i}`, x: cx, y: at.y, w: pairs ? w : cellW, h: rh - 4, rx: 3, tone, enter: { x: cx + 20 } }));
      nodes.push(text({ id: `${id}:obj:${obj.id}:${i}:i`, x: pairs ? cx - w / 2 + 7 : cx, y: pairs ? at.y : at.y + rh / 2 + 7, text: k, size: pairs ? 11 : 9, role: 'index', anchor: pairs ? 'start' : 'middle' }));
      const vx = pairs ? cx + w / 2 - cellW / 2 : cx;
      if (isRef(v)) {
        nodes.push(circle({ id: `${id}:obj:${obj.id}:${i}:dot`, x: vx, y: at.y, r: 3.5, role: 'dot' }));
        const t = objPos.get(v.ref);
        if (t) arrows.push(refArrow(`${id}:ref:${obj.id}:${i}`, V2(vx, at.y), V2(t.x - 4, t.y), tone, true));
      } else nodes.push(text({ id: `${id}:obj:${obj.id}:${i}:v`, x: vx, y: at.y, text: show(v), size: 12, role: 'value', tone, enter: { x: vx + 20 } }));
    });
    if (!obj.items.length) nodes.push(rect({ id: `${id}:obj:${obj.id}:empty`, x: at.x + 14, y: at.y, w: 28, h: rh - 4, rx: 3, tone: 'ghost' }));
  }
  return { nodes: [...nodes, ...arrows], slot: (f, n) => slots.get(`${f}.${n}`) ?? V2(0, 0), object: (oid) => objPos.get(oid) ?? V2(0, 0) };
}

function refArrow(id: string, from: Vec, to: Vec, tone?: Tone, fromHeap = false): SceneNode {
  // bow arrows that go up or down so parallel references don't overlap
  const dy = to.y - from.y;
  const bend = fromHeap ? -40 : Math.abs(dy) < 4 ? 0 : Math.sign(dy) * -Math.min(30, Math.abs(dy) * 0.25);
  return arrow({ id, x1: from.x, y1: from.y, x2: to.x, y2: to.y, bend, width: 1.5, tone });
}
