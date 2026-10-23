/**
 * Probability trees, drawn left to right. Each branch carries the probability
 * of taking it; a leaf's probability is the product along its path (that's
 * the multiplication rule, and seeing it laid out is the point of the diagram).
 */
import { Scene, SceneNode, Tone, V2, Vec, arrow, estimateTextWidth, rect, text } from '@figurae/core';

export interface ProbNode {
  /** Unique among siblings; the path of keys is the node's id. */
  key: string;
  label: string;
  /** Probability of the branch INTO this node (ignored on the root). */
  p?: number;
  children?: ProbNode[];
  tone?: Tone;
}

export interface ProbTreeOptions {
  id?: string;
  x?: number;
  y?: number;
  /** Horizontal distance between levels. Default 150. */
  levelGap?: number;
  /** Vertical distance between leaves. Default 44. */
  leafGap?: number;
  /** Show the product at each leaf. Default true. */
  showProducts?: boolean;
  format?: (p: number) => string;
  /** Tone per node path, e.g. `{ 'root/sick/pos': 'success' }`. */
  tones?: Record<string, Tone | undefined>;
}

export interface ProbTreeDiagram extends Scene {
  pos(path: string): Vec;
  /** Leaf paths with their products, in drawing order. */
  leaves: Array<{ path: string; p: number }>;
}

export function probTree(root: ProbNode, o: ProbTreeOptions = {}): ProbTreeDiagram {
  const id = o.id ?? 'ptree';
  const gx = o.levelGap ?? 150, gy = o.leafGap ?? 44;
  const fmt = o.format ?? ((p: number) => String(+p.toFixed(3)));
  const x0 = o.x ?? 0, y0 = o.y ?? 0;
  const positions = new Map<string, Vec>();
  const leaves: Array<{ path: string; p: number }> = [];
  const nodes: SceneNode[] = [];
  let leafIndex = 0;

  // 1. place: leaves get consecutive rows, parents sit at the mean of their children
  function place(n: ProbNode, path: string, depth: number, prob: number): number {
    let y: number;
    if (!n.children?.length) {
      y = y0 + leafIndex++ * gy;
      leaves.push({ path, p: prob });
    } else {
      const ys = n.children.map((c) => place(c, `${path}/${c.key}`, depth + 1, prob * (c.p ?? 1)));
      y = (ys[0] + ys[ys.length - 1]) / 2;
    }
    positions.set(path, V2(x0 + depth * gx, y));
    return y;
  }
  place(root, root.key, 0, 1);

  // 2. draw: edges first (underneath), then nodes
  const boxW = (s: string) => Math.max(34, estimateTextWidth(s, 12) + 16);
  function edges(n: ProbNode, path: string) {
    const a = positions.get(path)!;
    for (const c of n.children ?? []) {
      const cp = `${path}/${c.key}`;
      const b = positions.get(cp)!;
      const tone = o.tones?.[cp];
      const x1 = a.x + boxW(n.label) / 2 + 2, x2 = b.x - boxW(c.label) / 2 - 4;
      nodes.push(arrow({ id: `${id}:e:${cp}`, x1, y1: a.y, x2, y2: b.y, head: false, width: 1.5, tone }));
      const mx = (x1 + x2) / 2, my = (a.y + b.y) / 2;
      nodes.push(text({ id: `${id}:p:${cp}`, x: mx, y: my + (b.y < a.y ? -10 : b.y > a.y ? 10 : -10), text: fmt(c.p ?? 1), size: 11, role: 'edge-label', tone }));
      edges(c, cp);
    }
  }
  edges(root, root.key);
  function boxes(n: ProbNode, path: string, prob: number) {
    const p = positions.get(path)!;
    const tone = o.tones?.[path] ?? n.tone;
    nodes.push(rect({ id: `${id}:n:${path}`, x: p.x, y: p.y, w: boxW(n.label), h: 24, rx: 6, tone, data: { path } }));
    nodes.push(text({ id: `${id}:t:${path}`, x: p.x, y: p.y, text: n.label, size: 12, role: 'value', tone }));
    if (!n.children?.length && (o.showProducts ?? true)) {
      nodes.push(text({ id: `${id}:prod:${path}`, x: p.x + boxW(n.label) / 2 + 10, y: p.y, text: fmt(prob), size: 11, role: 'value', anchor: 'start', tone: tone ?? 'muted' }));
    }
    for (const c of n.children ?? []) boxes(c, `${path}/${c.key}`, prob * (c.p ?? 1));
  }
  boxes(root, root.key, 1);
  return { nodes, pos: (path) => positions.get(path) ?? V2(0, 0), leaves };
}
