// A deployment diagram you can reconfigure. Switch on a second server and a load balancer: the
// nodes are placed left to right by the layered layout and keep their ids, so the diagram
// rearranges instead of redrawing. Click a node or artifact; drag a machine (its contents go along).
import { useState } from 'react';
import { combine, fitViewBox, snapGuides } from '@figurae/core';
import { Diagram, Switch, useSnap } from '@figurae/react';
import { Artifact, DeployLink, DeployNode, deployment } from '@figurae/uml';

function model(balanced: boolean, second: boolean) {
  const servers = second ? ['s1', 's2'] : ['s1'];
  const nodes: DeployNode[] = [
    { id: 'client', name: 'Laptop', stereotype: 'device' },
    ...(balanced ? [{ id: 'lb', name: 'Load balancer', stereotype: 'device' }] : []),
    ...servers.flatMap((s, i) => [
      { id: s, name: `Server ${i + 1}`, stereotype: 'device' },
      { id: `jvm-${s}`, name: 'JVM', stereotype: 'executionEnvironment', parent: s },
    ]),
    { id: 'db', name: 'Database host', stereotype: 'device' },
  ];
  const artifacts: Artifact[] = [
    { id: 'browser', name: 'browser', node: 'client' },
    ...(balanced ? [{ id: 'nginx', name: 'nginx.conf', node: 'lb' }] : []),
    ...servers.flatMap((s) => [
      { id: `war-${s}`, name: 'shop.war', node: `jvm-${s}` },
      { id: `cfg-${s}`, name: 'app.yml', node: `jvm-${s}` },
    ]),
    { id: 'schema', name: 'schema.sql', node: 'db' },
  ];
  const front = balanced ? 'lb' : 's1';
  const links: DeployLink[] = [
    { from: 'client', to: front, protocol: 'HTTPS' },
    ...(balanced ? servers.map((s) => ({ from: 'lb', to: s, protocol: 'HTTP' })) : second ? [{ from: 'client', to: 's2', protocol: 'HTTPS' }] : []),
    ...servers.map((s) => ({ from: s, to: 'db', protocol: 'JDBC' })),
  ];
  return { nodes, artifacts, links };
}

const full = model(true, true);
const viewBox = fitViewBox(deployment(full.nodes, full.artifacts, full.links), 40);

export default function Deployment() {
  const [balanced, setBalanced] = useState(false);
  const [second, setSecond] = useState(false);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});
  const [sel, setSel] = useState<string | null>(null);

  const m = model(balanced, second);
  const nodes = m.nodes.map((n) => ({ ...n, ...moved[n.id], tone: n.id === sel ? ('active' as const) : undefined }));
  const diagram = deployment(nodes, m.artifacts, m.links, { interactive: true, draggable: true });
  const { guides, snap, clear } = useSnap(
    Object.fromEntries(m.nodes.filter((n) => !n.parent).map((n) => [n.id, diagram.box(n.id)])),
    { grid: 10 },
  );

  const what = (id: string) => {
    const n = m.nodes.find((x) => x.id === id);
    if (n) {
      const hosts = m.artifacts.filter((a) => a.node === id).map((a) => a.name);
      const inside = m.nodes.filter((k) => k.parent === id).map((k) => k.name);
      return `${n.name}: «${n.stereotype}»${inside.length ? `, runs ${inside.join(', ')}` : ''}${hosts.length ? `, hosts ${hosts.join(', ')}` : ''}.`;
    }
    const a = m.artifacts.find((x) => x.id === id);
    return a ? `${a.name} is deployed on ${m.nodes.find((x) => x.id === a.node)?.name}.` : '';
  };

  return (
    <>
      <Diagram
        scene={combine(diagram, snapGuides(guides))}
        viewBox={viewBox}
        onDrag={(e) => {
          const id = (e.node.data as { node?: string })?.node;
          if (!id) return;
          const p = snap(id, e);
          setMoved((s) => ({ ...s, [id]: { x: p.x, y: p.y } }));
        }}
        onDragEnd={clear}
        onClick={(e) => {
          const d = e.node.data as { node?: string; artifact?: string } | undefined;
          const id = d?.node ?? d?.artifact;
          if (id) setSel((s) => (s === id ? null : id));
        }}
      />
      <p className="status">{sel && m.nodes.some((n) => n.id === sel) ? what(sel) : 'Click a machine to see what it runs. Drag one to move it.'}</p>
      <div className="row">
        <Switch label="Second server" checked={second} onChange={setSecond} />
        <Switch label="Load balancer" checked={balanced} onChange={setBalanced} />
      </div>
    </>
  );
}
