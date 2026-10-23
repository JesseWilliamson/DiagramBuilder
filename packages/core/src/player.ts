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

export function createPlayer<S>(source: Iterable<S>, o: PlayerOptions<S> = {}): Player<S> {
  let interval = o.interval ?? 700;
  const max = o.maxFrames ?? 10_000;
  let frames: S[] = [];
  let index = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const subs = new Set<(f: S, i: number, p: Player<S>) => void>();
  if (o.onFrame) subs.add(o.onFrame);

  const collect = (src: Iterable<S>) => {
    const out: S[] = [];
    for (const f of src) {
      out.push(f);
      if (out.length >= max) {
        console.warn(`[figurae] player stopped collecting at ${max} frames`);
        break;
      }
    }
    return out;
  };

  const notify = () => {
    if (!frames.length) return;
    for (const fn of subs) fn(frames[index], index, player);
  };

  const tick = () => {
    if (index >= frames.length - 1) {
      if (!o.loop) return pause();
      index = -1;
    }
    index++;
    notify();
    timer = setTimeout(tick, interval);
  };

  function pause() {
    if (timer) clearTimeout(timer);
    timer = null;
    notify(); // so UIs can update their play/pause button
  }

  const player: Player<S> = {
    get frames() {
      return frames;
    },
    get index() {
      return index;
    },
    get frame() {
      return frames[index];
    },
    get playing() {
      return timer !== null;
    },
    get atEnd() {
      return index >= frames.length - 1;
    },
    next() {
      if (index < frames.length - 1) (index++, notify());
    },
    prev() {
      if (index > 0) (index--, notify());
    },
    seek(i) {
      const j = Math.max(0, Math.min(frames.length - 1, Math.round(i)));
      if (j !== index) (index = j, notify());
    },
    play() {
      if (timer) return;
      if (index >= frames.length - 1) index = -1; // restart from the top
      timer = setTimeout(tick, 0);
    },
    pause,
    toggle() {
      timer ? pause() : player.play();
    },
    load(src) {
      if (timer) clearTimeout(timer);
      timer = null;
      frames = collect(src);
      index = 0;
      notify();
    },
    setInterval(ms) {
      interval = ms;
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    destroy() {
      if (timer) clearTimeout(timer);
      timer = null;
      subs.clear();
    },
  };

  frames = collect(source);
  queueMicrotask(notify); // let the caller finish wiring up before the first frame
  return player;
}
