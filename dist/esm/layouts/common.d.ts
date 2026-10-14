import { Tone } from '../scene';
export type Key = string | number;
/**
 * Most layouts accept tones either as a lookup object (`{ 3: 'active' }`)
 * or a function (`(i, value) => i === mid ? 'active' : undefined`).
 */
export type ToneSpec<K, V = unknown> = Partial<Record<string, Tone>> | ((key: K, value: V) => Tone | undefined);
export declare function resolveTone<K extends Key, V>(spec: ToneSpec<K, V> | undefined, key: K, value: V): Tone | undefined;
export declare const show: (v: unknown) => string;
