// Where the shop runs. Nodes are machines and runtimes (the 3D boxes); artifacts are the files
// deployed on them. Switch on a second server and a load balancer: nodes keep their ids, so the
// ones already there slide over to make room instead of redrawing. Click a node to read what it runs.
import { useState } from 'react';
import { fitViewBox } from 'dsviz';
import { Diagram, Switch } from 'dsviz/react';
import { Artifact, DeployLink, DeployNode, deployment } from 'dsviz/uml';

// Four rows, top to bottom: the client, the balancer's row (empty until it is switched on, so
// nothing else has to move), the servers, the database. x/y are front-face centres.
const ROW = { client: 0, lb: 100, server: 249, db: 414 };

function model(balanced: boolean, second: boolean) {
  const servers = second ? ['s1', 's2'] : ['s1'];
  const nodes: DeployNode[] = [
    { id: 'client', name: 'Laptop', stereotype: 'device', x: 0, y: ROW.client },
    ...(balanced ? [{ id: 'lb', name: 'Load balancer', stereotype: 'device', x: 0, y: ROW.lb }] : []),
    ...servers.flatMap((s, i) => [
      { id: s, name: `Server ${i + 1}`, stereotype: 'device', x: second ? (i ? 133 : -133) : 0, y: ROW.server },
      { id: `jvm-${s}`, name: 'JVM', stereotype: 'executionEnvironment', parent: s },
    ]),
    { id: 'db', name: 'Database host', stereotype: 'device', x: 0, y: ROW.db },
  ];
  const artifacts: Artifact[] = [
    ...servers.flatMap((s) => [
      { id: `war-${s}`, name: 'shop.war', node: `jvm-${s}` },
      { id: `cfg-${s}`, name: 'app.yml', node: `jvm-${s}` },
    ]),
    { id: 'data', name: 'shop.db', node: 'db' },
  ];
  const front = balanced ? ['lb'] : servers;
  const links: DeployLink[] = [
    ...front.map((f) => ({ from: 'client', to: f, protocol: 'HTTPS' })),
    ...(balanced ? servers.map((s) => ({ from: 'lb', to: s, protocol: 'HTTP' })) : []),
    ...servers.map((s) => ({ from: s, to: 'db', protocol: 'JDBC' })),
  ];
  return { nodes, artifacts, links };
}

// One camera over every state the switches can produce, so toggling never jumps.
const states = [false, true].flatMap((b) => [false, true].map((s) => model(b, s)));
const viewBox = fitViewBox(states.map((m) => deployment(m.nodes, m.artifacts, m.links)), 12);

const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);

export default function Deployment() {
  const [balanced, setBalanced] = useState(false);
  const [second, setSecond] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

  const m = model(balanced, second);
  const nodes = m.nodes.map((n) => ({ ...n, tone: n.id === sel ? ('active' as const) : undefined }));
  const links = m.links.map((l) => ({ ...l, tone: l.from === sel || l.to === sel ? ('active' as const) : undefined }));
  const diagram = deployment(nodes, m.artifacts, links, { interactive: true });

  const name = (id: string) => m.nodes.find((x) => x.id === id)?.name ?? id;
  // "Server 1 («device») runs a JVM; talks «HTTP» with Load balancer and «JDBC» with Database host."
  const what = (id: string) => {
    const n = m.nodes.find((x) => x.id === id);
    if (n) {
      const inside = m.nodes.filter((k) => k.parent === id).map((k) => `a ${k.name}`);
      const hosts = m.artifacts.filter((a) => a.node === id).map((a) => a.name);
      const peers = m.links.filter((l) => l.from === id || l.to === id).map((l) => `«${l.protocol}» with ${name(l.from === id ? l.to : l.from)}`);
      const does = [inside.length && `runs ${list(inside)}`, hosts.length && `hosts ${list(hosts)}`].filter(Boolean).join(' and ');
      const where = n.parent ? ` inside ${name(n.parent)}` : '';
      return `${n.name} («${n.stereotype}») ${does || 'runs nothing yet'}${where}${peers.length ? `; talks ${list(peers)}` : ''}.`;
    }
    const a = m.artifacts.find((x) => x.id === id);
    const host = a && m.nodes.find((x) => x.id === a.node);
    return a && host ? `${a.name} is deployed on the ${host.name}${host.parent ? ` of ${name(host.parent)}` : ''}.` : '';
  };

  return (
    <>
      <Diagram
        scene={diagram}
        viewBox={viewBox}
        onClick={(e) => {
          const d = e.node.data as { node?: string; artifact?: string } | undefined;
          const id = d?.node ?? d?.artifact;
          if (id) setSel((s) => (s === id ? null : id));
        }}
      />
      <p className="status">{sel && what(sel) ? what(sel) : 'Click a machine or a file to see what runs where.'}</p>
      <div className="row">
        <Switch label="Second server" checked={second} onChange={setSecond} />
        <Switch label="Load balancer" checked={balanced} onChange={setBalanced} />
      </div>
    </>
  );
}
