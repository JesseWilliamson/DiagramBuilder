// Range search. Drag the red box (or its corner). The search starts at the
// root and only opens a node when its box overlaps the range; every other node
// is skipped whole with one rectangle test (dashed purple). Only the points in
// the opened leaves are checked one by one. The tree shows just the part the
// search touched.
import { useRef, useState } from 'react';
import { combine, handle, rect, spatial, text } from 'dsviz';
import { Diagram, NumberStepper } from 'dsviz/react';

const S = 300;
const BOUNDS = { x: 0, y: 0, w: S, h: S };

// Seeded random points in two clusters plus some background, so the tree is
// deep in places and shallow in others (like real data: cities, not desert).
function makePoints(): spatial.QuadPoint[] {
  let s = 42;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const near = (cx: number, cy: number, spread: number) => ({ x: cx + (rnd() - 0.5) * spread, y: cy + (rnd() - 0.5) * spread });
  return Array.from({ length: 90 }, (_, i) => {
    const p = i < 35 ? near(80, 90, 90) : i < 60 ? near(220, 210, 70) : near(150, 150, 290);
    return { id: `p${i}`, x: Math.max(2, Math.min(S - 2, p.x)), y: Math.max(2, Math.min(S - 2, p.y)) };
  });
}
const POINTS = makePoints();

export default function QuadtreeQuery() {
  const [range, setRange] = useState({ x: 150, y: 40, w: 80, h: 60 });
  const [capacity, setCapacity] = useState(4);
  const grab = useRef({ dx: 0, dy: 0 });
  const tree = spatial.buildQuadtree(POINTS, BOUNDS, { capacity });
  const q = spatial.queryRange(tree, range);
  const found = new Set(q.found), checked = new Set(q.checked);

  // The search's footprint: the tree cut off below every node it skipped.
  const trim = (n: spatial.QuadNode): spatial.QuadNode => ({ ...n, children: q.visited.has(n.path) && n.children ? n.children.map(trim) : null });
  const footprint = trim(tree);
  const ends = spatial.quadNodes(footprint).filter((n) => !n.children && n.points.length);
  const drawn = spatial.quadtreeTree(footprint, {
    x: S + 40, width: 340, r: 7, dy: 56, leafLabels: false,
    tone: (n) => (q.visited.has(n.path) ? 'accent' : 'visited'),
    edgeTone: (n) => (q.visited.has(n.path) ? 'accent' : 'visited'),
  });
  const big = [...q.pruned].filter((p) => spatial.nodeAt(tree, p)?.children);

  const scene = combine(
    spatial.quadtreeCells(tree, {
      tone: (n) => (q.visited.has(n.path) ? 'accent' : 'muted'),
      outline: big, outlineTone: 'visited',
      pointTone: (p) => (found.has(p) ? 'success' : checked.has(p) ? 'danger' : undefined),
      r: 3,
    }),
    rect({ id: 'range', x: range.x + range.w / 2, y: range.y + range.h / 2, w: range.w, h: range.h, role: 'viewport', draggable: true }),
    handle({ id: 'corner', x: range.x + range.w, y: range.y + range.h, r: 6, tone: 'danger' }),
    drawn,
    // under each end of the footprint: how many points it holds (checked if blue, skipped if purple)
    ends.map((n) => {
      const p = drawn.pos(n.path)!;
      return text({ id: `n:${n.path}`, x: p.x, y: p.y + 18, text: String(n.points.length), size: 11, role: 'label', tone: q.visited.has(n.path) ? 'accent' : 'visited' });
    }),
    text({ id: 'fp', x: S + 210, y: S + 4, text: 'the search: blue opened, purple skipped (with its point count)', size: 11.5, role: 'caption' }),
  );

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return (
    <>
      <Diagram
        scene={scene}
        viewBox={[-10, -10, S + 400, S + 20]}
        onDragStart={(e) => e.id === 'range' && (grab.current = { dx: e.x - range.x, dy: e.y - range.y })}
        onDrag={(e) => {
          if (e.id === 'range') setRange({ ...range, x: clamp(e.x - grab.current.dx, 0, S - range.w), y: clamp(e.y - grab.current.dy, 0, S - range.h) });
          if (e.id === 'corner') setRange({ ...range, w: clamp(e.x - range.x, 10, S - range.x), h: clamp(e.y - range.y, 10, S - range.y) });
        }}
      />
      <div className="stats">
        <span className="tone-success">found <b>{q.found.length}</b></span>
        <span className="tone-danger">checked but outside <b>{q.checked.length - q.found.length}</b></span>
        <span>points checked <b>{q.checked.length}</b> of {POINTS.length}</span>
        <span>boxes opened <b>{q.visited.size}</b></span>
        <span className="tone-visited">boxes skipped whole <b>{q.pruned.size}</b></span>
      </div>
      <div className="row">
        <NumberStepper label="Capacity" value={capacity} onChange={setCapacity} min={1} max={10} />
      </div>
      <p className="hint">A linear scan checks all {POINTS.length} points every time. Make the box tiny: how many does the tree check? What happens when the box covers everything?</p>
    </>
  );
}
