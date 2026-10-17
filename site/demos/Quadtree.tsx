// Building a quadtree. Click the square to drop a point. When a cell holds more
// than `capacity` points it splits into four quadrants (NW NE / SW SE) and its
// points move down. The tree on the right is the same structure: each cell is a
// leaf, and a node's path (one digit per level) is its address.
import { useState } from 'react';
import { combine, rect, spatial, text } from 'dsviz';
import { Button, Diagram, NumberStepper } from 'dsviz/react';

const S = 300; // side of the square
const BOUNDS = { x: 0, y: 0, w: S, h: S };
const NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const START: spatial.QuadPoint[] = [
  { id: 'A', x: 70, y: 60 }, { id: 'B', x: 230, y: 90 }, { id: 'C', x: 200, y: 240 },
  { id: 'D', x: 250, y: 200 }, { id: 'E', x: 40, y: 220 },
];

export default function Quadtree() {
  const [points, setPoints] = useState(START);
  const [capacity, setCapacity] = useState(1);
  const tree = spatial.buildQuadtree(points, BOUNDS, { capacity, maxDepth: 6 });
  const last = points.at(-1);
  const leaf = last && spatial.leafAt(tree, last);
  // the root-to-leaf path of the newest point, e.g. '' '1' '13' '132'
  const onPath = (p: string) => !!leaf && leaf.path.startsWith(p);

  const add = (x: number, y: number) => {
    if (points.length >= NAMES.length) return;
    setPoints([...points, { id: NAMES[points.length], x, y }]);
  };
  const random = () => add(10 + Math.random() * (S - 20), 10 + Math.random() * (S - 20));

  const leaves = spatial.quadNodes(tree).filter((n) => !n.children).length;
  const slot = 330 / leaves;
  const scene = combine(
    spatial.quadtreeCells(tree, {
      tone: (n) => (n === leaf ? 'active' : undefined),
      pointTone: (p) => (p === last ? 'danger' : undefined),
      pointLabels: true,
    }),
    // a click target over the square, so a click anywhere adds a point
    rect({ id: 'hit', x: S / 2, y: S / 2, w: S, h: S, role: 'hit', interactive: true }),
    spatial.quadtreeTree(tree, {
      x: S + 40, width: 330, r: Math.max(3, Math.min(8, slot * 0.4)),
      tone: (n) => (onPath(n.path) ? 'active' : undefined),
      edgeTone: (n) => (onPath(n.path) ? 'active' : undefined),
      leafLabels: slot >= 11,
    }),
    text({ id: 'cap', x: S / 2, y: S + 18, text: `capacity ${capacity} · ${points.length} points · ${leaves} cells`, size: 12, role: 'caption' }),
  );

  // Describe the newest insert: the path it took, and whether it caused a split.
  let status = 'Click the square to add a point.';
  if (last && leaf) {
    const before = spatial.buildQuadtree(points.slice(0, -1), BOUNDS, { capacity, maxDepth: 6 });
    const was = spatial.leafAt(before, last).path;
    const route = leaf.path.split('').map((d) => spatial.QUADRANT_NAMES[+d]).join(' → ') || 'the root';
    const splits = leaf.path.length - was.length;
    status = `${last.id} went ${route} (path "${leaf.path}").` +
      (splits > 0
        ? ` Cell "${was}" now held ${capacity + 1} points, more than the capacity, so it split${splits > 1 ? ` ${splits} times, until the points were apart` : ''}.`
        : ' Its cell had room, so nothing split.');
  }

  return (
    <>
      <Diagram scene={scene} viewBox={[-10, -10, S + 390, S + 40]} onClick={(e) => e.id === 'hit' && add(e.x, e.y)} />
      <p className="status">{status}</p>
      <div className="row">
        <Button variant="primary" onClick={random} disabled={points.length >= NAMES.length}>Random point</Button>
        <Button onClick={() => setPoints(points.slice(0, -1))} disabled={!points.length}>Undo</Button>
        <Button onClick={() => setPoints([])}>Clear</Button>
        <NumberStepper label="Capacity" value={capacity} onChange={setCapacity} min={1} max={4} />
      </div>
      <p className="hint">Put three points close together. Why does the tree get deep there and stay shallow everywhere else?</p>
    </>
  );
}
