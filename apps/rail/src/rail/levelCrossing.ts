// When does a level crossing start warning, and is the road closed in time?
//
// A conventional crossing starts its lights and bells when a train passes the
// strike-in point, a fixed distance up the line. So the warning time is that
// distance divided by the train's speed: a fixed distance gives fast trains a
// short warning and slow trains a very long one. A constant-warning-time
// predictor measures the approaching train's speed and waits, so that every
// train gets about the same warning. It still can't start before the train
// reaches its approach section, so a train faster than the design speed gets
// less warning either way.
//
// All numbers are illustrative, chosen to show the shape of the problem; real
// crossings are designed to their own standards.

export const APPROACH_M = 900; // length of the approach section (strike-in to crossing)
export const TARGET_S = 28; // warning the crossing is designed to give
export const DESIGN_KMH = (APPROACH_M / TARGET_S) * 3.6; // ≈ 116 km/h: the fastest train the approach was sized for
export const BOOM_DELAY_S = 6; // lights flash this long before the booms start down
export const BOOM_TRAVEL_S = 10; // booms take this long to lower (and to rise)
export const TRAIN_M = 300;

export type Phase = { lane: 'train' | 'lights' | 'booms'; start: number; end: number; label: string; tone: 'muted' | 'accent' | 'danger' | 'orange' };

export function crossingTimeline(kmh: number, constantWarning: boolean) {
  const v = kmh / 3.6; // m/s
  const toCrossing = APPROACH_M / v; // seconds from strike-in to the front reaching the road
  const warning = constantWarning ? Math.min(TARGET_S, toCrossing) : toCrossing;
  // time 0 = the moment the warning starts
  const lightsOn = 0;
  const arrive = warning;
  const clear = arrive + TRAIN_M / v; // the rear clears the island: strike-out
  const boomsDownBy = BOOM_DELAY_S + BOOM_TRAVEL_S;
  const rise = Math.max(clear, boomsDownBy); // booms can't start up before they are down
  const boomsUp = rise + BOOM_TRAVEL_S;
  const phases: Phase[] = [
    { lane: 'train', start: lightsOn, end: arrive, label: 'approaching', tone: 'muted' },
    { lane: 'train', start: arrive, end: clear, label: 'on crossing', tone: 'accent' },
    { lane: 'lights', start: lightsOn, end: boomsUp, label: 'lights and bells', tone: 'danger' },
    { lane: 'booms', start: BOOM_DELAY_S, end: boomsDownBy, label: 'lowering', tone: 'orange' },
    { lane: 'booms', start: boomsDownBy, end: clear, label: 'down', tone: 'danger' },
    { lane: 'booms', start: rise, end: boomsUp, label: 'rising', tone: 'orange' },
  ].filter((p) => p.end > p.start + 0.01) as Phase[];
  return {
    phases,
    warning,
    // how long the booms are fully down before the train arrives (negative: still moving when it gets there)
    boomsDownBeforeTrain: arrive - boomsDownBy,
    roadClosed: boomsUp, // lights start to booms back up
    waitedBeforeTrain: arrive, // what a motorist stopped at the start waits before seeing the train
  };
}
