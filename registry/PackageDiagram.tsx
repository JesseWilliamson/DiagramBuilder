// A package diagram of a small app, drawn as folders. Packages nest (web holds ui and api), and a
// relation joins packages at any depth: it leaves the body of one, runs along a lane in the gap
// between the rows, and enters the other, never through a package it does not join. Click a
// package to see what it (and everything inside it) imports. "Flatten" drops the nesting: the same
// leaf packages slide into a plain dependency graph, laid out by what depends on what.
import { useState } from 'react';
import { Scene, bounds, fitViewBox, translate, Tone } from '@dsviz/core';
import { Diagram, Switch } from '@dsviz/react';
import { packageDiagram, PackageRelation, UmlPackage } from '@dsviz/uml';

const packages: UmlPackage[] = [
  { id: 'web', name: 'web', children: [{ id: 'ui', name: 'ui' }, { id: 'api', name: 'api' }] },
  { id: 'domain', name: 'domain', children: [{ id: 'services', name: 'services' }, { id: 'model', name: 'model' }] },
  { id: 'infra', name: 'infra', children: [{ id: 'db', name: 'db' }, { id: 'http', name: 'http' }] },
  { id: 'util', name: 'util' },
];
// infra depends on the domain's model (not the other way round), so the domain stays free of databases
const relations: PackageRelation[] = [
  { from: 'ui', to: 'api', kind: 'import' },
  { from: 'api', to: 'services', kind: 'import' },
  { from: 'services', to: 'model', kind: 'access' },
  { from: 'db', to: 'model', kind: 'dependency' },
  { from: 'http', to: 'util', kind: 'merge' },
  { from: 'api', to: 'util', kind: 'import' },
];

const flat = (ps: readonly UmlPackage[]): UmlPackage[] => ps.flatMap((p) => [p, ...flat(p.children ?? [])]);
const leaves = (ps: readonly UmlPackage[]): UmlPackage[] => ps.flatMap((p) => (p.children?.length ? leaves(p.children) : [{ ...p, children: undefined }]));
const parentOf = new Map(flat(packages).flatMap((p) => (p.children ?? []).map((c) => [c.id, p.id] as const)));
const ancestors = (k: string): string[] => { const p = parentOf.get(k); return p ? [p, ...ancestors(p)] : []; };

// Both views share one camera, each centred on it, so the switch slides the boxes instead of jumping the frame.
const build = (flatten: boolean, ps: readonly UmlPackage[], rels: readonly PackageRelation[], opts: { interactive?: boolean; dim?: Set<string> } = {}) =>
  flatten ? packageDiagram(leaves(ps), rels, { rankGap: 80, nodeGap: 40, ...opts }) : packageDiagram(ps, rels, opts);
const centre = (s: Scene) => { const b = bounds(s); return { dx: -(b.x + b.w / 2), dy: -(b.y + b.h / 2) }; };
const shift = { nested: centre(build(false, packages, relations)), flat: centre(build(true, packages, relations)) };
const viewBox = fitViewBox([
  translate(build(false, packages, relations), shift.nested.dx, shift.nested.dy),
  translate(build(true, packages, relations), shift.flat.dx, shift.flat.dy),
], 24);

export default function PackageDiagram() {
  const [sel, setSel] = useState<string | null>(null);
  const [flatten, setFlatten] = useState(false);

  const me = flat(packages).find((p) => p.id === sel);
  const mine = new Set(me ? flat([me]).map((q) => q.id) : []);
  const out = relations.filter((r) => mine.has(r.from) && !mine.has(r.to));
  const targets = new Set(out.map((r) => r.to));
  const lit = new Set([...mine, ...targets, ...[...mine, ...targets].flatMap(ancestors)]);
  const dim = sel ? new Set(flat(packages).map((p) => p.id).filter((k) => !lit.has(k))) : undefined;
  const paint = (ps: readonly UmlPackage[]): UmlPackage[] =>
    ps.map((p) => ({ ...p, tone: (mine.has(p.id) ? 'active' : targets.has(p.id) ? 'accent' : undefined) as Tone | undefined, children: p.children && paint(p.children) }));
  const s = flatten ? shift.flat : shift.nested;
  const scene = translate(build(flatten, paint(packages), relations.map((r) => ({ ...r, tone: out.includes(r) ? 'active' : undefined })), { interactive: true, dim }), s.dx, s.dy);

  const say = (r: PackageRelation) => `${r.from} «${r.kind}» ${r.to}`;
  return (
    <>
      <Diagram
        scene={scene}
        viewBox={viewBox}
        onClick={(e) => {
          const id = (e.node.data as { package?: string })?.package;
          if (id) setSel((s) => (s === id ? null : id));
        }}
      />
      <p className="status">
        {!sel
          ? 'Click a package to see what it imports. Flatten to see the leaves as a plain dependency graph.'
          : out.length
            ? `${sel} depends on ${[...targets].join(' and ')}: ${out.map(say).join(', ')}.`
            : `${sel} depends on nothing outside itself.`}
      </p>
      <div className="row"><Switch label="Flatten" checked={flatten} onChange={setFlatten} /></div>
    </>
  );
}
