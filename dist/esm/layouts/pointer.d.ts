/**
 * A labelled pointer arrow (lo / hi / mid / curr / prev …).
 *
 * Give each pointer a stable `id` (e.g. 'mid') and just change `at` between
 * renders — the arrow and its label slide to the new target.
 */
import { Scene, Tone } from '../scene';
import { Vec } from '../vec';
export interface PointerOptions {
    id: string;
    /** The point the arrow tip touches, e.g. `arr.top(i)`. */
    at: Vec;
    label?: string;
    /** Which side the pointer comes from. Default 'top'. */
    side?: 'top' | 'bottom' | 'left' | 'right';
    length?: number;
    /** Gap between the tip and the target. Default 4. */
    gap?: number;
    /** Stack several pointers at the same spot: level 1 sits one label further out. */
    level?: number;
    tone?: Tone;
}
export declare function pointer(o: PointerOptions): Scene;
