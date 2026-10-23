/**
 * UML use case diagrams: who (actors, stick figures) can do what (use cases,
 * ovals), with an optional system boundary around the cases.
 *
 *   kind            line     end marker                read as
 *   association     solid    none                      the actor takes part in the case
 *   include         dashed   open arrow at `to`  «include»   from always runs `to` as a step
 *   extend          dashed   open arrow at `to`  «extend»    from optionally adds to `to` (the base)
 *   generalization  solid    hollow triangle at `to`   from IS-A to (two actors or two cases)
 *
 * Note the arrows: «include» points from the base case to the case it uses,
 * «extend» points from the extension back to the base case it adds to.
 *
 * You place things (x, y = centre), or leave x/y out. Cases without a place go
 * through the layered layout (layout/layered.ts) when cases are related to each
 * other (a base case, then what it includes or extends, one column to its
 * right); with no case-to-case relations they go in a plain grid. Actors then
 * stand in a column on the left of the boundary (or on the right, `side:
 * 'right'`), each level with the cases it is linked to.
 */
import { Frame, Scene, SceneNode, Tone, V2, Vec, connector, estimateTextWidth, path, rect, rectEdge, text } from '@figurae/core';
import { layered, pack } from '@figurae/layout';
import { FIGURE, figureFrame, stickFigure } from './figure';

export interface UseCaseActor {
  id: string;
  name: string;
  x?: number;
  y?: number;
  /** Which side of the system the actor stands on when it has no x/y. Default 'left'. */
  side?: 'left' | 'right';
  tone?: Tone;
}

export interface UseCaseOval {
  id: string;
  name: string;
  x?: number;
  y?: number;
  tone?: Tone;
}

export type UseCaseRelationKind = 'association' | 'include' | 'extend' | 'generalization';

export interface UseCaseRelation {
  /** An actor id or a case id. See the header comment for which way each kind points. */
  from: string;
  to: string;
  kind: UseCaseRelationKind;
  tone?: Tone;
}

export interface UseCaseOptions {
  id?: string;
  /** Draw a boundary rectangle with this title around all the cases. */
  system?: { name: string; tone?: Tone };
  /** Actors and cases emit clicks with `{ actor: id }` / `{ case: id }`. */
  interactive?: boolean;
  /** Both can be dragged; the drag data is the same. */
  draggable?: boolean;
  /** Ids to fade (e.g. everything not linked to the selected actor). Their lines fade too. */
  dim?: ReadonlySet<string>;
  /** Space between the columns of cases and between rows. Defaults 110 and 26. */
  rankGap?: number;
  nodeGap?: number;
}

export interface UseCaseDiagram extends Scene {
  /** Frame of an actor (figure) or a case (oval). */
  frame(id: string): Frame;
  box(id: string): Frame;
  frames: Record<string, Frame>;
  /** The system boundary, when `system` was given. */
  boundary?: Frame;
}

/** Line style and markers per relation kind: the table in the header comment, as data. */
export const USE_CASE_STYLE: Record<UseCaseRelationKind, { dashed: boolean; end: 'none' | 'open' | 'triangle'; label?: string }> = {
  association: { dashed: false, end: 'none' },
  include: { dashed: true, end: 'open', label: '«include»' },
  extend: { dashed: true, end: 'open', label: '«extend»' },
  generalization: { dashed: false, end: 'triangle' },
};

const PAD = 28, TITLE = 32, ACTOR_GAP = 84, ACTOR_SEP = 96;

export const caseSize = (c: UseCaseOval) => ({ w: Math.max(120, Math.ceil(estimateTextWidth(c.name, 13) + 48)), h: 58 });

/** Points around an ellipse: a closed `path` is the only way to draw one. */
export function ellipsePoints(cx: number, cy: number, a: number, b: number, n = 40): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return [cx + a * Math.cos(t), cy + b * Math.sin(t)];
  });
}

/** Where the ray from an ellipse's centre toward `p` leaves it: c + d / |d / (a, b)|. */
function ellipseEdge(f: Frame, p: Vec): Vec {
  const dx = p.x - f.x, dy = p.y - f.y;
  const k = Math.hypot(dx / (f.w / 2), dy / (f.h / 2)) || 1;
  return V2(f.x + dx / k, f.y + dy / k);
}

