/**
 * Two-set Venn diagrams with regions you can highlight and click.
 *
 * Two circles are easy to draw. The hard part is the REGIONS: "A only", "B
 * only" and the lens "A and B" are not circles, they're shapes bounded by
 * arcs of both circles. We find where the circles cross, then walk around each
 * region's boundary arc by arc:
 *
 *   lens   = A's arc inside B,  then B's arc inside A
 *   A only = A's arc outside B, then B's arc inside A (walked backwards)
 *   B only = B's arc outside A, then A's arc inside B (walked backwards)
 *
 * Each region is a closed `path` with a fixed number of points, so when you
 * drag a circle the regions morph smoothly.
 */
import { circleIntersections } from '../geom/math';
import { handle } from '../handle';
import { Scene, SceneNode, Tone, circle, path, text } from '../scene';
import { Vec, vdist } from '../vec';

export interface Disc {
  x: number;
  y: number;
  r: number;
}

export type VennRegion = 'aOnly' | 'bOnly' | 'both' | 'neither';

type Pt = [number, number];
const N = 64; // points per region boundary

function arc(c: Disc, a0: number, a1: number, n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = a0 + ((a1 - a0) * i) / (n - 1);
    return [c.x + c.r * Math.cos(t), c.y + c.r * Math.sin(t)] as Pt;
  });
}

/** Boundary points of each region (empty array for an empty region). */
export function vennRegions(a: Disc, b: Disc): Record<'aOnly' | 'bOnly' | 'both', Pt[]> {
  const d = vdist(a, b);
  const full = (c: Disc) => arc(c, 0, 2 * Math.PI * (1 - 1 / N), N);
  if (d >= a.r + b.r) return { aOnly: full(a), bOnly: full(b), both: [] }; // apart
  if (d <= Math.abs(a.r - b.r)) {
    // one inside the other: the inner disc is the lens; the outer's "only" part is a ring,
    // which a single closed path can't express, so we draw the outer disc (the inner one sits on top)
    const [inner, outer] = a.r <= b.r ? [a, b] : [b, a];
    const ring = full(outer);
    return a === outer ? { aOnly: ring, bOnly: [], both: full(inner) } : { aOnly: [], bOnly: ring, both: full(inner) };
  }
  const phi = Math.atan2(b.y - a.y, b.x - a.x); // direction A → B
  const alpha = Math.acos((a.r * a.r + d * d - b.r * b.r) / (2 * a.r * d)); // half-angle of A's arc inside B
  const psi = phi + Math.PI; // direction B → A
  const beta = Math.acos((b.r * b.r + d * d - a.r * a.r) / (2 * b.r * d));
  const h = N / 2;
  const aIn = arc(a, phi - alpha, phi + alpha, h);
  const bIn = arc(b, psi - beta, psi + beta, h);
  const aOut = arc(a, phi + alpha, phi - alpha + 2 * Math.PI, h);
  const bOut = arc(b, psi + beta, psi - beta + 2 * Math.PI, h);
  return {
    both: [...aIn, ...bIn],
    aOnly: [...aOut, ...[...bIn].reverse()],
    bOnly: [...bOut, ...[...aIn].reverse()],
  };
}

/** Areas of each region (same units as r²). */
export function vennAreas(a: Disc, b: Disc): { a: number; b: number; both: number; aOnly: number; bOnly: number } {
  const d = vdist(a, b);
  const A = Math.PI * a.r * a.r, B = Math.PI * b.r * b.r;
  let both: number;
  if (d >= a.r + b.r) both = 0;
  else if (d <= Math.abs(a.r - b.r)) both = Math.PI * Math.min(a.r, b.r) ** 2;
  else {
    const r1 = a.r, r2 = b.r;
    both =
      r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)) +
      r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2)) -
      0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  }
  return { a: A, b: B, both, aOnly: A - both, bOnly: B - both };
}

/** Which region a point falls in. */
export function vennRegionAt(p: Vec, a: Disc, b: Disc): VennRegion {
  const inA = vdist(p, a) <= a.r, inB = vdist(p, b) <= b.r;
  return inA && inB ? 'both' : inA ? 'aOnly' : inB ? 'bOnly' : 'neither';
}

export interface VennOptions {
  id?: string;
  labels?: [string, string];
  /** Regions to shade. */
  highlight?: readonly VennRegion[];
  tone?: Tone;
  /** The universe rectangle around both circles (for "neither"), as [x, y, w, h]. */
  universe?: [number, number, number, number];
  /** Region paths emit clicks with `{ region }` in data. */
  interactive?: boolean;
  /** Give each circle a drag handle at its centre; drag data is `{ set: 'a' | 'b' }`. */
  draggable?: boolean;
  /** Pulse the drag handles until the reader first touches one. */
  hint?: boolean;
}

export function venn2(a: Disc, b: Disc, o: VennOptions = {}): Scene {
  const id = o.id ?? 'venn';
  const hl = new Set(o.highlight ?? []);
  const regions = vennRegions(a, b);
  const tone = o.tone ?? 'accent';
  const nodes: SceneNode[] = [];
  if (o.universe) {
    const [ux, uy, uw, uh] = o.universe;
    nodes.push({ kind: 'rect', id: `${id}:U`, x: ux + uw / 2, y: uy + uh / 2, w: uw, h: uh, rx: 8, role: 'universe', tone: hl.has('neither') ? tone : undefined, interactive: o.interactive, data: { region: 'neither' } });
    nodes.push(text({ id: `${id}:U:label`, x: ux + 12, y: uy + 14, text: 'U', size: 13, role: 'math', anchor: 'start' }));
  }
  // regions keep their ids even when empty, so they can fade back in
  for (const r of ['aOnly', 'bOnly', 'both'] as const) {
    const pts = regions[r];
    if (!pts.length) continue;
    nodes.push(path({ id: `${id}:${r}`, points: pts, closed: true, role: 'region', tone: hl.has(r) ? tone : 'muted', interactive: o.interactive, data: { region: r } }));
  }
  nodes.push(
    circle({ id: `${id}:A`, x: a.x, y: a.y, r: a.r, role: 'outline' }),
    circle({ id: `${id}:B`, x: b.x, y: b.y, r: b.r, role: 'outline' }),
  );
  const [la, lb] = o.labels ?? ['A', 'B'];
  // labels sit outside each circle, away from the other one
  const dir = Math.atan2(b.y - a.y, b.x - a.x);
  const lab = (c: Disc, away: number, s: string, k: string) =>
    text({ id: `${id}:${k}:label`, x: c.x + Math.cos(away) * c.r * 0.72 - Math.sin(away) * 0, y: c.y - c.r * 0.82, text: s, size: 16, role: 'math' });
  nodes.push(lab(a, dir + Math.PI, la, 'A'), lab(b, dir, lb, 'B'));
  if (o.draggable) {
    // A small VISIBLE handle at each centre. (An invisible drag zone over the
    // regions would make the same spot mean "drag" or "click" depending on
    // where exactly you pressed, with nothing on screen to say which.)
    nodes.push(
      ...handle({ id: `${id}:A:drag`, x: a.x, y: a.y, hint: o.hint, data: { set: 'a' } }),
      ...handle({ id: `${id}:B:drag`, x: b.x, y: b.y, hint: o.hint, data: { set: 'b' } }),
    );
  }
  return { nodes };
}

