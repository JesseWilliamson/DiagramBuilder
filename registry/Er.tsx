// A small shop schema as an entity-relationship diagram in crow's-foot notation. Click an entity
// to light up its relationships, fade the rest, and read each one as a sentence: the marker nearest
// a box is how many of that entity take part (a bar is one, a ring is zero, a crow's foot is many).
// No positions are given: the layered layout puts the "one" side above the "many" side.
import { useState } from 'react';
import { fitViewBox } from 'dsviz';
import { Diagram, Switch } from 'dsviz/react';
import { Cardinality, er, ErEntity, ErRelationship } from 'dsviz/uml';

const entities: ErEntity[] = [
  { id: 'customer', name: 'Customer', attributes: [
    { name: 'id', type: 'int', key: 'primary' }, { name: 'email', type: 'text' }, { name: 'phone', type: 'text', nullable: true } ] },
  { id: 'order', name: 'Order', attributes: [
    { name: 'id', type: 'int', key: 'primary' }, { name: 'customer_id', type: 'int', key: 'foreign' }, { name: 'placed_at', type: 'timestamp' } ] },
  { id: 'line', name: 'OrderLine', weak: true, attributes: [
    { name: 'order_id', type: 'int', key: 'foreign' }, { name: 'product_id', type: 'int', key: 'foreign' }, { name: 'qty', type: 'int' } ] },
  { id: 'product', name: 'Product', attributes: [
    { name: 'id', type: 'int', key: 'primary' }, { name: 'name', type: 'text' }, { name: 'price', type: 'numeric' } ] },
];

// `back` is the label read the other way round, for the sentences under the diagram.
const relationships: (ErRelationship & { back: string })[] = [
  { from: 'customer', to: 'order', fromCard: 'one', toCard: 'zero-many', label: 'places', back: 'is placed by', identifying: false },
  { from: 'order', to: 'line', fromCard: 'one', toCard: 'one-many', label: 'contains', back: 'belongs to', identifying: true },
  { from: 'product', to: 'line', fromCard: 'one', toCard: 'zero-many', label: 'appears in', back: 'is for', identifying: false },
];

const HOW_MANY: Record<Cardinality, string> = { one: 'exactly one', 'zero-one': 'zero or one', many: 'many', 'zero-many': 'zero or many', 'one-many': 'one or more' };
const nameOf = (id: string) => entities.find((e) => e.id === id)!.name;
const a = (noun: string) => `${/^[aeiou]/i.test(noun) ? 'An' : 'A'} ${noun}`;
const plural = (card: Cardinality, noun: string) => (card === 'one' || card === 'zero-one' ? noun : `${noun}s`);

/** "An Order is placed by exactly one Customer; a Customer places zero or many Orders." read from `sel`. */
function sentence(r: (typeof relationships)[number], sel: string): string {
  const from = nameOf(r.from), to = nameOf(r.to), fc = r.fromCard ?? 'one', tc = r.toCard ?? 'one';
  const forward = `${a(from)} ${r.label} ${HOW_MANY[tc]} ${plural(tc, to)}`;
  const backward = `${a(to)} ${r.back} ${HOW_MANY[fc]} ${plural(fc, from)}`;
  const [first, second] = sel === r.from ? [forward, backward] : [backward, forward];
  return `${first}; ${second.charAt(0).toLowerCase()}${second.slice(1)}.`;
}

// one camera for both states, so toggling the attributes doesn't move the picture
const viewBox = fitViewBox([er(entities, relationships), er(entities, relationships, { collapsed: true })], 30);

export default function Er() {
  const [sel, setSel] = useState<string | null>(null);
  const [attributes, setAttributes] = useState(true);
  const touches = (r: ErRelationship) => r.from === sel || r.to === sel;
  const near = new Set(relationships.filter(touches).flatMap((r) => [r.from, r.to]));
  const dim = sel ? new Set(entities.map((e) => e.id).filter((e) => !near.has(e))) : undefined;
  const diagram = er(
    entities.map((e) => ({ ...e, tone: e.id === sel ? 'active' : undefined })),
    relationships.map((r) => ({ ...r, tone: sel && touches(r) ? 'active' : undefined })),
    { interactive: true, dim, collapsed: !attributes },
  );
  return (
    <>
      <Diagram scene={diagram} viewBox={viewBox}
        onClick={(e) => { const id = (e.node.data as { entity?: string })?.entity; if (id) setSel((s) => (s === id ? null : id)); }} />
      <p className="status">
        {sel ? relationships.filter(touches).map((r) => sentence(r, sel)).join(' ') : 'Click an entity to read its relationships.'}
      </p>
      <Switch label="Attributes" checked={attributes} onChange={setAttributes} />
    </>
  );
}
