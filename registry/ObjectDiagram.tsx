// The same boxes, two meanings. A class diagram says what CAN exist; an object diagram shows what
// DOES, right now. Objects reuse their class's id, so switching the view morphs each box in place:
// names gain an underline and a `name : Class` title, attributes become `attr = value` slots, and
// the interfaces (which have no instances) fade away. Drag to rearrange; both views share positions.
import { useState } from 'react';
import { fitViewBox } from '@figurae/core';
import { Diagram, Segmented, Switch } from '@figurae/react';
import { classDiagram, ObjectLink, objectDiagram, Relation, UmlClass, UmlObject } from '@figurae/uml';

const classes: UmlClass[] = [
  { id: 'Shape', name: 'Shape', stereotype: 'interface', x: 250, y: 50, methods: ['+ area(): number'] },
  { id: 'Circle', name: 'Circle', x: 70, y: 250, attributes: ['- r: number'], methods: ['+ area(): number'] },
  { id: 'Rectangle', name: 'Rectangle', x: 270, y: 250, attributes: ['# w: number', '# h: number'], methods: ['+ area(): number'] },
  { id: 'Square', name: 'Square', x: 270, y: 420, methods: ['+ setSide(s): void'] },
  { id: 'Drawing', name: 'Drawing', x: 530, y: 50, attributes: ['- title: string'], methods: ['+ add(s: Shape): void'] },
  { id: 'Renderer', name: 'Renderer', stereotype: 'interface', x: 530, y: 250, methods: ['+ draw(s: Shape): void'] },
  { id: 'SvgRenderer', name: 'SvgRenderer', x: 530, y: 420, attributes: ['- width: number'], methods: ['+ draw(s: Shape): void'] },
];
const relations: Relation[] = [
  { from: 'Circle', to: 'Shape', kind: 'implements' },
  { from: 'Rectangle', to: 'Shape', kind: 'implements' },
  { from: 'Square', to: 'Rectangle', kind: 'inherits' },
  { from: 'Drawing', to: 'Shape', kind: 'composition', fromLabel: '1', toLabel: '*' },
  { from: 'Drawing', to: 'Renderer', kind: 'dependency' },
  { from: 'SvgRenderer', to: 'Renderer', kind: 'implements' },
];

// One object per concrete class, with the same id as its class. Positions come from `where`.
const objects: UmlObject[] = [
  { id: 'Circle', name: 'c1', class: 'Circle', slots: { r: 5 } },
  { id: 'Rectangle', name: 'r1', class: 'Rectangle', slots: { w: 4, h: 3 } },
  { id: 'Square', name: 'sq', class: 'Square', slots: { w: 2, h: 2 } },
  { id: 'Drawing', name: 'poster', class: 'Drawing', slots: { title: '"Shapes"' } },
  { id: 'SvgRenderer', name: 'svg', class: 'SvgRenderer', slots: { width: 400 } },
];
const links: ObjectLink[] = [
  { from: 'Drawing', to: 'Circle', toRole: 'shapes' },
  { from: 'Drawing', to: 'Rectangle', toRole: 'shapes' },
  { from: 'Drawing', to: 'Square', toRole: 'shapes' },
  { from: 'Drawing', to: 'SvgRenderer', toRole: 'renderer' },
];

const viewBox = fitViewBox(classDiagram(classes, relations), 40);

export default function ObjectDiagram() {
  const [view, setView] = useState<'class' | 'object'>('class');
  const [slots, setSlots] = useState(true);
  const [where, setWhere] = useState(Object.fromEntries(classes.map((c) => [c.id, { x: c.x!, y: c.y! }])));
  const [note, setNote] = useState('');

  const diagram =
    view === 'class'
      ? classDiagram(classes.map((c) => ({ ...c, ...where[c.id] })), relations, { id: 'uml', collapsed: !slots, interactive: true, draggable: true })
      : objectDiagram(objects.map((u) => ({ ...u, ...where[u.id] })), links, { id: 'uml', collapsed: !slots, interactive: true, draggable: true, route: 'straight' });

  return (
    <>
      <Diagram
        scene={diagram}
        viewBox={viewBox}
        onDrag={(e) => {
          const d = e.node.data as { class?: string; object?: string };
          const id = d?.class ?? d?.object;
          if (!id) return;
          setWhere((w) => ({ ...w, [id]: { x: e.x, y: e.y } }));
        }}
        onClick={(e) => {
          const d = e.node.data as { class?: string; object?: string } | undefined;
          const u = objects.find((o) => o.id === (d?.object ?? d?.class));
          if (!u) return setNote(d?.class ? `${d.class} is an interface: it has no instances.` : '');
          setNote(view === 'class' ? `class ${u.class}: any number of objects can be made from it.` : `${u.name} is one ${u.class}, with these values right now.`);
        }}
      />
      <p className="status">{note || 'Switch the view, then click a box.'}</p>
      <div className="row">
        <Segmented value={view} onChange={setView} options={[{ value: 'class', label: 'Classes' }, { value: 'object', label: 'Objects' }]} />
        <Switch label={view === 'class' ? 'Members' : 'Slots'} checked={slots} onChange={setSlots} />
      </div>
    </>
  );
}
