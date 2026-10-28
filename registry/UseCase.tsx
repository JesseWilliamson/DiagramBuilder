// A web shop's use cases. Click an actor to see what they can do: the cases they
// are linked to, and anything those include or are extended by. Toggle the boundary.
import { useState } from 'react';
import { Diagram, Switch } from 'dsviz/react';
import { useCase, UseCaseActor, UseCaseOval, UseCaseRelation } from 'dsviz/uml';

const actors: UseCaseActor[] = [
  { id: 'customer', name: 'Customer' },
  { id: 'admin', name: 'Admin' },
  { id: 'bank', name: 'Payment bank', side: 'right' },
];

const cases: UseCaseOval[] = [
  { id: 'browse', name: 'Browse products' },
  { id: 'order', name: 'Place order' },
  { id: 'pay', name: 'Pay' },
  { id: 'card', name: 'Verify card' },
  { id: 'coupon', name: 'Apply coupon' },
  { id: 'catalog', name: 'Manage catalogue' },
];

// include: from the base case TO the case it always runs. extend: from the extension TO its base.
const relations: UseCaseRelation[] = [
  { from: 'customer', to: 'browse', kind: 'association' },
  { from: 'customer', to: 'order', kind: 'association' },
  { from: 'admin', to: 'catalog', kind: 'association' },
  { from: 'admin', to: 'browse', kind: 'association' },
  { from: 'bank', to: 'card', kind: 'association' },
  { from: 'order', to: 'pay', kind: 'include' },
  { from: 'pay', to: 'card', kind: 'include' },
  { from: 'coupon', to: 'order', kind: 'extend' },
];

/** Cases an actor can reach: its own, then whatever they include or are extended by. */
function reach(actor: string) {
  const got = new Set(relations.filter((r) => r.kind === 'association' && r.from === actor).map((r) => r.to));
  for (let grew = true; grew; ) {
    grew = false;
    for (const r of relations) {
      const next = r.kind === 'include' && got.has(r.from) ? r.to : r.kind === 'extend' && got.has(r.to) ? r.from : null;
      if (next && !got.has(next)) (got.add(next), (grew = true));
    }
  }
  return got;
}

export default function UseCase() {
  const [system, setSystem] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const got = sel ? reach(sel) : null;
  const dim = got
    ? new Set([...cases.map((c) => c.id).filter((c) => !got.has(c)), ...actors.map((a) => a.id).filter((a) => a !== sel)])
    : undefined;
  const scene = useCase(actors.map((a) => ({ ...a, tone: a.id === sel ? 'active' : undefined })), cases, relations, {
    system: system ? { name: 'Online shop' } : undefined,
    interactive: true,
    dim,
  });
  return (
    <>
      <Diagram
        scene={scene}
        onClick={(e) => {
          const d = e.node.data as { actor?: string } | undefined;
          if (d?.actor) setSel((s) => (s === d.actor ? null : d.actor!));
        }}
      />
      <p className="status">
        {got ? `${actors.find((a) => a.id === sel)!.name} can: ${cases.filter((c) => got.has(c.id)).map((c) => c.name).join(', ')}` : 'Click an actor to see what they can do.'}
      </p>
      <div className="row"><Switch label="System boundary" checked={system} onChange={setSystem} /></div>
    </>
  );
}
