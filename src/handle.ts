/**
 * A draggable handle: the dot you see, plus a larger invisible circle that
 * actually receives the pointer. Small targets are the #1 reason drag
 * interactions feel bad (and on touch screens a 5px dot is nearly impossible).
 *
 * The hit circle comes FIRST so CSS can say "when the hit area is hovered,
 * grow the dot that follows it" (`.dv-role-hit:hover + .dv-role-handle`).
 * Drag events report the hit circle's id and `data`, so put what you need there.
 */
import { CircleNode, Tone, circle } from './scene';

export interface HandleOptions {
  id: string;
  x: number;
  y: number;
  /** Visible radius. Default 6. */
  r?: number;
  /** Hit radius. Default 16. */
  hit?: number;
  tone?: Tone;
  data?: unknown;
  /** Set false to show a dot that can't be dragged. */
  draggable?: boolean;
}

export function handle(o: HandleOptions): CircleNode[] {
  const draggable = o.draggable ?? true;
  const dot = circle({ id: `${o.id}:dot`, x: o.x, y: o.y, r: o.r ?? 6, role: 'handle', tone: o.tone });
  if (!draggable) return [dot];
  return [circle({ id: o.id, x: o.x, y: o.y, r: o.hit ?? 16, role: 'hit', draggable: true, data: o.data }), dot];
}
