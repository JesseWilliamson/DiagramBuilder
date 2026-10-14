/**
 * Themes.
 *
 * A theme is three things, because "how it looks" lives in three places:
 *
 *  1. LOOK     – colours, fonts, stroke widths, shadows. Pure CSS, keyed off the
 *                class `dv-theme-<name>` on the <svg> (see styles.ts).
 *  2. GEOMETRY – things CSS can't reliably change on SVG: corner radius scale,
 *                line thickness (the arrowhead size depends on it), arrowhead shape.
 *                The renderer applies these in describe().
 *  3. FEEL     – easing + duration. A bouncy spring-ish ease reads as playful;
 *                a quick ease-in-out reads as precise.
 *
 * The layouts never see the theme. They emit semantic parts (a cell, a value,
 * a pointer tag) and the theme decides how each part looks — including whether
 * it's shown at all (the textbook theme hides pointer tags).
 */
import { Easing } from './easing';
export interface ThemeGeometry {
    /** Multiplies every rect's corner radius. */
    rxScale: number;
    /** Multiplies every arrow's line width (and so its head size). */
    strokeScale: number;
    head: 'chevron' | 'triangle';
    headScale: number;
}
export interface Theme {
    name: string;
    ease: Easing;
    duration: number;
    geometry: ThemeGeometry;
    /** Add the "physical tile" lip under shapes (an SVG filter). */
    lift?: boolean;
    /** Google Fonts stylesheet the theme expects. Load it in your app; dsviz doesn't. */
    fonts?: string;
}
export declare const themes: Record<'plain' | 'brilliant' | 'textbook', Theme>;
/** The theme createView() uses when you don't pass one. */
export declare function setDefaultTheme(t: Theme): void;
export declare function getDefaultTheme(): Theme;
