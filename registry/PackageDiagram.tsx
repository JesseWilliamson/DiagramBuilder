// A package diagram of a small app. Packages nest (web holds ui and api), and a relation can join
// packages at any depth: the line meets the outer frames. Click a package to light up what it, and
// everything inside it, imports, accesses or depends on. Top-level packages can be dragged.
import { useState } from 'react';
import { fitViewBox, Tone } from '@figurae/core';
import { Diagram } from '@figurae/react';
import { packageDiagram, PackageRelation, UmlPackage } from '@figurae/uml';

const packages: UmlPackage[] = [
  { id: 'web', name: 'web', children: [{ id: 'ui', name: 'ui' }, { id: 'api', name: 'api' }] },
  { id: 'domain', name: 'domain', children: [{ id: 'services', name: 'services' }, { id: 'model', name: 'model' }] },
  { id: 'infra', name: 'infra', children: [{ id: 'db', name: 'db' }, { id: 'http', name: 'http' }] },
  { id: 'util', name: 'util' },
];
const relations: PackageRelation[] = [
  { from: 'ui', to: 'api', kind: 'import' },
  { from: 'api', to: 'services', kind: 'import' },
  { from: 'services', to: 'model', kind: 'access' },
  { from: 'db', to: 'model', kind: 'dependency' },
  { from: 'http', to: 'util', kind: 'merge' },
  { from: 'api', to: 'util', kind: 'import' },
];

const viewBox = fitViewBox(packageDiagram(packages, relations, { rankGap: 80 }), 40);
const flat = (ps: readonly UmlPackage[]): UmlPackage[] => ps.flatMap((p) => [p, ...flat(p.children ?? [])]);
const within = (p: UmlPackage): string[] => flat([p]).map((q) => q.id);

export default function PackageDiagram() {
  const [sel, setSel] = useState<string | null>(null);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});

  const me = flat(packages).find((p) => p.id === sel);
  const mine = me ? new Set(within(me)) : new Set<string>();
  const out = relations.filter((r) => mine.has(r.from) && !mine.has(r.to));
  const targets = new Set(out.map((r) => r.to));
  const paint = (ps: readonly UmlPackage[]): UmlPackage[] =>
    ps.map((p) => ({ ...p, ...moved[p.id], tone: (p.id === sel ? 'active' : targets.has(p.id) ? 'accent' : undefined) as Tone | undefined, children: p.children && paint(p.children) }));
  const diagram = packageDiagram(
    paint(packages),
    relations.map((r) => ({ ...r, tone: out.includes(r) ? 'active' : undefined })),
    { interactive: true, draggable: true, route: 'straight', rankGap: 80 },
  );

  return (
    <>
      <Diagram
        scene={diagram}
        viewBox={viewBox}
        onDrag={(e) => {
          const id = (e.node.data as { package?: string })?.package;
          if (!id || !packages.some((p) => p.id === id)) return;
          setMoved((s) => ({ ...s, [id]: { x: e.x, y: e.y } }));
        }}
        onClick={(e) => {
          const id = (e.node.data as { package?: string })?.package;
          if (id) setSel((s) => (s === id ? null : id));
        }}
      />
      <p className="status">
        {!sel ? 'Click a package to see what it depends on. Drag the outer ones.' : out.length ? out.map((r) => `${r.from} «${r.kind}» ${r.to}`).join(' · ') : `${sel} depends on nothing outside itself.`}
      </p>
    </>
  );
}
