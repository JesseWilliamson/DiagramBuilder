// A small shop schema as an entity-relationship diagram, in crow's-foot or Chen notation.
// Click an entity to light up its relationships and fade the rest. No positions are given:
// the layered layout puts the "one" side above the "many" side.
import { useState } from 'react';
import { fitViewBox } from '@figurae/core';
import { Diagram, Segmented } from '@figurae/react';
import { er, ErEntity, ErRelationship } from '@figurae/uml';

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

const relationships: ErRelationship[] = [
  { from: 'customer', to: 'order', fromCard: 'one', toCard: 'zero-many', label: 'places', identifying: false },
  { from: 'order', to: 'line', fromCard: 'one', toCard: 'one-many', label: 'contains', identifying: true },
  { from: 'product', to: 'line', fromCard: 'one', toCard: 'zero-many', label: 'appears in', identifying: false },
];

type Notation = 'crows-foot' | 'chen';
const viewBox = fitViewBox([er(entities, relationships), er(entities, relationships, { notation: 'chen' })], 30);

export default function Er() {
  const [notation, setNotation] = useState<Notation>('crows-foot');
  const [sel, setSel] = useState<string | null>(null);
  const touches = (r: ErRelationship) => r.from === sel || r.to === sel;
  const near = new Set(relationships.filter(touches).flatMap((r) => [r.from, r.to]));
  const dim = sel ? new Set(entities.map((e) => e.id).filter((e) => !near.has(e))) : undefined;
  const diagram = er(
    entities.map((e) => ({ ...e, tone: e.id === sel ? 'active' : undefined })),
    relationships.map((r) => ({ ...r, tone: sel && touches(r) ? 'active' : undefined })),
    { notation, interactive: true, dim },
  );
  return (
    <>
      <Diagram scene={diagram} viewBox={viewBox}
        onClick={(e) => { const id = (e.node.data as { entity?: string })?.entity; if (id) setSel((s) => (s === id ? null : id)); }} />
      <p className="status">
        {sel ? relationships.filter(touches).map((r) => `${r.from} ${r.label} ${r.to}`).join(' · ') : 'Click an entity to see its relationships.'}
      </p>
      <Segmented value={notation} onChange={setNotation} options={[{ value: 'crows-foot', label: "Crow's foot" }, { value: 'chen', label: 'Chen' }]} />
    </>
  );
}
