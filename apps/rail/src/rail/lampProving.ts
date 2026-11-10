// Lamp proving as a pure function. The interlocking doesn't trust that a lamp is lit
// because it switched it on: it proves current is actually flowing through it. If the
// lamp it needs isn't proved, the signal shows the next more restrictive aspect it CAN
// show, and if even the red is gone, the signal is dark and the one in rear is held at
// stop so no driver approaches a dark signal at speed.
export type Lamp = 'red' | 'yellow' | 'green';
export type Shown = 'stop' | 'caution' | 'clear' | 'dark';

export function shown(commanded: 'stop' | 'caution' | 'clear', failed: ReadonlySet<Lamp>): Shown {
  const ok = (l: Lamp) => !failed.has(l);
  if (commanded === 'clear' && ok('green')) return 'clear';
  if (commanded !== 'stop' && ok('yellow')) return 'caution';
  return ok('red') ? 'stop' : 'dark';
}

/** What the signal in rear may show, given the forward signal's proved aspect. */
export function rearAspect(forward: Shown): Shown {
  if (forward === 'dark') return 'stop'; // the lamp-proving rule: never let a driver approach a dark signal at speed
  return forward === 'stop' ? 'caution' : 'clear';
}

export const lampOf: Record<Exclude<Shown, 'dark'>, Lamp> = { stop: 'red', caution: 'yellow', clear: 'green' };
