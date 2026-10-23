// A copy of the tiny tone helpers in @dsviz/ds (ds/common.ts): prob may
// depend only on core and layout, and these are ten lines.
import { Tone } from '@dsviz/core';

export type ToneSpec<K, V = unknown> = Partial<Record<string, Tone>> | ((key: K, value: V) => Tone | undefined);

export function resolveTone<K extends string | number, V>(spec: ToneSpec<K, V> | undefined, key: K, value: V): Tone | undefined {
  if (!spec) return undefined;
  return typeof spec === 'function' ? spec(key, value) : spec[String(key)];
}
