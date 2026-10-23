// A shop's components. Lollipops (provides) and sockets (requires) snap together into
// assemblies. Click a component to see what it provides, what it requires, and who it talks to.
import { useState } from 'react';
import { Diagram } from '@figurae/react';
import { component, Connection, UmlComponent } from '@figurae/uml';

const parts: UmlComponent[] = [
  { id: 'web', name: 'Web UI' },
  { id: 'backend', name: 'Shop backend', ports: [{ id: 'api', name: 'api', side: 'left' }] },
  { id: 'orders', name: 'Orders', parent: 'backend', provides: [{ name: 'IOrders', side: 'top' }], requires: ['IStock', 'IPay'] },
  { id: 'stock', name: 'Inventory', parent: 'backend', provides: ['IStock'] },
  { id: 'pay', name: 'Payments', parent: 'backend', provides: ['IPay'], requires: ['IBank'] },
  { id: 'bank', name: 'Bank API', stereotype: 'external', provides: ['IBank'] },
];

// An assembly reads "from needs it, to provides it". A delegate hands a port's traffic to a part inside.
const links: Connection[] = [
  { from: 'orders', to: 'stock', kind: 'assembly', interface: 'IStock' },
  { from: 'orders', to: 'pay', kind: 'assembly', interface: 'IPay' },
  { from: 'pay', to: 'bank', kind: 'assembly', interface: 'IBank' },
  { from: 'web', to: 'api', kind: 'dependency', label: 'HTTP' },
  { from: 'api', to: 'orders', kind: 'delegate' },
];

const say = (id: string) => {
  const c = parts.find((p) => p.id === id)!;
  const list = (xs?: readonly unknown[]) => (xs?.length ? xs.join(', ') : 'nothing');
  return `${c.name} provides ${list(c.provides)} and requires ${list(c.requires)}.`;
};

export default function Component() {
  const [sel, setSel] = useState<string | null>(null);
  // everything joined to the selection stays; the rest fades. A port belongs to its component.
  const mine = links.filter((l) => [l.from, l.to].some((k) => k === sel || (sel === 'backend' && k === 'api')));
  const near = new Set(mine.flatMap((l) => [l.from, l.to]));
  const dim = sel ? new Set(parts.map((p) => p.id).filter((p) => p !== sel && !near.has(p) && !parts.some((c) => c.parent === p && near.has(c.id)) && p !== parts.find((c) => c.id === sel)?.parent)) : undefined;
  const scene = component(
    parts.map((p) => ({ ...p, tone: p.id === sel ? 'active' : undefined })),
    links.map((l) => ({ ...l, tone: mine.includes(l) ? 'active' : undefined })),
    { interactive: true, dim },
  );
  return (
    <>
      <Diagram scene={scene} onClick={(e) => { const id = (e.node.data as { component?: string } | undefined)?.component; if (id) setSel((s) => (s === id ? null : id)); }} />
      <p className="status">{sel ? say(sel) : 'Click a component to see what it provides and requires.'}</p>
    </>
  );
}
