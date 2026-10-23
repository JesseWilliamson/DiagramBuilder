/**
 * CPU scheduling simulator. Pure data in, timeline out; the Gantt layout draws it.
 *
 * Time advances in whole units. At each tick the policy picks who runs from the
 * READY QUEUE (processes that have arrived and aren't finished). The policies
 * differ only in that choice and in whether they can take the CPU away
 * (preempt) from a running process:
 *
 *   fcfs      first come, first served. Never preempts.
 *   sjf       shortest job first (by total burst). Never preempts.
 *   srtf      shortest remaining time first. Preempts when a shorter job arrives.
 *   rr        round robin: run for `quantum` ticks, then go to the back of the queue.
 *   priority  lowest `priority` number first. Never preempts.
 */
export interface Process {
  id: string;
  arrival: number;
  burst: number;
  priority?: number;
}

export type Policy = 'fcfs' | 'sjf' | 'srtf' | 'rr' | 'priority';

export interface Segment {
  id: string;
  start: number;
  end: number;
}

export interface Tick {
  t: number;
  /** Who held the CPU during [t, t+1), or null if idle. */
  running: string | null;
  /** Ready queue at time t, front first (excluding the running process). */
  queue: string[];
  /** Processes finished by time t+1. */
  done: string[];
}

export interface Stats {
  id: string;
  arrival: number;
  burst: number;
  /** First time on the CPU. */
  start: number;
  completion: number;
  turnaround: number;
  waiting: number;
  response: number;
}

export interface Schedule {
  segments: Segment[];
  ticks: Tick[];
  stats: Stats[];
  end: number;
  avgWaiting: number;
  avgTurnaround: number;
}

export function simulate(procs: readonly Process[], policy: Policy, quantum = 2): Schedule {
  const ps = [...procs].sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id));
  const remaining = new Map(ps.map((p) => [p.id, p.burst]));
  const firstRun = new Map<string, number>();
  const completion = new Map<string, number>();
  const byId = new Map(ps.map((p) => [p.id, p]));
  const queue: string[] = [];
  const ticks: Tick[] = [];
  const done: string[] = [];
  let running: string | null = null;
  let slice = 0; // ticks the running process has had in its current round-robin turn
  let arrivedUpTo = 0;
  const total = ps.reduce((s, p) => s + p.burst, 0);
  const limit = (ps.at(-1)?.arrival ?? 0) + total + 1;

  const admit = (t: number) => {
    while (arrivedUpTo < ps.length && ps[arrivedUpTo].arrival <= t) queue.push(ps[arrivedUpTo++].id);
  };
  const key = (id: string) => {
    const p = byId.get(id)!;
    if (policy === 'sjf') return p.burst;
    if (policy === 'srtf') return remaining.get(id)!;
    if (policy === 'priority') return p.priority ?? 0;
    return 0;
  };
  const pickBest = () => {
    // stable: ties go to whoever has been waiting longest (earlier in the queue)
    let best = 0;
    for (let i = 1; i < queue.length; i++) if (key(queue[i]) < key(queue[best])) best = i;
    return queue.splice(best, 1)[0];
  };

  for (let t = 0; t < limit && done.length < ps.length; t++) {
    admit(t);
    // preemption / end of quantum
    if (running && policy === 'rr' && slice >= quantum && queue.length) {
      queue.push(running);
      running = null;
    }
    if (running && policy === 'srtf' && queue.length) {
      const i = queue.findIndex((id) => key(id) < remaining.get(running!)!);
      if (i >= 0) {
        queue.push(running);
        running = null;
      }
    }
    if (!running && queue.length) {
      running = policy === 'fcfs' || policy === 'rr' ? queue.shift()! : pickBest();
      slice = 0;
      if (!firstRun.has(running)) firstRun.set(running, t);
    }
    if (running) {
      remaining.set(running, remaining.get(running)! - 1);
      slice++;
    }
    const was = running;
    if (running && remaining.get(running) === 0) {
      completion.set(running, t + 1);
      done.push(running);
      running = null;
    }
    ticks.push({ t, running: was, queue: [...queue], done: [...done] });
  }

  // merge consecutive ticks into segments
  const segments: Segment[] = [];
  for (const k of ticks) {
    if (!k.running) continue;
    const last = segments.at(-1);
    if (last && last.id === k.running && last.end === k.t) last.end = k.t + 1;
    else segments.push({ id: k.running, start: k.t, end: k.t + 1 });
  }
  const stats: Stats[] = ps.map((p) => {
    const c = completion.get(p.id) ?? NaN;
    const s = firstRun.get(p.id) ?? NaN;
    return { id: p.id, arrival: p.arrival, burst: p.burst, start: s, completion: c, turnaround: c - p.arrival, waiting: c - p.arrival - p.burst, response: s - p.arrival };
  });
  const avg = (f: (s: Stats) => number) => stats.reduce((x, s) => x + f(s), 0) / Math.max(1, stats.length);
  return { segments, ticks, stats, end: ticks.length, avgWaiting: avg((s) => s.waiting), avgTurnaround: avg((s) => s.turnaround) };
}
