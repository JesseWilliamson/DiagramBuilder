/**
 * UML deployment diagrams: where software runs. Hardware and runtime
 * environments are NODES, drawn as boxes with a top and a right face (the
 * only 3D in the library, and flat-shaded: two darker parallelograms). The
 * files that run on a node are ARTIFACTS: a small rectangle with a
 * folded-corner page icon, drawn inside the node that hosts them.
 *
 *   thing        drawn as                          read as
 *   node         box + top/right face, «stereotype» a machine or runtime («device»,
 *                over a bold name                   «executionEnvironment»)
 *   artifact     rect + folded-page icon            a file deployed on its node
 *   nested node  a node inside a node's body        a runtime hosted by a machine
 *   communication  solid line, «protocol» label     the nodes can talk over it
 *   deploy       dashed open arrow, «deploy»        an artifact goes onto a node
 *
 * A node is sized from the inside out (the way arch's zones are): its name, then
 * its artifacts in a small grid, then its child nodes in a row, so it always
 * fits what it holds. Top-level nodes are yours to place (x, y = centre of the
 * FRONT face) or, left out, placed left to right by the layered layout
 * (layout/layered.ts) along the links. Nested nodes follow their parent.
 *
 * Layouts never know about styling: the front is role `card`, the faces are
 * `node-face-top` / `node-face-side`, the icon is `artifact-icon`; the
 * stylesheet decides the shades.
 */
import { ConnectorEnd, Frame, Scene, SceneNode, Tone, connector, estimateTextWidth, path, rect, text } from '@figurae/core';
import { layered } from '@figurae/layout';

export interface DeployNode {
  id: string;
  name: string;
  /** Shown above the name in guillemets: 'device' → «device». */
  stereotype?: string;
  /** Id of the node this one runs inside. Nested nodes are placed by their parent. */
  parent?: string;
  /** Centre of the front face; top-level nodes only. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
  tone?: Tone;
}

export interface Artifact {
  id: string;
  name: string;
  /** Id of the node that hosts it. */
  node: string;
  tone?: Tone;
}

export interface DeployLink {
  /** Node or artifact ids. */
  from: string;
  to: string;
  /** 'communication' (default): a plain line. 'deploy': a dashed open arrow, from artifact to node. */
  kind?: 'communication' | 'deploy';
  /** Shown as «HTTPS». */
  protocol?: string;
  label?: string;
  tone?: Tone;
}

export interface DeploymentOptions {
  id?: string;
  /** Nodes and artifacts emit clicks with `{ node: id }` / `{ artifact: id }`. */
  interactive?: boolean;
  /** Top-level nodes can be dragged; drag data is `{ node: id }`. Their contents go along. */
  draggable?: boolean;
  /** 'elbow' (default) or 'straight'. */
  route?: 'elbow' | 'straight';
  /** For nodes without x/y: space between layers and between neighbours. Defaults 96 and 40. */
  rankGap?: number;
  nodeGap?: number;
}

export interface Deployment extends Scene {
  /** The front face of a node, or the rectangle of an artifact (centre + size). */
  box(id: string): Frame;
}

/** Depth of the top and right faces. */
export const NODE_DEPTH = 10;
const NAME = 14, STEREO = 11, PAD = 14, ART_H = 38, GAP = 14;

const artifactWidth = (a: Artifact) => Math.max(92, Math.ceil(estimateTextWidth(a.name, 12) + 2 * 10 + 16));
const nameWidth = (n: DeployNode) =>
  Math.max(estimateTextWidth(n.name, NAME) * 0.95, n.stereotype ? estimateTextWidth(`«${n.stereotype}»`, STEREO) : 0);
const headHeight = (n: DeployNode) => (n.stereotype ? STEREO + 4 : 0) + NAME + 18;

interface Measured {
  node: DeployNode;
  w: number;
  h: number;
  arts: Artifact[];
  cols: number;
  cell: number;
  kids: Measured[];
  gridH: number;
  gridW: number;
  kidsW: number;
  kidsH: number;
}

