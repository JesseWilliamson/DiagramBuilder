/**
 * Where the camera (the viewBox) should be.
 *
 * Rule of thumb for teaching diagrams: the camera should almost never move.
 * Whatever moves on screen is what the learner reads as "the change", so a
 * camera that refits on every step makes everything appear to move at once.
 *
 *   - fixed      You pass a viewBox. Use this for plots and anything draggable.
 *   - fitViewBox The union of every frame you'll ever show (e.g. all of an
 *                algorithm's steps), computed up front, then fixed.
 *   - 'grow'     The default for `viewBox: 'auto'`: grow only when something
 *                would fall outside, and shrink only when the content is much
 *                smaller than the frame, never on small wobbles.
 *   - 'fit'      Refit to the scene on every render (the old behaviour).
 */
import { Part, bounds, combine } from './scene';

export type ViewBox = [number, number, number, number];

/** A viewBox around everything in all the given parts (e.g. one scene per frame). */
export function fitViewBox(parts: Part | readonly Part[], pad: number | [number, number, number, number] = 24): ViewBox {
  const b = bounds(combine(parts as Part));
  const [t, r, bt, l] = typeof pad === 'number' ? [pad, pad, pad, pad] : pad;
  return snap([b.x - l, b.y - t, b.w + l + r, b.h + t + bt]);
}

/** Round outward to whole units, so tiny bounds changes can't make the camera twitch. */
const snap = ([x, y, w, h]: number[]): ViewBox => {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  return [x0, y0, Math.max(1, Math.ceil(x + w) - x0), Math.max(1, Math.ceil(y + h) - y0)];
};

const contains = (a: ViewBox, b: ViewBox) => b[0] >= a[0] && b[1] >= a[1] && b[0] + b[2] <= a[0] + a[2] && b[1] + b[3] <= a[1] + a[3];
const union = (a: ViewBox, b: ViewBox): ViewBox => {
  const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]);
  return [x0, y0, Math.max(a[0] + a[2], b[0] + b[2]) - x0, Math.max(a[1] + a[3], b[1] + b[3]) - y0];
};

/**
 * The next camera, given the current one and the padded box around the new content.
 * 'grow': stay put while the content fits; grow to include it when it doesn't;
 * shrink back to it only when it fills less than half the frame.
 */
export function nextCamera(current: ViewBox | null, content: ViewBox, mode: 'grow' | 'fit' = 'grow'): ViewBox {
  const c = snap(content);
  if (!current || mode === 'fit') return c;
  if (!contains(current, c)) return union(current, c);
  const fill = (c[2] * c[3]) / (current[2] * current[3]);
  return fill < 0.5 ? c : current;
}
