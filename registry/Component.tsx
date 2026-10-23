// A shop's components. A lollipop is an interface a component PROVIDES, a socket one it REQUIRES;
// where they meet, the socket closes round the ball: an assembly. The port on the backend's edge
// is where outside traffic comes in; a delegate hands it to the part inside. Click a component to
// read its interfaces; switch "Inside" off to see the backend as one black box.
import { useState } from 'react';
import { fitViewBox } from '@dsviz/core';
import { Diagram, Switch } from '@dsviz/react';
import { component, Connection, UmlComponent } from '@dsviz/uml';

// Positions are the centres of the boxes; a parent frame is drawn round its placed children.
const open: UmlComponent[] = [
  { id: 'web', name: 'Web UI', x: 86, y: 30 },
  { id: 'backend', name: 'Shop backend', ports: [{ id: 'api', name: 'api', side: 'top', x: 86 }] },
  { id: 'orders', name: 'Orders', parent: 'backend', x: 86, y: 260, provides: [{ name: 'IOrders', side: 'top' }], requires: ['IStock', 'IPay'] },
  { id: 'stock', name: 'Inventory', parent: 'backend', x: 304, y: 186, provides: ['IStock'] },
  { id: 'pay', name: 'Payments', parent: 'backend', x: 304, y: 286, provides: ['IPay'], requires: ['IBank'] },
  { id: 'bank', name: 'Bank API', stereotype: 'external', x: 510, y: 286, provides: ['IBank'] },
];
const closed: UmlComponent[] = [
  open[0],
  { id: 'backend', name: 'Shop backend', x: 136, y: 190, ports: [{ id: 'api', name: 'api', side: 'top', x: 86 }], requires: ['IBank'] },
  { ...open[5], y: 190 },
];

// An assembly reads "from needs it, to provides it". A delegate hands a port's traffic to a lollipop inside.
const openLinks: Connection[] = [
  { from: 'orders', to: 'stock', kind: 'assembly', interface: 'IStock' },
  { from: 'orders', to: 'pay', kind: 'assembly', interface: 'IPay' },
  { from: 'pay', to: 'bank', kind: 'assembly', interface: 'IBank' },
  { from: 'web', to: 'api', kind: 'dependency', label: 'HTTP' },
  { from: 'api', to: 'orders', kind: 'delegate', interface: 'IOrders' },
];
const closedLinks: Connection[] = [
  { from: 'backend', to: 'bank', kind: 'assembly', interface: 'IBank' },
  { from: 'web', to: 'api', kind: 'dependency', label: 'HTTP' },
];

// One camera that fits both views, so toggling never jumps.
const viewBox = fitViewBox([component(open, openLinks), component(closed, closedLinks)], 16);

const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);

export default function Component() {
  const [inside, setInside] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const parts = inside ? open : closed, links = inside ? openLinks : closedLinks;

  const name = (id: string) => parts.find((p) => p.id === id)?.name ?? id;
  const ownerOf = (id: string) => parts.find((p) => p.ports?.some((q) => q.id === id))?.id ?? id; // a port belongs to its component
  // everything joined to the selection (through a port too) stays; the rest fades
  const touches = (l: Connection, id: string | null) => id != null && [l.from, l.to].some((k) => ownerOf(k) === id);
  const mine = sel ? links.filter((l) => touches(l, sel)) : [];
  const ports = new Set(mine.flatMap((l) => [l.from, l.to]).filter((k) => ownerOf(k) !== k));
  const viaPort = links.filter((l) => !mine.includes(l) && [l.from, l.to].some((k) => ports.has(k)));
  const lit = new Set([...mine, ...viaPort].flatMap((l) => [ownerOf(l.from), ownerOf(l.to)]));
  const keep = new Set([sel, ...lit, ...[sel, ...lit].map((k) => parts.find((p) => p.id === k)?.parent)]);
  const dim = sel ? new Set(parts.map((p) => p.id).filter((p) => !keep.has(p))) : undefined;

  const scene = component(
    parts.map((p) => ({ ...p, tone: p.id === sel ? 'active' : undefined })),
    links.map((l) => ({ ...l, tone: mine.includes(l) || viaPort.includes(l) ? 'active' : undefined })),
    { interactive: true, dim },
  );

  // "Orders requires IStock from Inventory and IPay from Payments; provides IOrders to Web UI."
  const say = (id: string) => {
    const req = links.filter((l) => l.kind === 'assembly' && l.from === id).map((l) => `${l.interface} from ${name(l.to)}`);
    const prov = links.filter((l) => l.kind === 'assembly' && l.to === id).map((l) => `${l.interface} to ${name(l.from)}`);
    for (const d of links.filter((l) => l.kind === 'delegate' && l.to === id)) {
      for (const u of links.filter((l) => l.kind === 'dependency' && l.to === d.from)) prov.push(`${d.interface} to ${name(u.from)}, through port ${d.from}`);
    }
    const uses = links.filter((l) => l.kind === 'dependency' && l.from === id).map((l) => `the ${l.to} port of ${name(ownerOf(l.to))} over ${l.label}`);
    const parts_ = [req.length && `requires ${list(req)}`, prov.length && `provides ${list(prov)}`, uses.length && `uses ${list(uses)}`].filter(Boolean);
    return parts_.length ? `${name(id)} ${parts_.join('; ')}.` : `${name(id)} has no interfaces of its own; its parts do.`;
  };

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={viewBox}
        onClick={(e) => { const id = (e.node.data as { component?: string } | undefined)?.component; if (id) setSel((s) => (s === id ? null : id)); }}
      />
      <p className="status">{sel && parts.some((p) => p.id === sel) ? say(sel) : 'Click a component to see what it provides and requires.'}</p>
      <div className="row">
        <Switch label="Inside" checked={inside} onChange={(v) => { setInside(v); setSel(null); }} />
      </div>
    </>
  );
}
