// A point machine's cycle as a list of snapshots: unlock, move, lock, detect.
// `pos` is where the blades are, 0 = normal, 1 = reverse. The signal reading
// over the points only ever looks at the last two fields: locked and detected.
export type Lie = 'N' | 'R';
export type Stage = 'unlock' | 'move' | 'lock' | 'detect' | 'fail';
export type Snapshot = { stage: Stage; pos: number; locked: boolean; detected: boolean; note: string };

const P = { N: 0, R: 1 } as const;

/** The stages of throwing from `from` to `to` (blades starting at `startPos`, for blades left part-way by a failed throw). `stone` sits between the curved blade and its stock rail, so it only stops a move to reverse. */
export function throwPoints(from: Lie, to: Lie, stone: boolean, startPos: number = P[from]): Snapshot[] {
  if (from === to) return [{ stage: 'detect', pos: P[to], locked: true, detected: !(stone && to === 'R'), note: 'Already lying that way.' }];
  const a = startPos, b = P[to];
  const blocked = stone && to === 'R';
  const end = blocked ? 0.62 : b;
  const out: Snapshot[] = [
    { stage: 'unlock', pos: a, locked: false, detected: false, note: 'Detection drops at once, then the lock is withdrawn. Any signal reading over the points goes to stop.' },
    { stage: 'move', pos: (a + end) / 2, locked: false, detected: false, note: 'The drive moves both blades together: they are tied by stretcher bars.' },
    { stage: 'move', pos: end, locked: false, detected: false, note: blocked ? 'The curved blade meets the stone and stops short of its stock rail.' : 'The closing blade comes up against its stock rail.' },
  ];
  if (blocked) {
    out.push({ stage: 'lock', pos: end, locked: false, detected: false, note: 'The lock cannot enter: the blades are not fully over.' });
    out.push({ stage: 'fail', pos: end, locked: false, detected: false, note: 'No detection. The panel shows the points out of correspondence, and nothing reading over them can clear.' });
  } else {
    out.push({ stage: 'lock', pos: b, locked: true, detected: false, note: 'The lock enters: only possible if the blades are fully over.' });
    out.push({ stage: 'detect', pos: b, locked: true, detected: true, note: `Detection proves the closed blade is home, the open blade is clear, and the lock is in. Points ${to === 'N' ? 'normal' : 'reverse'} and detected.` });
  }
  return out;
}