export function useCase(actorsIn: readonly UseCaseActor[], casesIn: readonly UseCaseOval[], relations: readonly UseCaseRelation[] = [], o: UseCaseOptions = {}): UseCaseDiagram {
  const id = o.id ?? 'uc';
  const isCase = new Set(casesIn.map((c) => c.id));
  const dimOf = (k: string) => (o.dim?.has(k) ? 0.3 : 1);

  // 1. cases: the ones without a place
  const pos = new Map<string, Vec>();
  const free = casesIn.filter((c) => c.x == null || c.y == null);
  const among = relations.filter((r) => isCase.has(r.from) && isCase.has(r.to) && r.kind !== 'association');
  if (free.length && among.length) {
    // base before what it uses: include flows from → to, the others from the base (`to`) to the child
    const L = layered(
      free.map((c) => ({ id: c.id, ...caseSize(c) })),
      among.map((r) => (r.kind === 'include' ? { from: r.from, to: r.to } : { from: r.to, to: r.from })),
      { direction: 'right', rankGap: o.rankGap ?? 110, nodeGap: o.nodeGap ?? 26 },
    );
    for (const c of free) pos.set(c.id, L.pos(c.id));
  } else {
    const cols = free.length > 4 ? 2 : 1, wMax = Math.max(0, ...free.map((c) => caseSize(c).w));
    free.forEach((c, i) => pos.set(c.id, V2((i % cols) * (wMax + 40), Math.floor(i / cols) * (58 + (o.nodeGap ?? 26)))));
  }
  const frames: Record<string, Frame> = {};
  for (const c of casesIn) {
    const p = pos.get(c.id);
    frames[c.id] = { x: c.x ?? p?.x ?? 0, y: c.y ?? p?.y ?? 0, ...caseSize(c) };
  }

  // 2. the boundary: every case plus padding, room for the title on top
  const cs = casesIn.map((c) => frames[c.id]);
  const x0 = cs.length ? Math.min(...cs.map((f) => f.x - f.w / 2)) : 0, x1 = cs.length ? Math.max(...cs.map((f) => f.x + f.w / 2)) : 0;
  const y0 = cs.length ? Math.min(...cs.map((f) => f.y - f.h / 2)) : 0, y1 = cs.length ? Math.max(...cs.map((f) => f.y + f.h / 2)) : 0;
  let boundary: Frame | undefined;
  if (o.system) {
    const w = Math.max(x1 - x0 + 2 * PAD, estimateTextWidth(o.system.name, 14) + 40);
    boundary = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 - TITLE / 2, w, h: y1 - y0 + 2 * PAD + TITLE };
  }
  const left = (boundary ? boundary.x - boundary.w / 2 : x0 - PAD) - ACTOR_GAP;
  const right = (boundary ? boundary.x + boundary.w / 2 : x1 + PAD) + ACTOR_GAP;

  // 3. actors: in a column, each level with the cases it uses, kept ACTOR_SEP apart
  const wantY = (a: UseCaseActor) => {
    const ys = relations.filter((r) => r.kind === 'association' && (r.from === a.id || r.to === a.id))
      .map((r) => frames[r.from === a.id ? r.to : r.from]).filter(Boolean).map((f) => f.y);
    return ys.length ? ys.reduce((s, y) => s + y, 0) / ys.length : (y0 + y1) / 2;
  };
  for (const side of ['left', 'right'] as const) {
    const col = actorsIn.filter((a) => (a.x == null || a.y == null) && (a.side ?? 'left') === side)
      .map((a) => ({ a, y: wantY(a) })).sort((p, q) => p.y - q.y);
    const ys = pack(col.map((c) => c.y), col.map(() => ACTOR_SEP));
    col.forEach((c, i) => (frames[c.a.id] = figureFrame(side === 'left' ? left : right, ys[i], c.a.name)));
  }
  for (const a of actorsIn) if (a.x != null && a.y != null) frames[a.id] = figureFrame(a.x, a.y, a.name);

  // 4. paint: boundary, lines, then the things the lines join
  const nodes: SceneNode[] = [];
  if (boundary && o.system) {
    nodes.push(
      rect({ id: `${id}:system`, ...boundary, rx: 4, role: 'boundary', tone: o.system.tone }),
      text({ id: `${id}:system:title`, x: boundary.x, y: boundary.y - boundary.h / 2 + 18, text: o.system.name, size: 14, role: 'boundary-title', tone: o.system.tone }),
    );
  }
  for (const r of relations) {
    const a = frames[r.from], b = frames[r.to];
    if (!a || !b) continue;
    const s = USE_CASE_STYLE[r.kind];
    // ovals leave along the ellipse, figures along their box
    const edge = (f: Frame, k: string, toward: Vec) => (isCase.has(k) ? ellipseEdge(f, toward) : rectEdge({ x: f.x, y: f.y, ...FIGURE }, toward));
    nodes.push(
      ...connector({
        id: `${id}:rel:${r.from}-${r.kind}-${r.to}`,
        from: edge(a, r.from, b), to: edge(b, r.to, a), gap: 0,
        end: s.end, dashed: s.dashed, label: s.label, tone: r.tone,
        opacity: o.dim?.has(r.from) || o.dim?.has(r.to) ? 0.25 : 1,
      }).nodes,
    );
  }
  for (const c of casesIn) {
    const f = frames[c.id], k = `${id}:case:${c.id}`;
    nodes.push(
      path({ id: k, points: ellipsePoints(f.x, f.y, f.w / 2, f.h / 2), closed: true, role: 'usecase', tone: c.tone, opacity: dimOf(c.id), interactive: o.interactive, draggable: o.draggable, data: { case: c.id } }),
      text({ id: `${k}:label`, x: f.x, y: f.y, text: c.name, size: 13, role: 'value', opacity: dimOf(c.id) }),
    );
  }
  for (const a of actorsIn) {
    const f = frames[a.id];
    nodes.push(...stickFigure({ id: `${id}:actor:${a.id}`, x: f.x, y: f.y, name: a.name, tone: a.tone, opacity: dimOf(a.id), interactive: o.interactive, draggable: o.draggable, data: { actor: a.id } }));
  }
  const frame = (k: string) => frames[k] ?? { x: 0, y: 0, w: 0, h: 0 };
  return { nodes, frame, box: frame, frames, boundary };
}
