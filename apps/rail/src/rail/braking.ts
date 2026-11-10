// Braking curves and a train approaching an end of authority, with and without
// automatic train protection.
//
// Every curve here is the same physics: stopping from speed v at a constant
// deceleration a takes a distance d = v² / 2a. Turn it round and the highest
// speed from which you can still stop by the end of authority, d metres away, is
// v = √(2·a·d). Supervision draws that curve three times with different
// decelerations: the gentlest gives the earliest warning, the hardest is the last
// moment the onboard computer can still stop the train by braking itself.
// Real curves also allow for the driver's reaction time, the time brakes take to
// build up, gradients and how well this train brakes; this model leaves those out.

export const EOA = 1800; // metres: the end of authority (a signal at stop)
export const LINE_SPEED = 100; // km/h
export const DECEL = { warning: 0.45, permitted: 0.55, intervention: 0.7, driver: 0.5, emergency: 1.0 }; // m/s²
export const BALISES = [
  { x: 400, label: 'balise group: authority to S14' },
  { x: 1150, label: 'infill' },
];

const kmh = (ms: number) => ms * 3.6;
const ms = (kmh: number) => kmh / 3.6;

/** The supervision curve for deceleration `a`, as speed (km/h) against distance (m), capped at `cap`. */
export const curve = (a: number, cap = LINE_SPEED) => (x: number) => (x > EOA ? 0 : Math.min(cap, kmh(Math.sqrt(2 * a * (EOA - x)))));
export const warningCurve = curve(DECEL.warning);
export const permittedCurve = curve(DECEL.permitted, LINE_SPEED + 3);
export const interventionCurve = curve(DECEL.intervention, LINE_SPEED + 8);

export type Run = { profile: number[]; stop: number; warning?: number; overspeed?: number; intervention?: number; overrun: number };

/**
 * Drive the train: run at `speed` until `brakeAt`, then brake at the driver's
 * rate. With `atp`, the moment the speed is above the intervention curve, the
 * computer applies the emergency brake and keeps it on. `profile[i]` is the speed at i metres.
 */
export function drive(speed: number, brakeAt: number, atp: boolean): Run {
  let v = ms(speed);
  let emergency = false;
  const run: Run = { profile: [], stop: 0, overrun: 0 };
  for (let x = 0; x <= 2600; x++) {
    const k = kmh(v);
    run.profile.push(k);
    if (v <= 0) {
      run.stop = x;
      break;
    }
    if (run.warning === undefined && k > warningCurve(x) + 0.01) run.warning = x;
    if (run.overspeed === undefined && k > permittedCurve(x) + 0.01) run.overspeed = x;
    if (atp && !emergency && k > interventionCurve(x) + 0.01) {
      emergency = true;
      run.intervention = x;
    }
    const a = emergency ? DECEL.emergency : x >= brakeAt ? DECEL.driver : 0;
    v = Math.sqrt(Math.max(0, v * v - 2 * a));
  }
  run.overrun = Math.max(0, run.stop - EOA);
  return run;
}

/** Speed at distance x on a run (km/h), for drawing. */
export const speedAt = (r: Run) => (x: number) => (x >= r.profile.length ? 0 : r.profile[Math.max(0, Math.floor(x))]);
