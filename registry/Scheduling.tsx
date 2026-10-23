// CPU scheduling. Same five processes, four policies: watch the bars rearrange,
// and the average waiting time change, as you switch.
import { useState } from 'react';
import { combine, text, Tone } from '@figurae/core';
import { array } from '@figurae/ds';
import { gantt, Policy, Process, simulate } from '@figurae/os';
import { Diagram, NumberStepper, Segmented, Transport, usePlayer } from '@figurae/react';

const procs: Process[] = [
  { id: 'P1', arrival: 0, burst: 6 },
  { id: 'P2', arrival: 1, burst: 3 },
  { id: 'P3', arrival: 2, burst: 1 },
  { id: 'P4', arrival: 4, burst: 4 },
  { id: 'P5', arrival: 6, burst: 2 },
];
const tones: Record<string, Tone> = { P1: 'accent', P2: 'active', P3: 'success', P4: 'visited', P5: 'danger' };
const policies = [{ value: 'fcfs', label: 'FCFS' }, { value: 'sjf', label: 'SJF' }, { value: 'srtf', label: 'SRTF' }, { value: 'rr', label: 'Round robin' }] as const;

export default function Scheduling() {
  const [policy, setPolicy] = useState<Policy>('fcfs');
  const [quantum, setQuantum] = useState(2);
  const s = simulate(procs, policy, quantum);
  // one frame per time unit: the "now" cursor sweeps across
  const player = usePlayer(function* () { for (let t = 0; t <= s.end; t++) yield t; }, [policy, quantum], { interval: 450, start: 'end' });
  const now = player.frame ?? 0;
  const tick = s.ticks[Math.min(now, s.end - 1)];
  const ready = now < s.end ? tick.queue : [];

  const chart = gantt(s.segments, {
    lanes: procs.map((p) => p.id), unit: 21, end: s.end, now, tones,
    arrivals: Object.fromEntries(procs.map((p) => [p.id, p.arrival])),
  });
  // under the chart: the ready queue (keyed by process, so it slides) and what's on the CPU
  const y = chart.bottom + 22;
  const queue = array(ready, { id: 'ready', keys: ready, x: 48, y, cell: 28, gap: 4, showIndices: false, tones: (i) => tones[ready[i]], enterOffset: { x: 40, y: 0 }, exitOffset: { x: -40, y: 0 } });
  const running = now < s.end ? tick.running : null;
  const cpu = running ? array([running], { id: 'cpu', keys: [running], x: 300, y, cell: 28, showIndices: false, tones: () => tones[running] }) : null;
  const labels = [
    text({ id: 'ready-l', x: -10, y: y + 14, text: 'ready', size: 12, role: 'caption', anchor: 'end' }),
    !ready.length && text({ id: 'ready-empty', x: 48, y: y + 14, text: 'empty', size: 12, role: 'caption', anchor: 'start' }),
    text({ id: 'cpu-l', x: 290, y: y + 14, text: 'CPU', size: 12, role: 'caption', anchor: 'end' }),
    !running && text({ id: 'cpu-idle', x: 300, y: y + 14, text: 'idle', size: 12, role: 'caption', anchor: 'start' }),
  ];

  const finished = s.stats.filter((st) => st.completion <= now);

  return (
    <>
      <Diagram scene={combine(chart, queue, cpu, labels)} />
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
