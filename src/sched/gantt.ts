/**
 * Gantt chart: time runs left to right, one lane per process (or one shared
 * "CPU" lane). Bars are keyed by `id:segment-index`, so when you switch policy
 * the bars for P2 slide and stretch into their new places instead of being
 * redrawn from scratch.
 */
import { Scene, SceneNode, Tone, path, rect, text } from '../scene';
import { Segment } from './simulate';

export interface GanttOptions {
  id?: string;
  x?: number;
  y?: number;
  /** Pixels per time unit. Default 24. */
  unit?: number;
  /** Lane labels top to bottom. Omit for a single "CPU" lane. */
  lanes?: readonly string[];
  laneHeight?: number;
  /** Last time on the axis. Default: the last segment's end. */
  end?: number;
  /** Draw only what has happened by this time, plus a "now" cursor. */
  now?: number;
  /** Tone per process id. */
  tones?: Record<string, Tone | undefined>;
  /** Tick spacing on the time axis. Default 1. */
  tickEvery?: number;
  /** Mark arrivals (lane mode): a small triangle on each lane at its arrival time. */
  arrivals?: Record<string, number>;
}

export interface GanttDiagram extends Scene {
  xAt(t: number): number;
  laneY(lane: string): number;
  /** Bottom of the chart (below the axis labels). */
  bottom: number;
}

export function gantt(segments: readonly Segment[], o: GanttOptions = {}): GanttDiagram {
  const id = o.id ?? 'gantt';
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const unit = o.unit ?? 24;
  const lh = o.laneHeight ?? 26;
  const lanes = o.lanes ?? ['CPU'];
  const single = !o.lanes;
  const end = o.end ?? Math.max(1, ...segments.map((s) => s.end));
  const now = o.now ?? end;
  const xAt = (t: number) => x0 + t * unit;
  const laneY = (lane: string) => y0 + (single ? 0 : lanes.indexOf(lane)) * (lh + 6) + lh / 2;
  const nodes: SceneNode[] = [];
  const h = lanes.length * (lh + 6) - 6;

  // lane tracks + labels
  lanes.forEach((l) => {
    nodes.push(rect({ id: `${id}:track:${l}`, x: xAt(end / 2), y: laneY(l), w: end * unit, h: lh, rx: 4, role: 'track' }));
    nodes.push(text({ id: `${id}:lane:${l}`, x: x0 - 10, y: laneY(l), text: l, size: 12, role: 'value', anchor: 'end' }));
  });
  // bars: count segments per process so each gets a stable key
  const seen = new Map<string, number>();
  for (const s of segments) {
    const k = seen.get(s.id) ?? 0;
    seen.set(s.id, k + 1);
    if (s.start >= now) continue;
    const e = Math.min(s.end, now);
    const lane = single ? lanes[0] : s.id;
    const w = (e - s.start) * unit;
    nodes.push(
      rect({
        id: `${id}:bar:${s.id}:${k}`, x: xAt(s.start) + w / 2, y: laneY(lane), w: Math.max(0, w - 2), h: lh - 4, rx: 4,
        tone: o.tones?.[s.id] ?? 'accent', enter: { w: 0, x: xAt(s.start) }, data: s,
      }),
    );
    if (single && w > 18) nodes.push(text({ id: `${id}:bar:${s.id}:${k}:t`, x: xAt(s.start) + w / 2, y: laneY(lane), text: s.id, size: 11, role: 'value', tone: o.tones?.[s.id] ?? 'accent' }));
  }
  if (o.arrivals && !single) {
    for (const [pid, t] of Object.entries(o.arrivals)) {
      const x = xAt(t), y = laneY(pid) - lh / 2 - 2;
      nodes.push(path({ id: `${id}:arr:${pid}`, points: [[x - 4, y - 6], [x + 4, y - 6], [x, y]], closed: true, role: 'marker', tone: o.tones?.[pid] }));
    }
  }
  // time axis
  const axisY = y0 + h + 10;
  const every = o.tickEvery ?? 1;
  for (let t = 0; t <= end; t += every) {
    nodes.push(text({ id: `${id}:t:${t}`, x: xAt(t), y: axisY + 6, text: String(t), size: 10, role: 'index' }));
  }
  nodes.push(path({ id: `${id}:axis`, points: [[xAt(0), axisY - 4], [xAt(end), axisY - 4]], role: 'axis', width: 1 }));
  if (o.now !== undefined) {
    nodes.push(path({ id: `${id}:now`, points: [[xAt(now), y0 - 8], [xAt(now), axisY - 2]], role: 'curve', tone: 'active', width: 1.5 }));
    nodes.push(text({ id: `${id}:now:label`, x: xAt(now), y: y0 - 16, text: `t = ${now}`, size: 11, role: 'value', tone: 'active' }));
  }
  return { nodes, xAt, laneY, bottom: axisY + 14 };
}
