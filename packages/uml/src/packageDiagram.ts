/**
 * UML package diagrams: how code is grouped, and which groups lean on which.
 *
 *   thing          drawn as                                    read as
 *   package        a body with a TAB on its top-left corner     a namespace / module / folder
 *   with children  name in the tab, children inside the body    a package that contains packages
 *   without        name centred in the body                     a leaf package
 *
 *   relation    line                       read as
 *   import      dashed open arrow «import`   from brings the public names of to into view
 *   access      dashed open arrow «access»   the same, but the names stay private
 *   merge       dashed open arrow «merge»    from takes in the contents of to
 *   dependency  dashed open arrow            from needs something of to
 *
 * Packages nest to any depth (`children`), and a relation can join packages at
 * any depth: the line meets the outer frames (the body, not the tab). Sizes are
 * measured from the inside out, like arch's zones: a package grows around its
 * children, which are placed by the layered layout (layout/layered.ts) along
 * the relations between them. Top-level packages are yours to place (x, y =
 * centre of the body) or, left out, placed by the same layout.
 */
import { Frame, Scene, SceneNode, Tone, connector, estimateTextWidth, path, rect, text } from '@figurae/core';
import { layered } from '@figurae/layout';

export interface UmlPackage {
  id: string;
  name: string;
  /** Packages inside this one (any depth). */
  children?: readonly UmlPackage[];
  /** Centre of the body; top-level packages only. Leave both out to have the layered layout place it. */
  x?: number;
  y?: number;
  tone?: Tone;
}

export type PackageRelationKind = 'import' | 'access' | 'merge' | 'dependency';

export interface PackageRelation {
  /** Package ids, at any depth. */
  from: string;
  to: string;
  kind: PackageRelationKind;
  label?: string;
  tone?: Tone;
}

export interface PackageDiagramOptions {
  id?: string;
  /** Packages emit clicks with `{ package: id }`. */
  interactive?: boolean;
  /** Top-level packages can be dragged; drag data is `{ package: id }`. Their contents go along. */
  draggable?: boolean;
  /** 'elbow' (default) or 'straight'. */
  route?: 'elbow' | 'straight';
  /** Packages to fade. */
  dim?: ReadonlySet<string>;
  /** Space between layers and between neighbours (inside packages and at the top level). Defaults 56 and 28. */
  rankGap?: number;
  nodeGap?: number;
}

export interface PackageDiagram extends Scene {
  /** The body of a package, tab excluded (centre + size). */
  box(id: string): Frame;
}

/** Line style, marker and default label for each relation: the table in the header comment, as data. */
export const PACKAGE_RELATION: Record<PackageRelationKind, { dashed: boolean; end: 'open'; stereotype?: string }> = {
  import: { dashed: true, end: 'open', stereotype: 'import' },
  access: { dashed: true, end: 'open', stereotype: 'access' },
  merge: { dashed: true, end: 'open', stereotype: 'merge' },
  dependency: { dashed: true, end: 'open' },
};

export const TAB_H = 20;
const NAME = 14, PAD = 16;

interface Measured {
  pkg: UmlPackage;
  w: number;
  h: number;
  tabW: number;
  kids: Measured[];
  /** Child centres relative to this body's top-left corner. */
  at: Map<string, { x: number; y: number }>;
}

/** Package ancestors of an id, outermost first, ending with the id itself. */
function chains(pkgs: readonly UmlPackage[], trail: readonly string[] = [], out = new Map<string, string[]>()) {
  for (const p of pkgs) {
    const t = [...trail, p.id];
    out.set(p.id, t);
    chains(p.children ?? [], t, out);
  }
  return out;
}

