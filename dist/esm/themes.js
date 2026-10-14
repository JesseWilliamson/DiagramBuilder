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
import { easeInOutCubic, easeOutBack } from './easing';
export const themes = {
    plain: {
        name: 'plain',
        ease: easeInOutCubic,
        duration: 450,
        geometry: { rxScale: 1, strokeScale: 1, head: 'chevron', headScale: 1 },
    },
    /** Chunky, tactile, playful: soft fills, a darker lip under each tile, bouncy motion. */
    brilliant: {
        name: 'brilliant',
        ease: easeOutBack,
        duration: 560,
        lift: true,
        geometry: { rxScale: 1.6, strokeScale: 1.4, head: 'triangle', headScale: 0.85 },
        fonts: 'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap',
    },
    /** Textbook figure, Diagramatics-style: hairline black strokes, light named fills, serif italic labels. */
    textbook: {
        name: 'textbook',
        ease: easeInOutCubic,
        duration: 380,
        geometry: { rxScale: 0.12, strokeScale: 0.7, head: 'triangle', headScale: 1.05 },
        fonts: 'https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,600;1,400&display=swap',
    },
};
let defaultTheme = themes.plain;
/** The theme createView() uses when you don't pass one. */
export function setDefaultTheme(t) {
    defaultTheme = t;
}
export function getDefaultTheme() {
    return defaultTheme;
}
