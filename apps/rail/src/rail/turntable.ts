// A turntable as a small state machine. The bridge turns only when unlocked; a
// locomotive moves on or off only when the bridge is locked to a road; the
// locking bolt goes in only when the bridge is lined up exactly with a road.
// Those three rules are the turntable's interlocking, and each refusal says why.

export type Road = { id: string; angle: number; name: string };
// angles in degrees, measured clockwise from east (screen coordinates: y is down)
export const roads: Road[] = [
  { id: 'main', angle: 180, name: 'from the main line' },
  { id: 's1', angle: 0, name: 'stall 1' },
  { id: 's2', angle: 30, name: 'stall 2' },
  { id: 's3', angle: 60, name: 'stall 3' },
  { id: 's4', angle: 330, name: 'stall 4' },
];

export type Loco = { at: string | 'bridge'; heading: number }; // heading: which way the cab end points, degrees
export type Table = { angle: number; locked: boolean; loco: Loco };

export const norm = (a: number) => ((a % 360) + 360) % 360;
const close = (a: number, b: number) => Math.abs(((norm(a) - norm(b) + 540) % 360) - 180) < 0.5;

/** The roads the bridge's two ends line up with right now. */
export function alignedRoads(angle: number): Road[] {
  return roads.filter((r) => close(r.angle, angle) || close(r.angle, angle + 180));
}

export type Result = { table: Table; ok: boolean; msg: string };

export function rotate(t: Table, to: number): Result {
  if (t.locked) return { table: t, ok: false, msg: 'The locking bolt is in. Withdraw it before turning the bridge.' };
  const d = to - t.angle;
  const loco = t.loco.at === 'bridge' ? { ...t.loco, heading: norm(t.loco.heading + d) } : t.loco;
  return { table: { ...t, angle: to, loco }, ok: true, msg: '' };
}

export function lock(t: Table, on: boolean): Result {
  if (!on) return { table: { ...t, locked: false }, ok: true, msg: 'Bolt withdrawn. The bridge is free to turn, and nothing may move on or off it.' };
  const r = alignedRoads(t.angle);
  if (!r.length) return { table: t, ok: false, msg: "The bridge isn't lined up with any road, so the bolt can't enter its socket. Turn it until the rails meet exactly." };
  return { table: { ...t, locked: true }, ok: true, msg: `Locked to ${r.map((x) => x.name).join(' and ')}.` };
}

export function driveOn(t: Table): Result {
  if (t.loco.at === 'bridge') return { table: t, ok: false, msg: 'The loco is already on the bridge.' };
  if (!t.locked) return { table: t, ok: false, msg: "The bridge isn't locked. A bridge that can move while a loco rolls on is how locos end up in the pit." };
  if (!alignedRoads(t.angle).some((r) => r.id === t.loco.at)) return { table: t, ok: false, msg: "The bridge is locked to a different road, so there's no rail for the loco to roll onto." };
  return { table: { ...t, loco: { ...t.loco, at: 'bridge' } }, ok: true, msg: 'On the bridge and stopped at the balance point, its weight over the centre pivot.' };
}

export function driveOff(t: Table, roadId: string): Result {
  if (t.loco.at !== 'bridge') return { table: t, ok: false, msg: "The loco isn't on the bridge." };
  if (!t.locked) return { table: t, ok: false, msg: 'Lock the bridge to the road first.' };
  const r = alignedRoads(t.angle).find((x) => x.id === roadId);
  if (!r) return { table: t, ok: false, msg: 'The bridge is not lined up with that road.' };
  return { table: { ...t, loco: { ...t.loco, at: r.id } }, ok: true, msg: `Off onto ${r.name}.` };
}

/** Is the cab end pointing away from the turntable (outwards along its road)? */
export function cabOutward(t: Table): boolean | null {
  if (t.loco.at === 'bridge') return null;
  const r = roads.find((x) => x.id === t.loco.at)!;
  return close(t.loco.heading, r.angle);
}
