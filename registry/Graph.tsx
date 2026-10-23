// BFS and DFS on a graph you can drag. Positions are ordinary state: dragging
// writes a new position and the edges recompute around it.
import { useState } from 'react';
import { combine, text, V2 } from '@figurae/core';
import { array, graph } from '@figurae/ds';
import { Diagram, Segmented, Transport, usePlayer } from '@figurae/react';

type Id = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
const start: Record<Id, [number, number]> = {
  A: [-150, -100], B: [0, -125], C: [150, -100], D: [-185, 15], E: [-45, -5],
  F: [105, 10], G: [190, 95], H: [-110, 110], I: [40, 115],
};
const edges: [Id, Id][] = [['A', 'B'], ['A', 'D'], ['B', 'C'], ['B', 'E'], ['C', 'F'], ['D', 'E'], ['D', 'H'], ['E', 'F'], ['E', 'I'], ['F', 'G'], ['H', 'I'], ['I', 'G']];
const adj = {} as Record<Id, Id[]>;
for (const [u, v] of edges) (adj[u] ??= []).push(v), (adj[v] ??= []).push(u);
for (const k in adj) adj[k as Id].sort();

function* traverse(from: Id, mode: 'BFS' | 'DFS') {
  // Frontier items are keyed by a push counter, not the node name: DFS can push a node twice,
  // and two cells with the same id is the classic keyed-rendering bug.
  let pushes = 0;
  const frontier = [{ v: from, key: `p${pushes++}` }];
  const seen = new Set<Id>([from]);
  const done: Id[] = [];
  const tree: [Id, Id][] = [];
  const parent: Partial<Record<Id, [Id, Id]>> = {};
  const snap = (cur: Id | null, msg: string) => ({ frontier: [...frontier], done: [...done], tree: [...tree], cur, msg });
  yield snap(null, `start at ${from}`);
  while (frontier.length) {
    const { v } = mode === 'BFS' ? frontier.shift()! : frontier.pop()!;
    if (done.includes(v)) { yield snap(null, `${v} was already visited, skip`); continue; }
    if (mode === 'DFS') { seen.add(v); if (parent[v]) tree.push(parent[v]!); }
    yield snap(v, `${mode === 'BFS' ? 'dequeue' : 'pop'} ${v}`);
    for (const w of mode === 'BFS' ? adj[v] : [...adj[v]].reverse()) {
      if (seen.has(w)) continue;
      if (mode === 'BFS') { seen.add(w); tree.push([v, w]); } else parent[w] = [v, w];
      frontier.push({ v: w, key: `p${pushes++}` });
    }
    done.push(v);
    yield snap(v, `${mode === 'BFS' ? 'enqueue' : 'push'} unvisited neighbours of ${v}`);
  }
  yield snap(null, `done: ${done.join(' → ')}`);
}

export default function Graph() {
  const [pos, setPos] = useState(start);
  const [from, setFrom] = useState<Id>('A');
  const [mode, setMode] = useState<'BFS' | 'DFS'>('BFS');
  const player = usePlayer(() => traverse(from, mode), [from, mode], { interval: 650 });
  const f = player.frame!;

  const inFrontier = new Set(f.frontier.map((x) => x.v));
  const isTree = (u: Id, v: Id) => f.tree.some(([a, b]) => (a === u && b === v) || (a === v && b === u));
  const g = graph(
    (Object.keys(pos) as Id[]).map((id) => ({
      id, x: pos[id][0], y: pos[id][1],
      tone: id === f.cur ? 'active' : f.done.includes(id) ? 'visited' : inFrontier.has(id) ? 'accent' : undefined,
    })),
    edges.map(([u, v]) => ({ from: u, to: v, tone: isTree(u, v) ? 'visited' : undefined })),
    { draggable: true },
  );
  const row = array(f.frontier.map((x) => x.v), {
    id: 'frontier', keys: f.frontier.map((x) => x.key), x: -150, y: 168, cell: 30, gap: 4, showIndices: false,
    tones: (i) => (i === (mode === 'BFS' ? 0 : f.frontier.length - 1) ? 'accent' : undefined),
    enterOffset: V2(30, 0),
    exitOffset: mode === 'BFS' ? V2(-40, 0) : V2(30, -20),
  });
  const label = text({ id: 'frontier-label', x: -162, y: 183, text: mode === 'BFS' ? 'queue' : 'stack', size: 12, role: 'caption', anchor: 'end' });

  return (
    <>
      <Diagram
        scene={combine(g, row, label)}
        viewBox={[-240, -165, 480, 380]}
        onDrag={(e) => setPos((p) => ({ ...p, [(e.node.data as { id: Id }).id]: [e.x, e.y] }))}
        onClick={(e) => { const id = (e.node.data as { id?: Id } | undefined)?.id; if (id) setFrom(id); }}
      />
      <p className="status">{f.msg}</p>
      <Transport player={player} />
      <div className="row">
        <Segmented value={mode} onChange={setMode} options={['BFS', 'DFS']} />
        <p className="hint">Drag nodes around. Click one to start from it.</p>
      </div>
    </>
  );
}
