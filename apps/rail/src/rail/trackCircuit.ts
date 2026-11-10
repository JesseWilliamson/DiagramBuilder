// A track circuit, reduced to the one question that matters: is the relay up?
//
// The feed drives current down one rail, through the relay coil, and back up
// the other. While the current flows the relay is held up ("energised"), and up
// means CLEAR. Anything that diverts the current away from the coil drops it:
// a wheelset bridging the rails, or the circuit being broken. Down means OCCUPIED.
// So a loss of power or a broken wire drops the relay and reads as a train,
// which is the safe direction. The dangerous case is the opposite: a vehicle
// that is there but fails to divert the current.

export type TcInput = { vehicle: 'none' | 'train' | 'light'; rusty: boolean; brokenRail: boolean; noPower: boolean };
export type TcResult = { relayUp: boolean; shunted: boolean; truth: 'clear' | 'occupied'; failure: 'none' | 'right-side' | 'wrong-side' };

export function evaluate(i: TcInput): TcResult {
  // a heavy train's wheels cut through a film of rust; a light track vehicle may not
  const shunted = i.vehicle === 'train' || (i.vehicle === 'light' && !i.rusty);
  const powered = !i.noPower && !i.brokenRail;
  const relayUp = powered && !shunted;
  const truth = i.vehicle === 'none' ? 'clear' : 'occupied';
  const shows = relayUp ? 'clear' : 'occupied';
  const failure = shows === truth ? 'none' : shows === 'occupied' ? 'right-side' : 'wrong-side';
  return { relayUp, shunted: shunted && powered, truth, failure };
}
