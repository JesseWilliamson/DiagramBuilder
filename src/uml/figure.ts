/**
 * The UML stick figure (an "actor"): head, body, arms, legs. Shared by use case
 * diagrams; sequence.ts draws the same figure inline.
 *
 * (x, y) is the centre of the figure itself; the name goes below it, so the
 * whole thing spans about 46 px above the name. The parts have roles `figure`
 * (the head) and `figure-line` (the strokes); when `interactive` or
 * `draggable` is set, an invisible `hit` rect over the figure and its name
 * receives the pointer, so a thin line is never hard to grab.
 */
import { Frame, SceneNode, Tone, circle, estimateTextWidth, path, rect, text } from '../core';

export interface StickFigureOptions {
  id: string;
  x: number;
  y: number;
  /** The name under the figure. */
  name?: string;
  tone?: Tone;
  opacity?: number;
  interactive?: boolean;
  draggable?: boolean;
  data?: unknown;
}

/** Body box of a figure (without its name), centred on (x, y). */
export const FIGURE = { w: 34, h: 46 } as const;

/** Frame of the figure with its name, centred on the figure's own centre. */
export function figureFrame(x: number, y: number, name = ''): Frame {
  return { x, y, w: Math.max(FIGURE.w, Math.ceil(estimateTextWidth(name, 12))), h: FIGURE.h };
}

export function stickFigure(o: StickFigureOptions): SceneNode[] {
  const { x, y, id } = o, c = { tone: o.tone, opacity: o.opacity };
  const hit = o.interactive || o.draggable;
  const w = Math.max(44, estimateTextWidth(o.name ?? '', 12) + 12);
  const parts: (SceneNode | null)[] = [
    circle({ id: `${id}:head`, x, y: y - 16, r: 7, role: 'figure', ...c }),
    path({ id: `${id}:body`, points: [[x, y - 9], [x, y + 9]], role: 'figure-line', width: 2, ...c }),
    path({ id: `${id}:arms`, points: [[x - 12, y - 2], [x + 12, y - 2]], role: 'figure-line', width: 2, ...c }),
    path({ id: `${id}:legs`, points: [[x - 10, y + 23], [x, y + 9], [x + 10, y + 23]], role: 'figure-line', width: 2, ...c }),
    o.name ? text({ id: `${id}:label`, x, y: y + 38, text: o.name, size: 12, role: 'value', opacity: o.opacity }) : null,
    // the pointer target goes last so it sits on top of the thin lines
    hit ? rect({ id: `${id}:hit`, x, y: y + 7, w, h: o.name ? 68 : 52, role: 'hit', interactive: o.interactive, draggable: o.draggable, data: o.data }) : null,
  ];
  return parts.filter((n): n is SceneNode => n !== null);
}
