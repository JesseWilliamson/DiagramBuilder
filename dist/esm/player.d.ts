/**
 * Step through an algorithm frame by frame.
 *
 * Pattern: write your algorithm as a generator that `yield`s a SNAPSHOT of its
 * state at each interesting moment. The player runs it to completion up front
 * and keeps every frame, which is what makes "previous step" and a scrubber
 * possible — you can't run a generator backwards, but you can index an array.
 *
 *   function* binarySearch(a, target) {
 *     let lo = 0, hi = a.length - 1;
 *     while (lo <= hi) {
 *       const mid = (lo + hi) >> 1;
 *       yield { lo, hi, mid };              // ← snapshot
 *       ...
 *     }
 *   }
 *
 * ⚠ Yield COPIES of mutable data (`[...arr]`, `structuredClone(x)`). If you
 * yield the same array you keep mutating, every stored frame points at the
 * same final array and the animation looks frozen.
 */
export interface PlayerOptions<S> {
    /** ms between frames when playing. Default 700. */
    interval?: number;
    loop?: boolean;
    /** Safety cap for runaway generators. Default 10 000. */
    maxFrames?: number;
    /** Called on every frame change (including the initial one). */
    onFrame?: (frame: S, index: number, player: Player<S>) => void;
}
export interface Player<S> {
    readonly frames: readonly S[];
    readonly index: number;
    readonly frame: S;
    readonly playing: boolean;
    readonly atEnd: boolean;
    next(): void;
    prev(): void;
    seek(i: number): void;
    play(): void;
    pause(): void;
    toggle(): void;
    /** Replace the frames (e.g. after the user changes the input). */
    load(source: Iterable<S>): void;
    setInterval(ms: number): void;
    subscribe(fn: (frame: S, index: number, player: Player<S>) => void): () => void;
    destroy(): void;
}
export declare function createPlayer<S>(source: Iterable<S>, o?: PlayerOptions<S>): Player<S>;
