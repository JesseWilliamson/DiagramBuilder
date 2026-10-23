/**
 * Hash maps and sets, drawn as a two-column table: key, then value, one row
 * per entry, in insertion order (which is what a JavaScript Map, a Python dict
 * and most people's mental model share).
 *
 * Rows are keyed by the map's key, not by position. So a new entry drops in
 * as its own row, an updated value changes in place, and a deleted entry
 * leaves while the rows below close up: the renderer animates the map's whole
 * lifecycle from nothing but successive snapshots of it.
 *
 * A set is the same table without the value column: pass keys alone.
 */
import { Scene, SceneNode, V2, Vec, rect, text } from '@dsviz/core';
import { Key, ToneSpec, resolveTone, show } from './common';

export interface HashMapOptions<V = unknown> {
  id?: string;
  /** Top-left corner. */
  x?: number;
  y?: number;
  /** Column widths. Default 56 and 72. */
  keyWidth?: number;
  valueWidth?: number;
  /** Row height. Default 32. */
  row?: number;
  /** Tone per entry, by key. */
  tones?: ToneSpec<Key, V | undefined>;
  formatKey?: (k: Key) => string;
  formatValue?: (v: V, k: Key) => string;
  /** A caption above the table, e.g. "seen" or "count". */
  title?: string;
  /** Text shown in a single faint row while the map is empty. Default "empty". */
  empty?: string;
  /** Draw a set (keys only). Inferred from the entries; needed only for an empty one. */
  set?: boolean;
}

export interface HashMapDiagram extends Scene {
  /** Number of entries. */
  size: number;
  /** Centre of an entry's key cell, or undefined if the key is absent. */
  keyAt(k: Key): Vec | undefined;
  /** Centre of an entry's value cell (the key cell for a set). */
  valueAt(k: Key): Vec | undefined;
  /** Left and right edges of an entry's row, at its middle. */
  left(k: Key): Vec | undefined;
  right(k: Key): Vec | undefined;
}

type Entries<V> = Map<Key, V> | ReadonlyArray<readonly [Key, V]> | ReadonlyArray<Key>;

const isPair = <V,>(e: unknown): e is readonly [Key, V] => Array.isArray(e);

/**
 * A map (`new Map`, or `[key, value]` pairs) or a set (an array of keys) as a
 * table. Pairs and Maps get a value column; bare keys do not.
 */
export function hashMap<V = unknown>(entries: Entries<V>, o: HashMapOptions<V> = {}): HashMapDiagram {
  const id = o.id ?? 'map';
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const list: Array<readonly [Key, V | undefined]> =
    entries instanceof Map ? [...entries] : (entries as ReadonlyArray<unknown>).map((e) => (isPair<V>(e) ? e : ([e as Key, undefined] as const)));
  // Bare keys are a set; a Map or pairs are a map. An empty array could be
  // either, so `set` says which (default: a map).
  const isSet = o.set ?? (!(entries instanceof Map) && list.length > 0 && !isPair((entries as ReadonlyArray<unknown>)[0]));
  const kw = o.keyWidth ?? 56, vw = isSet ? 0 : (o.valueWidth ?? 72), rh = o.row ?? 32;
  const top = o.title ? y0 + 20 : y0;
  const rowY = (i: number) => top + i * rh + rh / 2;
  const index = new Map(list.map(([k], i) => [k, i]));
  const nodes: SceneNode[] = [];

  if (o.title) nodes.push(text({ id: `${id}:title`, x: x0, y: y0 + 7, text: o.title, size: 12, anchor: 'start', role: 'caption' }));
  if (!list.length) {
    nodes.push(
      rect({ id: `${id}:empty`, x: x0 + (kw + vw) / 2, y: rowY(0), w: kw + vw, h: rh - 4, rx: 5, tone: 'ghost' }),
      text({ id: `${id}:empty:t`, x: x0 + (kw + vw) / 2, y: rowY(0), text: o.empty ?? 'empty', size: 12, role: 'caption' }),
    );
  }
  list.forEach(([k, v], i) => {
    const y = rowY(i);
    const tone = resolveTone(o.tones, k, v);
    const key = `${id}:row:${k}`;
    const enter = { y: y - rh * 0.6 };
    const exit = { y: y - rh * 0.6 };
    nodes.push(
      rect({ id: `${key}:k`, x: x0 + kw / 2, y, w: kw - 2, h: rh - 4, rx: 5, tone, role: 'map-key', enter, exit, data: { key: k, value: v } }),
      text({ id: `${key}:kt`, x: x0 + kw / 2, y, text: o.formatKey ? o.formatKey(k) : show(k), size: 13, role: 'code', tone, enter, exit }),
    );
    if (!isSet) {
      nodes.push(
        rect({ id: `${key}:v`, x: x0 + kw + vw / 2, y, w: vw - 2, h: rh - 4, rx: 5, tone, role: 'map-value', enter, exit, data: { key: k, value: v } }),
        text({ id: `${key}:vt`, x: x0 + kw + vw / 2, y, text: v === undefined ? '' : o.formatValue ? o.formatValue(v, k) : show(v), size: 13, role: 'value', tone, enter, exit }),
      );
    }
  });

  const at = (k: Key, x: number) => {
    const i = index.get(k);
    return i === undefined ? undefined : V2(x, rowY(i));
  };
  return {
    nodes,
    size: list.length,
    keyAt: (k) => at(k, x0 + kw / 2),
    valueAt: (k) => at(k, isSet ? x0 + kw / 2 : x0 + kw + vw / 2),
    left: (k) => at(k, x0),
    right: (k) => at(k, x0 + kw + vw),
  };
}
