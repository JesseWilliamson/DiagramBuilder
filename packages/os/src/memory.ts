/**
 * Raw memory: a strip of bytes with hex addresses, and typed values laid over
 * them. This is the picture behind pointer arithmetic: `p + 1` on an `int*`
 * moves 4 bytes, on a `char*` 1 byte, on a `double*` 8, because the compiler
 * multiplies by the size of what `p` points at.
 */
import { Scene, SceneNode, Tone, V2, Vec, path, rect, text } from '@figurae/core';

export interface MemoryGroup {
  /** Stable identity (e.g. 'a[2]'): resizing a group tweens it. */
  key: string;
  /** Byte offset from `base`. */
  offset: number;
  /** Size in bytes. */
  size: number;
  value?: string;
  tone?: Tone;
  /** Small label above the group, e.g. 'a[2]'. */
  label?: string;
}

export interface MemoryOptions {
  id?: string;
  x?: number;
  y?: number;
  /** Address of byte 0. */
  base?: number;
  /** Total bytes in the strip. */
  bytes: number;
  /** Pixels per byte. Default 14. */
  byteWidth?: number;
  height?: number;
  groups?: readonly MemoryGroup[];
  /** Hex digits to show in addresses. Default 4 (the low digits). */
  digits?: number;
  /** Address under every Nth byte as well as at each group start. Default: groups only. */
  addressEvery?: number;
}

export interface MemoryDiagram extends Scene {
  xAt(offset: number): number;
  /** Top-centre of a group (for pointer arrows). */
  top(key: string): Vec;
  bottom(key: string): Vec;
  /** Top of an arbitrary byte. */
  byteTop(offset: number): Vec;
}

export const hex = (n: number, digits = 4) => '0x' + (n >>> 0).toString(16).padStart(digits, '0').slice(-digits);

export function memory(o: MemoryOptions): MemoryDiagram {
  const id = o.id ?? 'memory';
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const bw = o.byteWidth ?? 14, h = o.height ?? 34;
  const base = o.base ?? 0x1000;
  const digits = o.digits ?? 4;
  const xAt = (off: number) => x0 + off * bw;
  const nodes: SceneNode[] = [];
  // the byte strip: one hairline per byte boundary
  nodes.push(rect({ id: `${id}:strip`, x: xAt(o.bytes / 2), y: y0 + h / 2, w: o.bytes * bw, h, rx: 3, role: 'track' }));
  for (let b = 1; b < o.bytes; b++) nodes.push(path({ id: `${id}:byte:${b}`, points: [[xAt(b), y0 + h - 6], [xAt(b), y0 + h]], role: 'tick', width: 1 }));
  const groups = new Map<string, MemoryGroup>();
  const addrAt = new Set<number>();
  for (const g of o.groups ?? []) {
    groups.set(g.key, g);
    addrAt.add(g.offset);
    const cx = xAt(g.offset + g.size / 2);
    nodes.push(rect({ id: `${id}:g:${g.key}`, x: cx, y: y0 + h / 2, w: g.size * bw - 2, h: h - 4, rx: 4, tone: g.tone }));
    if (g.value !== undefined) nodes.push(text({ id: `${id}:g:${g.key}:v`, x: cx, y: y0 + h / 2, text: g.value, size: 12, role: 'value', tone: g.tone }));
    if (g.label) nodes.push(text({ id: `${id}:g:${g.key}:l`, x: cx, y: y0 - 10, text: g.label, size: 11, role: 'caption', tone: g.tone }));
  }
  if (o.addressEvery) for (let b = 0; b <= o.bytes; b += o.addressEvery) addrAt.add(b);
  for (const b of [...addrAt].sort((a, c) => a - c)) {
    nodes.push(text({ id: `${id}:addr:${b}`, x: xAt(b), y: y0 + h + 12, text: hex(base + b, digits), size: 9, role: 'index', anchor: 'start' }));
  }
  const g = (k: string) => groups.get(k) ?? { offset: 0, size: 0 };
  return {
    nodes,
    xAt,
    top: (k) => V2(xAt(g(k).offset + g(k).size / 2), y0),
    bottom: (k) => V2(xAt(g(k).offset + g(k).size / 2), y0 + h),
    byteTop: (b) => V2(xAt(b), y0),
  };
}
