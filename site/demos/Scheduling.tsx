// CPU scheduling. Same five processes, four policies: watch the bars rearrange,
// and the average waiting time change, as you switch.
import { useState } from 'react';
import { array, combine, sched, text, Tone } from 'dsviz';
import { Diagram, NumberStepper, Segmented, Transport, usePlayer } from 'dsviz/react';

const procs: sched.Process[] = [
  { id: 'P1', arrival: 0, burst: 6 },
  { id: 'P2', arrival: 1, burst: 3 },
  { id: 'P3', arrival: 2, burst: 1 },
  { id: 'P4', arrival: 4, burst: 4 },
  { id: 'P5', arrival: 6, burst: 2 },
];
const tones: Record<string, Tone> = { P1: 'accent', P2: 'active', P3: 'success', P4: 'visited', P5: 'danger' };
const policies = [{ value: 'fcfs', label: 'FCFS' }, { value: 'sjf', label: 'SJF' }, { value: 'srtf', label: 'SRTF' }, { value: 'rr', label: 'Round robin' }] as const;

export default function Scheduling() {
  const [policy, setPolicy] = useState<sched.Policy>('fcfs');
  const [quantum, setQuantum] = useState(2);
  const s = sched.simulate(procs, policy, quantum);
  // one frame per time unit: the "now" cursor sweeps across
  const player = usePlayer(function* () { for (let t = 0; t <= s.end; t++) yield t; }, [policy, quantum], { interval: 450, start: 'end' });
  const now = player.frame ?? 0;
  const tick = s.ticks[Math.min(now, s.end - 1)];
  const ready = now < s.end ? tick.queue : [];

  const chart = sched.gantt(s.segments, {
    lanes: procs.map((p) => p.id), unit: 21, end: s.end, now, tones,
    arrivals: Object.fromEntries(procs.map((p) => [p.id, p.arrival])),
  });
  const y = chart.bottom + 26;
  const queue = array(ready, { id: 'ready', keys: ready, x: 66, y, cell: 28, gap: 4, showIndices: false, tones: (i) => tones[ready[i]], enterOffset: { x: 40, y: 0 }, exitOffset: { x: -40, y: 0 } });
  const cpu = now < s.end && tick.running
    ? array([tick.running], { id: 'cpu', keys: [tick.running], x: 340, y, cell: 28, showIndices: false, tones: () => tones[tick.running!] })
    : null;

  const finished = s.stats.filter((st) => st.completion <= now);

  return (
    <>
      <Diagram
        scene={combine(
          chart, queue, cpu,
          text({ id: 'ready-l', x: 56, y: y + 14, text: 'ready', size: 12, role: 'caption', anchor: 'end' }),
          text({ id: 'cpu-l', x: 330, y: y + 14, text: 'CPU', size: 12, role: 'caption', anchor: 'end' }),
        )}
        height={270}
      />
      <Transport player={player} />
      <div className="row spread">
        <Segmented value={policy} onChange={setPolicy} options={policies} />
        {policy === 'rr' && <NumberStepper label="Quantum" value={quantum} onChange={setQuantum} min={1} max={5} />}
      </div>
      <div className="stats">
        {finished.map((st) => (
          <span key={st.id} className={`tone-${tones[st.id]}`}>{st.id} waited <b>{st.waiting}</b></span>
        ))}
        {now >= s.end && <span>average wait = <b>{s.avgWaiting.toFixed(2)}</b></span>}
      </div>
      <p className="hint">Which policy has the lowest average wait? Which one is fairest to P1?</p>
    </>
  );
}
