// The crossing model behind the train graph, kept apart from the drawing so it can
// be tested on its own. Crossing at a loop means whichever train gets there first
// waits until the other has arrived and is clear, because the section beyond is
// occupied by the opposing train.
export type Place = { id: string; name: string; km: number; loop?: number };
export const places: Place[] = [
  { id: 'A', name: 'Ardmore', km: 0 },
  { id: 'B', name: 'Bellbird', km: 42, loop: 1800 },
  { id: 'C', name: 'Coolabah', km: 76, loop: 1200 },
  { id: 'D', name: 'Dunmore', km: 108, loop: 1800 },
  { id: 'E', name: 'Emu Flat', km: 150 },
];
export const END = 150;
export const down = { id: '1MP5', speed: 75, length: 1500, dep: 0 }; // km/h, metres, minutes after 06:00
export const up = { id: '2PM4', speed: 80, length: 1650 };
const CLEAR = 3; // minutes after the first train is in the loop and the points are reset before the other may go

export function plan(loopId: string, upDep: number) {
  const loop = places.find((p) => p.id === loopId)!;
  const dArrive = down.dep + (loop.km / down.speed) * 60;
  const uArrive = upDep + ((END - loop.km) / up.speed) * 60;
  const first = dArrive <= uArrive ? 'down' : 'up';
  // the first train waits for the other to arrive, plus the clearing time
  const dLeave = first === 'down' ? Math.max(dArrive, uArrive + CLEAR) : dArrive;
  const uLeave = first === 'up' ? Math.max(uArrive, dArrive + CLEAR) : uArrive;
  const dEnd = dLeave + ((END - loop.km) / down.speed) * 60;
  const uEnd = uLeave + (loop.km / up.speed) * 60;
  // one of the two must be able to stand clear in the loop
  const fits = (len: number) => (loop.loop ?? 0) >= len;
  const ok = fits(down.length) || fits(up.length);
  return { loop, dArrive, uArrive, dLeave, uLeave, dEnd, uEnd, first, ok, dDelay: dLeave - dArrive, uDelay: uLeave - uArrive };
}

