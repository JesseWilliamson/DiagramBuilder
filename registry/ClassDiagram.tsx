// A class diagram you can rearrange. Drag the boxes; click one to see only its relationships.
// Positions are plain state, so the lines re-route as you drag.
import { useState } from 'react';
import { fitViewBox } from '@figurae/core';
import { Diagram, Switch } from '@figurae/react';
import { classDiagram, Relation, RelationKind, UmlClass } from '@figurae/uml';

const start: UmlClass[] = [
  { id: 'Shape', name: 'Shape', stereotype: 'interface', x: 250, y: 50, methods: ['+ area(): number', '+ perimeter(): number'] },
  { id: 'Circle', name: 'Circle', x: 70, y: 250, attributes: ['- r: number'], methods: ['+ area(): number'] },
  { id: 'Rectangle', name: 'Rectangle', x: 270, y: 250, attributes: ['# w: number', '# h: number'], methods: ['+ area(): number'] },
  { id: 'Square', name: 'Square', x: 270, y: 420, methods: ['+ setSide(s): void'] },
  { id: 'Drawing', name: 'Drawing', x: 530, y: 50, attributes: ['- shapes: Shape[]'], methods: ['+ add(s: Shape): void', '+ render(r: Renderer)'] },
  { id: 'Renderer', name: 'Renderer', stereotype: 'interface', x: 530, y: 250, methods: ['+ draw(s: Shape): void'] },
  { id: 'SvgRenderer', name: 'SvgRenderer', x: 530, y: 420, methods: ['+ draw(s: Shape): void'] },
];

const relations: Relation[] = [
  { from: 'Circle', to: 'Shape', kind: 'implements' },
  { from: 'Rectangle', to: 'Shape', kind: 'implements' },
  { from: 'Square', to: 'Rectangle', kind: 'inherits' },
  { from: 'Drawing', to: 'Shape', kind: 'composition', fromLabel: '1', toLabel: '*' },
  { from: 'Drawing', to: 'Renderer', kind: 'dependency' },
  { from: 'SvgRenderer', to: 'Renderer', kind: 'implements' },
];

// Each kind, read out loud.
const say: Record<RelationKind, (a: string, b: string) => string> = {
  inherits: (a, b) => `${a} is a ${b}`,
  implements: (a, b) => `${a} implements ${b}`,
  composition: (a, b) => `${a} owns its ${b}s`,
  aggregation: (a, b) => `${a} has ${b}s`,
  association: (a, b) => `${a} knows a ${b}`,
  dependency: (a, b) => `${a} uses ${b}`,
};

// One fixed camera with room around the starting layout: drags are kept inside it.
const viewBox = fitViewBox(classDiagram(start, relations), 40);

export default function ClassDiagram() {
  const [classes, setClasses] = useState(start);
  const [sel, setSel] = useState<string | null>(null);
  const [members, setMembers] = useState(true);

  const mine = relations.filter((r) => r.from === sel || r.to === sel);
  const related = new Set(mine.flatMap((r) => [r.from, r.to]));
  const dim = sel ? new Set(classes.map((c) => c.id).filter((c) => !related.has(c))) : undefined;
  const diagram = classDiagram(
    classes.map((c) => ({ ...c, tone: c.id === sel ? 'active' : undefined })),
    relations.map((r) => ({ ...r, tone: sel && (r.from === sel || r.to === sel) ? 'active' : undefined })),
    { collapsed: !members, interactive: true, draggable: true, dim },
  );
  const scene = diagram;

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={viewBox}
        onDrag={(e) => {
          const id = (e.node.data as { class: string }).class;
          setClasses((cs) => cs.map((c) => (c.id === id ? { ...c, x: e.x, y: e.y } : c)));
        }}
        onClick={(e) => { const id = (e.node.data as { class?: string })?.class; if (id) setSel((s) => (s === id ? null : id)); }}
      />
      <p className="status">
        {sel ? mine.map((r) => say[r.kind](r.from, r.to)).join(' · ') : 'Click a class to see its relationships. Drag to rearrange.'}
      </p>
      <div className="row">
        <Switch label="Members" checked={members} onChange={setMembers} />
      </div>
    </>
  );
}
