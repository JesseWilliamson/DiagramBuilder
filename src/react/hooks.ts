import { DependencyList, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Player, PlayerOptions, createPlayer } from '../player';

export interface PlayerState<S> {
  frame: S | undefined;
  index: number;
  count: number;
  playing: boolean;
  next(): void;
  prev(): void;
  first(): void;
  seek(i: number): void;
  toggle(): void;
  play(): void;
  pause(): void;
}

/**
 * Step through generator frames. `makeFrames` is re-run whenever `deps` change
 * (new input => new run), which resets to step 0.
 *
 *   const p = usePlayer(() => binarySearch(nums, target), [nums, target]);
 *   p.frame // the current snapshot
 *
 * The Player is a plain mutable object, so React needs a nudge to re-render when
 * it changes: we subscribe and bump a counter (useReducer's cheapest form).
 */
export interface UsePlayerOptions<S> extends Omit<PlayerOptions<S>, 'onFrame'> {
  /** Open on the last frame (show the finished result first, let people rewind). Default 'first'. */
  start?: 'first' | 'end';
}

export function usePlayer<S>(makeFrames: () => Iterable<S>, deps: DependencyList, options?: UsePlayerOptions<S>): PlayerState<S> {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const ref = useRef<Player<S> | null>(null);
  if (!ref.current) {
    ref.current = createPlayer<S>(makeFrames(), options);
    if (options?.start === 'end') ref.current.seek(ref.current.frames.length - 1);
  }
  const player = ref.current;

  useEffect(() => {
    const off = player.subscribe(() => bump());
    return () => (off(), void 0);
  }, [player]);

  const first = useRef(true);
  useEffect(() => {
    // The first run already loaded frames in createPlayer; only reload on later changes.
    if (first.current) return void (first.current = false);
    player.load(makeFrames());
    if (options?.start === 'end') player.seek(player.frames.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => () => player.destroy(), [player]);

  return {
    frame: player.frame,
    index: player.index,
    count: player.frames.length,
    playing: player.playing,
    next: player.next,
    prev: player.prev,
    first: useCallback(() => player.seek(0), [player]),
    seek: player.seek,
    toggle: player.toggle,
    play: player.play,
    pause: player.pause,
  };
}

/** A counter that increments every `ms` while `active`. Drives time-based diagrams (a "now" cursor, a sim). */
export function useTicker(ms: number, active = true): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((v) => v + 1), ms);
    return () => clearInterval(id);
  }, [ms, active]);
  return n;
}

/** Memoise a scene from state. Just `useMemo`, named so the intent reads well at call sites. */
export const useScene = <T,>(build: () => T, deps: DependencyList): T => useMemo(build, deps);
