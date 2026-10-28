// Colour the map: click a region (node) to cycle its colour. Neighbours
// (connected nodes) must differ. Conflicts light up red as you go.
import { useState } from 'react';
import { combine, Tone } from 'dsviz';
import { graph } from 'dsviz/ds';
import { Button, Diagram, useBurst } from 'dsviz/react';

type Id = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
const pos: Record<Id, [number, number]> = {
  A: [-160, -80], B: [-40, -125], C: [90, -95], D: [190, 5], E: [-170, 45],
  F: [-35, -5], G: [85, 45], H: [-60, 120], I: [130, 135],
};
const edges: [Id, Id][] = [
  ['A', 'B'], ['A', 'E'], ['A', 'F'], ['B', 'F'], ['B', 'C'], ['C', 'F'], ['C', 'G'], ['C', 'D'],
  ['D', 'G'], ['D', 'I'], ['E', 'F'], ['E', 'H'], ['F', 'G'], ['F', 'H'], ['G', 'H'], ['G', 'I'],
];
const palette: Tone[] = ['accent', 'active', 'success', 'visited']; // colour 1..4
const ids = Object.keys(pos) as Id[];

export default function GraphColoring() {
  const [colour, setColour] = useState<Partial<Record<Id, number>>>({});
  const [particles, fire] = useBurst();

  const clash = (u: Id, v: Id) => colour[u] !== undefined && colour[u] === colour[v];
  const conflicts = edges.filter(([u, v]) => clash(u, v)).length;
  const allColoured = ids.every((id) => colour[id] !== undefined);
  const used = new Set(Object.values(colour)).size;
  const solved = allColoured && conflicts === 0;

  const g = graph(
    ids.map((id) => ({ id, x: pos[id][0], y: pos[id][1], tone: colour[id] === undefined ? undefined : palette[colour[id]!] })),
    edges.map(([u, v]) => ({ from: u, to: v, tone: clash(u, v) ? 'danger' : undefined })),
    { interactive: true, r: 20 },
  );

  return (
    <>
      <Diagram
        scene={combine(g, particles)}
        viewBox={[-215, -160, 440, 330]}
        onClick={(e) => {
          const id = (e.node.data as { id?: Id } | undefined)?.id;
          if (!id) return;
          setColour((c) => ({ ...c, [id]: ((c[id] ?? -1) + 1) % palette.length }));
        }}
      />
      <div className="row spread">
        <p className="status">
          {solved ? `Solved with ${used} colours.` : conflicts ? `${conflicts} clash${conflicts > 1 ? 'es' : ''}: two neighbours share a colour.` : 'Click a node to colour it.'}
        </p>
        <Button onClick={() => setColour({})}>Clear</Button>
      </div>
    </>
  );
}
