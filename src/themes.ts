/**
 * The look of dsviz, split by *where* it can be expressed:
 *
 *  1. COLOUR / TYPE – CSS variables (see styles.ts). Apps override these.
 *  2. GEOMETRY      – things CSS can't change on SVG: corner radius scale, line
 *                     thickness (arrowhead size depends on it), arrowhead shape.
 *                     The renderer applies these in describe().
 *  3. FEEL          – easing + duration. Gentle: a quick ease-in-out, no bounce.
 *
 * There used to be three themes (plain / brilliant / textbook). One survived,
 * so a "theme" is now just a fixed set of constants. Tokens stay overridable.
 */
import { easeInOutCubic } from './easing';

export interface Geometry {
  /** Multiplies every rect's corner radius. */
  rxScale: number;
  /** Multiplies every arrow's line width (and so its head size). */
  strokeScale: number;
  head: 'chevron' | 'triangle';
  headScale: number;
}

export const geometry: Geometry = { rxScale: 0.5, strokeScale: 0.7, head: 'triangle', headScale: 1.05 };

export const feel = { ease: easeInOutCubic, duration: 380 };
