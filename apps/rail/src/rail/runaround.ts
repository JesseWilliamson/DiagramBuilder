// A run-around at a terminal, as a state machine. A train arrived with the loco
// at the west end; to leave eastwards the loco must get to the east end. Each
// action either moves the state on or is refused with the reason a shunter would
// give. The order the rules care about falls out of the refusals: secure before
// uncoupling, points before moving, couple before releasing handbrakes, and a
// brake test (with the handbrakes off, or it proves nothing) before going.

export type Spot = 'headshunt' | 'mainWest' | 'loop' | 'east' | 'mainEast';
export type Lie = 'N' | 'R';
export type State = { loco: Spot; coupled: boolean; handbrakes: boolean; p1: Lie; p2: Lie; tested: boolean; moves: number };
export type Action = 'handbrakes' | 'release' | 'uncouple' | 'couple' | 'p1' | 'p2' | 'west' | 'east' | 'test';

export const start: State = { loco: 'mainWest', coupled: true, handbrakes: false, p1: 'N', p2: 'N', tested: false, moves: 0 };

const RUN_THROUGH = 'over points set against it. Trailing through points like this forces the blades open and damages them, and in the facing direction it can derail. Set the points for where you are going first.';

/** Where the loco ends up going west/east from `s`, or why it can't. */
function move(s: State, dir: 'west' | 'east'): { to: Spot } | { error: string } {
  if (s.coupled) return { error: s.handbrakes ? "The loco is still coupled to the wagons, and their handbrakes are on. You'd drag them with locked wheels and flat their tyres. Uncouple first." : "The loco is still coupled: it would take the wagons with it. Uncouple first." };
  const at = s.loco;
  if (dir === 'west') {
    if (at === 'headshunt') return { error: 'The headshunt ends at a stop block. There is nowhere further west to go.' };
    if (at === 'mainWest') return s.p1 === 'N' ? { to: 'headshunt' } : { error: `Points 1 are reverse, set for the loop, so the loco would run ${RUN_THROUGH}` };
    if (at === 'loop') return s.p1 === 'R' ? { to: 'headshunt' } : { error: `Points 1 are normal, set for the main, so the loco would run ${RUN_THROUGH}` };
    if (at === 'east') return s.p2 === 'R' ? { to: 'loop' } : { to: 'mainEast' };
    return { error: 'The wagons are right there. To join them, couple up (and stop short first: never buffer up at speed).' };
  }
  if (at === 'mainWest') return { error: "East of the loco are the wagons. Going that way means buffering into them, which you'd only do to couple, and you're coupling at the other end." };
  if (at === 'headshunt') return { to: s.p1 === 'N' ? 'mainWest' : 'loop' };
  if (at === 'loop') return s.p2 === 'R' ? { to: 'east' } : { error: `Points 2 are normal, set for the main, so the loco would run ${RUN_THROUGH}` };
  if (at === 'mainEast') return s.p2 === 'N' ? { to: 'east' } : { error: `Points 2 are reverse, so the loco would run ${RUN_THROUGH}` };
  return { error: 'East of here is the running line. You need an authority for that, and you have not finished the run-around.' };
}

export function act(s: State, a: Action): { state: State; error?: string; note?: string } {
  switch (a) {
    case 'handbrakes':
      if (s.handbrakes) return { state: s, error: 'The handbrakes are already on.' };
      return { state: { ...s, handbrakes: true }, note: 'Handbrakes on: the wagons will stay put without the loco, even on a grade and once their air brakes have leaked off.' };
    case 'uncouple':
      if (!s.coupled) return { state: s, error: 'Already uncoupled.' };
      if (!s.handbrakes) return { state: s, error: "Not yet. Uncouple now and the wagons have nothing holding them but air brakes that will leak off. On any grade they'll start to roll. Secure them with handbrakes first." };
      return { state: { ...s, coupled: false, tested: false }, note: 'Loco uncoupled. The brake pipe is now open at that end, so the wagon brakes are applied, but only for as long as the air lasts.' };
    case 'p1':
    case 'p2':
      // every spot the loco can stop at is clear of the points, so they are always free to move here
      return { state: { ...s, [a]: s[a] === 'N' ? 'R' : 'N' }, note: `Points ${a === 'p1' ? 1 : 2} set ${s[a] === 'N' ? 'reverse' : 'normal'}.` };
    case 'west':
    case 'east': {
      const m = move(s, a);
      if ('error' in m) return { state: s, error: m.error };
      return { state: { ...s, loco: m.to, moves: s.moves + 1 } };
    }
    case 'couple':
      if (s.coupled) return { state: s, error: 'Already coupled.' };
      if (s.loco === 'mainWest') return { state: s, error: "That's where you started. The loco needs to be at the east end to lead the train out." };
      if (s.loco !== 'mainEast') return { state: s, error: 'The loco has to be right up against the wagons to couple. Bring it onto the main, next to them.' };
      return { state: { ...s, coupled: true, tested: false }, note: 'Coupled: stopped short, eased up, couplers engaged, then a pull to check they held. Brake hoses joined and cocks opened.' };
    case 'test':
      if (!s.coupled) return { state: s, error: "There's no train to test: the loco isn't coupled." };
      if (s.loco !== 'mainEast') return { state: s, error: "You're coupled at the wrong end. The loco needs to lead out to the east." };
      if (s.handbrakes) return { state: s, error: "Release the handbrakes first. A wagon held by its handbrake looks exactly like one whose air brake applied, so the test would prove nothing." };
      return { state: { ...s, tested: true }, note: 'Brake test done: brakes applied from the loco and seen to apply on every wagon to the last, then released and seen to release. Ready to ask Network Control for an authority to depart.' };
    case 'release':
      if (!s.handbrakes) return { state: s, error: 'The handbrakes are already off.' };
      if (!s.coupled) return { state: s, error: "Never release the handbrakes on wagons that aren't coupled to a loco holding them on its air brakes. That's how runaways start." };
      if (s.loco !== 'mainEast') return { state: s, error: "You're coupled at the wrong end: finish the run-around before taking the handbrakes off." };
      return { state: { ...s, handbrakes: false }, note: 'Brake pipe charged and the air brakes applied from the loco, so the train is held. Handbrakes off. Now prove the air brakes work.' };
  }
}

export const done = (s: State) => s.loco === 'mainEast' && s.coupled && s.tested && !s.handbrakes;
