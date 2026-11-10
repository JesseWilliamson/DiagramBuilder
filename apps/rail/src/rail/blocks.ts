// Automatic three-aspect signalling on one line, as a pure function.
//
// Each signal protects the block section ahead of it, which here is one track
// circuit. The rule every automatic signal follows:
//   stop     if its block is occupied (or the track circuit says so)
//   caution  if the next signal is at stop
//   clear    otherwise
// Note what "occupied" means: the track circuit reports it. A train shorts the
// rails and drops the relay; so does a broken rail, a flooded track, a failed
// relay. The signal can't tell the difference, so it fails to the safe side.
import type { Aspect } from './draw';

export type Line = { signals: number[]; end: number }; // signal positions (px), end of the last block

export function occupied(line: Line, trains: { front: number; length: number }[], failed: ReadonlySet<number>): boolean[] {
  return line.signals.map((s, i) => {
    const e = line.signals[i + 1] ?? line.end;
    return failed.has(i) || trains.some((t) => t.front > s && t.front - t.length < e);
  });
}

export function aspects(occ: boolean[]): Aspect[] {
  const out: Aspect[] = new Array(occ.length);
  // work back from the far end: each signal reads the one ahead (beyond the last, assume clear)
  for (let i = occ.length - 1; i >= 0; i--) {
    out[i] = occ[i] ? 'stop' : i + 1 < occ.length && out[i + 1] === 'stop' ? 'caution' : 'clear';
  }
  return out;
}