/** Size a node from what it holds. Pure and recursive (children first). */
function measure(n: DeployNode, all: readonly DeployNode[], artifacts: readonly Artifact[]): Measured {
  const arts = artifacts.filter((a) => a.node === n.id);
  const kids = all.filter((k) => k.parent === n.id).map((k) => measure(k, all, artifacts));
  const cell = arts.reduce((m, a) => Math.max(m, artifactWidth(a)), 0);
  const cols = arts.length <= 3 ? arts.length : Math.ceil(Math.sqrt(arts.length));
  const rows = cols ? Math.ceil(arts.length / cols) : 0;
  const gridW = cols ? cols * cell + (cols - 1) * GAP : 0;
  const gridH = rows ? rows * ART_H + (rows - 1) * GAP : 0;
  const kidsW = kids.length ? kids.reduce((s, k) => s + k.w, 0) + (kids.length - 1) * GAP * 1.5 : 0;
  const kidsH = kids.reduce((m, k) => Math.max(m, k.h), 0);
  const inner = Math.max(gridW, kidsW);
  const innerH = gridH + kidsH + (gridH && kidsH ? GAP : 0);
  const w = Math.max(120, Math.ceil(Math.max(nameWidth(n) + 2 * PAD, inner + 2 * PAD)));
  const h = headHeight(n) + (innerH ? innerH + PAD : 22);
  return { node: n, w, h, arts, cols, cell, kids, gridH, gridW, kidsW, kidsH };
}

