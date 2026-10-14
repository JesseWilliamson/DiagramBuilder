/** Easing curves: t in [0, 1] → progress (may overshoot 1 for springy ones). */
export type Easing = (t: number) => number;
export declare const linear: Easing;
export declare const easeOutCubic: Easing;
export declare const easeInOutCubic: Easing;
/** Overshoots by ~8% then settles: the "bouncy" feel of playful UIs. */
export declare const easeOutBack: Easing;
