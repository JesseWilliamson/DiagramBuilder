/**
 * 2D grids: DP tables, BFS on a maze, matrices, game boards.
 * Cells are identified by (row, col), with optional row/column headers
 * (e.g. the two strings of an LCS / edit-distance table).
 */
import { Scene, SceneNode, Tone, rect, text } from '../scene';
import { V2, Vec } from '../vec';
import { show } from './common';

export interface GridOptions<T = unknown> {
  id?: string;
  x?: number;
  y?: number;
  cell?: number;
  gap?: number;
  tones?: (r: number, c: number, v: T) => Tone | undefined;
  rowLabels?: readonly (string | number)[];
  colLabels?: readonly (string | number)[];
  format?: (v: T, r: number, c: number) => string;
  interactive?: boolean;
}

export interface GridDiagram extends Scene {
  center(r: number, c: number): Vec;
  top(r: number, c: number): Vec;
  bottom(r: number, c: number): Vec;
  left(r: number, c: number): Vec;
  right(r: number, c: number): Vec;
}

export function grid<T>(rows: readonly (readonly T[])[], o: GridOptions<T> = {}): GridDiagram {
  const id = o.id ?? 'grid';
  const cell = o.cell ?? 40, gap = o.gap ?? 4, step = cell + gap;
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const center = (r: number, c: number) => V2(x0 + c * step + cell / 2, y0 + r * step + cell / 2);
  const nodes: SceneNode[] = [];
  const texts: SceneNode[] = [];

  rows.forEach((row, r) =>
    row.forEach((v, c) => {
      const p = center(r, c);
      const tone = o.tones?.(r, c, v);
      nodes.push(rect({ id: `${id}:cell:${r},${c}`, x: p.x, y: p.y, w: cell, h: cell, rx: 6, tone, interactive: o.interactive, data: { r, c, value: v } }));
      const s = o.format ? o.format(v, r, c) : show(v);
      if (s) texts.push(text({ id: `${id}:val:${r},${c}`, x: p.x, y: p.y, text: s, size: Math.round(cell * 0.38), weight: 600, role: 'value', tone }));
    }),
  );
  o.colLabels?.forEach((l, c) => {
    const p = center(0, c);
    texts.push(text({ id: `${id}:col:${c}`, x: p.x, y: p.y - cell / 2 - 14, text: show(l), size: 13, role: 'caption' }));
  });
  o.rowLabels?.forEach((l, r) => {
    const p = center(r, 0);
    texts.push(text({ id: `${id}:row:${r}`, x: p.x - cell / 2 - 12, y: p.y, text: show(l), size: 13, role: 'caption', anchor: 'end' }));
  });

  const h = cell / 2;
  return {
    nodes: [...nodes, ...texts],
    center,
    top: (r, c) => V2(center(r, c).x, center(r, c).y - h),
    bottom: (r, c) => V2(center(r, c).x, center(r, c).y + h),
    left: (r, c) => V2(center(r, c).x - h, center(r, c).y),
    right: (r, c) => V2(center(r, c).x + h, center(r, c).y),
  };
}
