/**
 * Snapping for draggable boxes, the way a design tool does it. Pure functions: the moving box's
 * frame in, a corrected centre and the guides to draw out.
 *
 * The idea: on each axis the moving box offers three "lines" (its centre and its two edges) and
 * every other box offers the same three. Every (mine, theirs) pair is a candidate; the closest
 * pair within `threshold` wins and the box shifts so the two lines coincide. The axes are
 * independent (x can snap to one box while y snaps to another, or to nothing). With no
 * alignment on an axis we fall back to the grid, which draws no guide.
 *
 * A guide spans BOTH boxes (plus a margin), not the whole canvas: the line says "this box lines
 * up with that one", so it should visibly start at one and end at the other.
 */
import { Frame } from './connector';
import { PathNode, path } from './scene';

export interface SnapGuide {
  /** 'x' is a vertical line at x = at, spanning y from..to; 'y' is horizontal at y = at, spanning x. */
  axis: 'x' | 'y';
  at: number;
  from: number;
  to: number;
  kind: 'center' | 'edge' | 'grid';
}

export interface SnapOptions {
  /** Grid pitch for the fallback snap; 0 (default) is off. */
  grid?: number;
  /** How close (in scene units) a line must be to fire. Default 6. */
  threshold?: number;
  /** How far a guide extends past the two boxes. Default 12. */
  margin?: number;
}

type Hit = { delta: number; at: number; other: Frame; kind: 'center' | 'edge' };

function best(c: number, half: number, others: readonly Frame[], pos: 'x' | 'y', threshold: number): Hit | null {
  let hit: Hit | null = null;
  const size = pos === 'x' ? 'w' : 'h';
  for (const other of others) {
    const oc = other[pos], oh = other[size] / 2;
    for (const [m, mk] of [[c, 'center'], [c - half, 'edge'], [c + half, 'edge']] as const) {
      for (const [t, tk] of [[oc, 'center'], [oc - oh, 'edge'], [oc + oh, 'edge']] as const) {
        const delta = t - m;
        if (Math.abs(delta) <= threshold && (!hit || Math.abs(delta) < Math.abs(hit.delta))) {
          hit = { delta, at: t, other, kind: mk === 'center' && tk === 'center' ? 'center' : 'edge' };
        }
      }
    }
  }
  return hit;
}

export function snapFrame(moving: Frame, others: readonly Frame[], o: SnapOptions = {}): { x: number; y: number; guides: SnapGuide[] } {
  const { grid = 0, threshold = 6, margin = 12 } = o;
  const out = { x: moving.x, y: moving.y };
  const hits: { axis: 'x' | 'y'; hit: Hit }[] = [];
  for (const [axis, size] of [['x', 'w'], ['y', 'h']] as const) {
    const hit = best(moving[axis], moving[size] / 2, others, axis, threshold);
    if (hit) { out[axis] += hit.delta; hits.push({ axis, hit }); }
    else if (grid > 0) out[axis] = Math.round(moving[axis] / grid) * grid;
  }
  // guides are measured after both axes have moved, so they span the boxes where they end up
  const me: Frame = { ...moving, ...out };
  const guides = hits.map(({ axis, hit }): SnapGuide => {
    const [cross, size] = axis === 'x' ? (['y', 'h'] as const) : (['x', 'w'] as const);
    const lo = Math.min(me[cross] - me[size] / 2, hit.other[cross] - hit.other[size] / 2) - margin;
    const hi = Math.max(me[cross] + me[size] / 2, hit.other[cross] + hit.other[size] / 2) + margin;
    return { axis, at: hit.at, from: lo, to: hi, kind: hit.kind };
  });
  return { ...out, guides };
}

/** Scene parts for the guides: combine(diagram, snapGuides(guides)). */
export function snapGuides(guides: readonly SnapGuide[], id = 'snap'): PathNode[] {
  return guides.map((g, i) => {
    const points: [number, number][] = g.axis === 'x' ? [[g.at, g.from], [g.at, g.to]] : [[g.from, g.at], [g.to, g.at]];
    // two guides on one axis and kind (e.g. left and right edges) need distinct ids
    const dup = guides.slice(0, i).filter((h) => h.axis === g.axis && h.kind === g.kind).length;
    return path({ id: `${id}.snap.${g.axis}.${g.kind}${dup ? `.${dup}` : ''}`, points, role: 'snap-guide' });
  });
}