export function packageDiagram(packages: readonly UmlPackage[], relations: readonly PackageRelation[] = [], o: PackageDiagramOptions = {}): PackageDiagram {
  const id = o.id ?? 'pkg';
  const rankGap = o.rankGap ?? 56, nodeGap = o.nodeGap ?? 28;
  const chain = chains(packages);
  /** The relation as an edge between two different siblings under `parent`, if it crosses between them. */
  const edgesUnder = (parent: string | null, sibs: readonly UmlPackage[]) => {
    const ids = new Set(sibs.map((s) => s.id));
    return relations.flatMap((r) => {
      const a = chain.get(r.from), b = chain.get(r.to);
      if (!a || !b) return [];
      const d = parent == null ? 0 : a.indexOf(parent) + 1;
      if (parent != null && (a.indexOf(parent) < 0 || b.indexOf(parent) < 0)) return [];
      const x = a[d], y = b[d];
      return x && y && x !== y && ids.has(x) && ids.has(y) ? [{ from: x, to: y }] : [];
    });
  };

  // inside out: a package is as big as its children's layout plus padding
  const measure = (p: UmlPackage): Measured => {
    const tabW = Math.max(52, Math.ceil(estimateTextWidth(p.name, 13) + 20));
    const kids = (p.children ?? []).map(measure);
    const at = new Map<string, { x: number; y: number }>();
    if (!kids.length) {
      const w = Math.max(120, Math.ceil(estimateTextWidth(p.name, NAME) + 2 * PAD));
      return { pkg: p, w, h: 60, tabW: Math.min(tabW, Math.round(w * 0.4)), kids, at };
    }
    const L = layered(
      kids.map((k) => ({ id: k.pkg.id, w: k.w, h: k.h + TAB_H })),
      edgesUnder(p.id, p.children ?? []),
      { rankGap, nodeGap },
    );
    // layered centres each kid's bounding box (body + tab); shift so the group's corner is at (PAD, PAD)
    for (const k of kids) {
      const c = L.pos(k.pkg.id);
      at.set(k.pkg.id, { x: c.x - L.box.x + PAD, y: c.y - L.box.y + PAD + TAB_H / 2 });
    }
    const w = Math.max(tabW + PAD, Math.ceil(L.box.w + 2 * PAD));
    return { pkg: p, w, h: Math.ceil(L.box.h + 2 * PAD), tabW, kids, at };
  };
  const tops = packages.map(measure);

  // top level: given centres win; the rest go through the same layered layout
  const at = new Map<string, { x: number; y: number }>();
  for (const m of tops) if (m.pkg.x != null && m.pkg.y != null) at.set(m.pkg.id, { x: m.pkg.x, y: m.pkg.y });
  const free = tops.filter((m) => !at.has(m.pkg.id));
  if (free.length) {
    const L = layered(
      free.map((m) => ({ id: m.pkg.id, w: m.w, h: m.h + TAB_H })),
      edgesUnder(null, free.map((m) => m.pkg)),
      { rankGap, nodeGap },
    );
    for (const m of free) { const c = L.pos(m.pkg.id); at.set(m.pkg.id, { x: c.x, y: c.y + TAB_H / 2 }); }
  }

  const frames = new Map<string, Frame>();
  const shapes: SceneNode[] = [];
  const place = (m: Measured, cx: number, cy: number, top: boolean) => {
    const p = m.pkg, k = `${id}:${p.id}`;
    const l = cx - m.w / 2, t = cy - m.h / 2;
    const dim = o.dim?.has(p.id) ? 0.3 : 1;
    frames.set(p.id, { x: cx, y: cy, w: m.w, h: m.h });
    const data = { package: p.id };
    shapes.push(
      path({ id: `${k}:tab`, points: [[l, t], [l, t - TAB_H], [l + m.tabW, t - TAB_H], [l + m.tabW, t]], closed: true, role: 'package-tab', tone: p.tone, opacity: dim, interactive: o.interactive, draggable: o.draggable && top, data }),
      rect({ id: k, x: cx, y: cy, w: m.w, h: m.h, rx: 0, role: 'package', tone: p.tone, opacity: dim, interactive: o.interactive, draggable: o.draggable && top, data }),
    );
    if (m.kids.length) shapes.push(text({ id: `${k}:name`, x: l + m.tabW / 2, y: t - TAB_H / 2, text: p.name, size: 13, role: 'package-name', opacity: dim }));
    else shapes.push(text({ id: `${k}:name`, x: cx, y: cy, text: p.name, size: NAME, role: 'package-name', opacity: dim }));
    for (const c of m.kids) {
      const a = m.at.get(c.pkg.id)!;
      place(c, l + a.x, t + a.y, false);
    }
  };
  for (const m of tops) { const c = at.get(m.pkg.id) ?? { x: 0, y: 0 }; place(m, c.x, c.y, true); }

  // relations on top, so a line crossing a package body is still seen
  const lines: SceneNode[] = [];
  for (const r of relations) {
    const a = frames.get(r.from), b = frames.get(r.to);
    if (!a || !b) continue;
    const s = PACKAGE_RELATION[r.kind];
    const dim = o.dim?.has(r.from) || o.dim?.has(r.to) ? 0.25 : 1;
    const label = r.label ?? (s.stereotype ? `«${s.stereotype}»` : undefined);
    lines.push(...connector({ id: `${id}:rel:${r.from}-${r.kind}-${r.to}`, from: a, to: b, route: o.route ?? 'elbow', end: s.end, dashed: s.dashed, label, tone: r.tone, opacity: dim }).nodes);
  }
  return { nodes: [...shapes, ...lines], box: (k) => frames.get(k) ?? { x: 0, y: 0, w: 0, h: 0 } };
}