export function deployment(nodes: readonly DeployNode[], artifacts: readonly Artifact[] = [], links: readonly DeployLink[] = [], o: DeploymentOptions = {}): Deployment {
  const id = o.id ?? 'deploy';
  const known = new Set(nodes.map((n) => n.id));
  const all = nodes.map((n) => (n.parent && known.has(n.parent) ? n : { ...n, parent: undefined }));
  const sizes = new Map<string, Measured>();
  const tops = all.filter((n) => !n.parent);
  for (const n of tops) sizes.set(n.id, measure(n, all, artifacts));

  // top-level placement (front-face centres)
  const topOf = (k: string): string | undefined => {
    const a = artifacts.find((x) => x.id === k);
    let cur = a ? a.node : k;
    for (let guard = 0; guard < 99; guard++) {
      const n = all.find((x) => x.id === cur);
      if (!n) return undefined;
      if (!n.parent) return n.id;
      cur = n.parent;
    }
    return undefined;
  };
  const free = tops.filter((n) => n.x == null || n.y == null);
  const at = new Map<string, { x: number; y: number }>();
  for (const n of tops) if (n.x != null && n.y != null) at.set(n.id, { x: n.x, y: n.y });
  if (free.length) {
    const freeIds = new Set(free.map((n) => n.id));
    const edges = links.flatMap((l) => {
      const a = topOf(l.from), b = topOf(l.to);
      return a && b && a !== b && freeIds.has(a) && freeIds.has(b) ? [{ from: a, to: b }] : [];
    });
    const L = layered(
      free.map((n) => { const m = sizes.get(n.id)!; return { id: n.id, w: m.w + NODE_DEPTH, h: m.h + NODE_DEPTH }; }),
      edges,
      { direction: 'right', rankGap: o.rankGap ?? 96, nodeGap: o.nodeGap ?? 40 },
    );
    // layered centres the bounding box (front + faces); the front face sits half a depth down-left of it
    for (const n of free) { const p = L.pos(n.id); at.set(n.id, { x: p.x - NODE_DEPTH / 2, y: p.y + NODE_DEPTH / 2 }); }
  }

  const frames = new Map<string, Frame>();
  const shapes: SceneNode[] = [];
  const drawArtifact = (a: Artifact, cx: number, cy: number, w: number) => {
    const k = `${id}:${a.id}`;
    frames.set(a.id, { x: cx, y: cy, w, h: ART_H });
    const ix = cx + w / 2 - 22, iy = cy - 7;
    shapes.push(
      rect({ id: k, x: cx, y: cy, w, h: ART_H, rx: 3, role: 'artifact', tone: a.tone, interactive: o.interactive, data: { artifact: a.id } }),
      path({ id: `${k}:icon`, points: [[ix, iy], [ix + 7, iy], [ix + 11, iy + 4], [ix + 11, iy + 14], [ix, iy + 14]], closed: true, role: 'artifact-icon', tone: a.tone }),
      path({ id: `${k}:fold`, points: [[ix + 7, iy], [ix + 7, iy + 4], [ix + 11, iy + 4]], role: 'artifact-icon-fold', tone: a.tone }),
      text({ id: `${k}:name`, x: cx - 6, y: cy, text: a.name, size: 12, role: 'artifact-name' }),
    );
  };
  const place = (m: Measured, cx: number, cy: number, top: boolean) => {
    const n = m.node, { w, h } = m;
    const k = `${id}:${n.id}`, D = NODE_DEPTH;
    const l = cx - w / 2, r = cx + w / 2, t = cy - h / 2, b = cy + h / 2;
    frames.set(n.id, { x: cx, y: cy, w, h });
    shapes.push(
      path({ id: `${k}:top`, points: [[l, t], [l + D, t - D], [r + D, t - D], [r, t]], closed: true, role: 'node-face-top', tone: n.tone }),
      path({ id: `${k}:side`, points: [[r, t], [r + D, t - D], [r + D, b - D], [r, b]], closed: true, role: 'node-face-side', tone: n.tone }),
      rect({ id: k, x: cx, y: cy, w, h, rx: 0, role: 'card', tone: n.tone, interactive: o.interactive, draggable: o.draggable && top, data: { node: n.id } }),
    );
    let y = t + 8;
    if (n.stereotype) {
      y += STEREO / 2;
      shapes.push(text({ id: `${k}:stereo`, x: cx, y, text: `«${n.stereotype}»`, size: STEREO, role: 'stereotype' }));
      y += STEREO / 2 + 4;
    }
    shapes.push(text({ id: `${k}:name`, x: cx, y: y + NAME / 2 + 1, text: n.name, size: NAME, role: 'node-name' }));
    let y0 = t + headHeight(n);
    if (m.arts.length) {
      const x0 = cx - m.gridW / 2;
      m.arts.forEach((a, i) => {
        const col = i % m.cols, row = Math.floor(i / m.cols);
        drawArtifact(a, x0 + col * (m.cell + GAP) + m.cell / 2, y0 + row * (ART_H + GAP) + ART_H / 2, m.cell);
      });
      y0 += m.gridH + GAP;
    }
    let x = cx - m.kidsW / 2;
    for (const c of m.kids) {
      place(c, x + c.w / 2, y0 + c.h / 2, false);
      x += c.w + GAP * 1.5;
    }
  };
  for (const n of tops) {
    const p = at.get(n.id) ?? { x: 0, y: 0 };
    place(sizes.get(n.id)!, p.x, p.y, true);
  }

  // links on top, so a line leaving a nested node stays visible over its parent
  const lines: SceneNode[] = [];
  for (const l of links) {
    const a = frames.get(l.from), b = frames.get(l.to);
    if (!a || !b) continue;
    const deploy = l.kind === 'deploy';
    const label = [l.label, l.protocol ? `«${l.protocol}»` : deploy && !l.label ? '«deploy»' : ''].filter(Boolean).join(' ');
    const end: ConnectorEnd = deploy ? 'open' : 'none';
    lines.push(...connector({
      id: `${id}:link:${l.from}-${deploy ? 'deploy' : 'comm'}-${l.to}`,
      from: a, to: b, route: o.route ?? 'elbow', end, dashed: deploy, label: label || undefined, tone: l.tone,
    }).nodes);
  }
  return { nodes: [...shapes, ...lines], box: (k) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 } };
}
