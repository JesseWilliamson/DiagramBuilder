/**
 * A labelled pointer arrow (lo / hi / mid / curr / prev …).
 *
 * Give each pointer a stable `id` (e.g. 'mid') and just change `at` between
 * renders — the arrow and its label slide to the new target.
 */
import { Scene, SceneNode, Tone, arrow, estimateTextWidth, rect, text } from '../scene';
import { Vec } from '../vec';

export interface PointerOptions {
  id: string;
  /** The point the arrow tip touches, e.g. `arr.top(i)`. */
  at: Vec;
  label?: string;
  /** Which side the pointer comes from. Default 'top'. */
  side?: 'top' | 'bottom' | 'left' | 'right';
  length?: number;
  /** Gap between the tip and the target. Default 4. */
  gap?: number;
  /** Stack several pointers at the same spot: level 1 sits one label further out. */
  level?: number;
  tone?: Tone;
}

export function pointer(o: PointerOptions): Scene {
  const len = o.length ?? 26;
  const gap = o.gap ?? 4;
  const side = o.side ?? 'top';
  const out = (o.level ?? 0) * 18; // labels stack outward, arrows stay put
  const dir = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side];
  const tip = { x: o.at.x + dir[0] * gap, y: o.at.y + dir[1] * gap };
  const tail = { x: tip.x + dir[0] * len, y: tip.y + dir[1] * len };
  const tone = o.tone ?? 'accent';
  const lab = { x: tail.x + dir[0] * (13 + out), y: tail.y + dir[1] * (13 + out) };
  const nodes: SceneNode[] = [arrow({ id: `${o.id}:arrow`, x1: tail.x, y1: tail.y, x2: tip.x, y2: tip.y, tone, width: 2 })];
  if (o.label) {
    // A pill behind the label. Hidden by default; apps can show it with `.dv-role-tag { display: inline }`.
    const w = estimateTextWidth(o.label, 13) + 16;
    const tx = side === 'left' ? lab.x - w / 2 : side === 'right' ? lab.x + w / 2 : lab.x;
    nodes.push(rect({ id: `${o.id}:tag`, x: tx, y: lab.y, w, h: 21, rx: 10.5, role: 'tag', tone }));
    nodes.push(
      text({
        id: `${o.id}:label`,
        x: lab.x,
        y: lab.y,
        text: o.label,
        size: 13,
        role: 'pointer-label',
        tone,
        anchor: side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle',
      }),
    );
  }
  return { nodes };
}
