// An axle-counter section as a pure function of where the train is.
//
// Two counting heads, A at the entry and B at the exit. The evaluator compares
// axles counted in at A with axles counted out at B: equal means clear, anything
// else means occupied. That is all it knows. It cannot see the section, so a
// miscount and a wagon left behind look exactly the same on the panel.

export const HEAD_A = 150, HEAD_B = 560;
export type Scenario = 'clean' | 'miscount' | 'left';

// a locomotive and two wagons, each on two bogies of two axles (positions from the vehicle's front)
const VEHICLE = 70, GAP = 6;
const AXLES = [8, 18, 52, 62];
export const vehicleCount = 3;
const LEFT_AT = 380; // where the last wagon's front ends up if it parts from the train

export type Vehicle = { i: number; x1: number; x2: number; parted: boolean };
export type Snapshot = { vehicles: Vehicle[]; axles: number[]; countIn: number; countOut: number };

/** Where everything is when the front of the train is at `front` (moving left to right). */
export function snapshot(scenario: Scenario, front: number): Snapshot {
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < vehicleCount; i++) {
    let x2 = front - i * (VEHICLE + GAP);
    // in the 'left' scenario the last wagon uncouples and rolls to a stand inside the section
    const parted = scenario === 'left' && i === vehicleCount - 1 && x2 >= LEFT_AT;
    if (parted) x2 = LEFT_AT;
    vehicles.push({ i, x1: x2 - VEHICLE, x2, parted });
  }
  const axles = vehicles.flatMap((v) => AXLES.map((o) => v.x2 - o));
  const countIn = axles.filter((x) => x >= HEAD_A).length;
  let countOut = axles.filter((x) => x >= HEAD_B).length;
  // in the 'miscount' scenario head B misses one axle (say the train stopped and rocked over it)
  if (scenario === 'miscount' && countOut >= 3) countOut -= 1;
  return { vehicles, axles, countIn, countOut };
}

/** The front position at which the run is over: the whole train (or what's left of it) is past head B. */
export const END_FRONT = HEAD_B + vehicleCount * (VEHICLE + GAP) + 60;
