/**
 * Little celebrations, made from ordinary scene nodes.
 *
 * A burst is a ring of particles. Each particle is a circle whose `enter`
 * says "start at the centre, radius 0", so the renderer flies it outward the
 * moment it appears. Remove the particles from the scene a beat later and
 * they fade out on their own (that's the normal exit tween). No special
 * animation code: the keyed renderer already does everything we need.
 */
import { CircleNode, Tone, circle } from './scene';

export interface BurstOptions {
  /** Change this for every new burst (e.g. a counter) so the particles are new nodes. */
  id: string;
  x: number;
  y: number;
  count?: number;
  /** How far the particles fly. Default 46. */
  radius?: number;
  tones?: Tone[];
}

const DEFAULT_TONES: Tone[] = ['active', 'accent', 'success', 'visited', 'danger'];

export function burst(o: BurstOptions): CircleNode[] {
  const n = o.count ?? 14;
  const R = o.radius ?? 46;
  const tones = o.tones ?? DEFAULT_TONES;
  // deterministic jitter from the id, so the same burst always looks the same
  let seed = [...o.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n + (rand() - 0.5) * 0.5;
    const d = R * (0.65 + rand() * 0.5);
    return circle({
      id: `${o.id}:p${i}`,
      x: o.x + Math.cos(a) * d,
      y: o.y + Math.sin(a) * d,
      r: 2 + rand() * 2.5,
      role: 'particle',
      tone: tones[i % tones.length],
      enter: { x: o.x, y: o.y, r: 0, opacity: 1 },
      exit: { r: 0 },
    });
  });
}
