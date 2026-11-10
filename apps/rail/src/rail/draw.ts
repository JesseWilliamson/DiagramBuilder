// A tiny dsviz "family" for railways: pure functions from plain data to scene
// parts. Like dsviz's own families they never pick a colour; they set a `role`
// (what the part is) and a `tone` (what state it is in), and styles.css decides
// the look. Every id is derived from the caller's id, so a train keeps its id
// as it moves and dsviz glides it instead of redrawing it.
import { circle, combine, path, rect, text, type Scene, type Tone } from 'dsviz';

export type Aspect = 'stop' | 'caution' | 'clear' | 'dark';
export const aspectTone: Record<Aspect, Tone | undefined> = { stop: 'danger', caution: 'active', clear: 'success', dark: undefined };
export const aspectName: Record<Aspect, string> = { stop: 'Stop', caution: 'Caution', clear: 'Clear', dark: 'Dark' };

/** A run of track. `tone` paints it: danger for occupied, accent for a set route. */
export function track(id: string, points: [number, number][], tone?: Tone, dashed = false): Scene {
  return combine(path({ id, points, role: 'rail', tone, dashed }));
}

/**
 * A colour-light signal beside the track: a post from the rail, an arm, and one
 * lamp showing the aspect. `side` puts it above (-1) or below (+1) the line;
 * `facing` is the direction of travel it governs (+1 = left to right).
 */
export function signal(o: { id: string; x: number; y: number; aspect: Aspect; label?: string; side?: 1 | -1; facing?: 1 | -1; interactive?: boolean; data?: unknown }): Scene {
  const side = o.side ?? -1;
  const facing = o.facing ?? 1;
  const top = o.y + side * 26;
  const lampX = o.x - facing * 9; // the lamp faces oncoming trains, so it sits on the approach side of the post
  return combine(
    path({ id: `${o.id}:post`, points: [[o.x, o.y + side * 6], [o.x, top], [lampX, top]], role: 'post' }),
    circle({ id: `${o.id}:lamp`, x: lampX, y: top, r: 6.5, role: 'lamp', tone: aspectTone[o.aspect], interactive: o.interactive, data: o.data }),
    !!o.label && text({ id: `${o.id}:label`, x: o.x + facing * 4, y: top + side * 14, text: o.label, size: 11, anchor: 'middle', role: 'code', tone: 'muted' }),
  );
}

/** A train as a rounded block between `x1` and `x2` (either order) on the line at `y`. */
export function train(o: { id: string; x1: number; x2: number; y: number; label?: string; tone?: Tone; h?: number }): Scene {
  const h = o.h ?? 16;
  const lo = Math.min(o.x1, o.x2), hi = Math.max(o.x1, o.x2);
  return combine(
    rect({ id: `${o.id}:body`, x: (lo + hi) / 2, y: o.y, w: Math.max(hi - lo, 8), h, rx: 4, role: 'train', tone: o.tone ?? 'accent' }),
    !!o.label && text({ id: `${o.id}:label`, x: (lo + hi) / 2, y: o.y + 0.5, text: o.label, size: 10.5, anchor: 'middle', role: 'code' }),
  );
}

/** A location name and a small tick under the line. */
export function place(id: string, x: number, y: number, name: string, sub?: string): Scene {
  return combine(
    text({ id: `${id}:name`, x, y, text: name, size: 12, anchor: 'middle', weight: 600 }),
    !!sub && text({ id: `${id}:sub`, x, y: y + 14, text: sub, size: 10.5, anchor: 'middle', role: 'code', tone: 'muted' }),
  );
}

/** A coloured band under the track, e.g. the limits of an authority. */
export function band(id: string, x1: number, x2: number, y: number, h: number, tone: Tone, label?: string): Scene {
  const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
  return combine(
    rect({ id: `${id}:band`, x: (lo + hi) / 2, y, w: hi - lo, h, rx: 4, role: 'band', tone }),
    !!label && text({ id: `${id}:label`, x: (lo + hi) / 2, y: y + 0.5, text: label, size: 10.5, anchor: 'middle', role: 'code' }),
  );
}
