// Map tiles are a quadtree. Click a tile to zoom into it: it splits into four,
// exactly like a quadtree cell. Its quadkey is its quadtree path, and you get
// it by reading x and y in binary and combining one bit of each per level:
// digit = x bit + 2 × y bit. So z/x/y and the quadkey are the same address.
import { useState } from 'react';
import { array, circle, combine, path, spatial, text } from 'dsviz';
import { Button, Diagram, Segmented } from 'dsviz/react';

const S = 300;
const BX = S + 70; // where the bits panel starts
const CITIES = [[-0.13, 51.51], [-74.01, 40.71], [139.69, 35.69], [151.21, -33.87], [-43.17, -22.91], [18.42, -33.92], [103.82, 1.35], [31.24, 30.04]]
  .map(([lon, lat]) => spatial.project(lon, lat));

export default function TilePyramid() {
  const [q, setQ] = useState('1'); // the selected tile's quadkey
  const [labels, setLabels] = useState<'quadkey' | 'zxy'>('quadkey');
  const t = spatial.fromQuadkey(q);

  // What's on screen: at every level along the path, the three siblings we
  // didn't go into, plus the selected tile's four children.
  const tiles = [
    ...Array.from(q, (_, k) => spatial.childTiles(spatial.fromQuadkey(q.slice(0, k))).filter((c) => spatial.quadkey(c) !== q.slice(0, k + 1))).flat(),
    ...spatial.childTiles(t),
  ];
  const b = spatial.tileBox(t);
  const sel = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]].map(([x, y]) => [x * S, y * S] as const);

  // bits, most significant first: column i is zoom level i + 1
  const bits = (v: number) => Array.from({ length: t.z }, (_, i) => (v >> (t.z - 1 - i)) & 1);
  const xs = bits(t.x), ys = bits(t.y);
  const row = (label: string, values: (number | string)[], y: number, id: string, tone: string) => [
    text({ id: `${id}:l`, x: BX - 10, y: y + 15, text: label, size: 13, role: 'code', anchor: 'end' }),
    array(values, { id, x: BX, y, cell: 30, gap: 4, showIndices: false, tones: () => tone }),
  ];

  const scene = combine(
    spatial.tileGrid(tiles, { size: S, labels, labelMin: 30, interactive: true, tone: (c) => (spatial.parentTile(c) && spatial.quadkey(spatial.parentTile(c)!) === q ? 'accent' : undefined) }),
    spatial.graticule({ size: S, lonStep: 360, lats: [-60, 0, 60] }), // parallels only: meridians would look like tile edges,
    CITIES.map((c, i) => circle({ id: `city${i}`, x: c.x * S, y: c.y * S, r: 2.5, role: 'dot', tone: 'danger' })),
    path({ id: 'sel', points: sel, closed: true, role: 'tile-outline', tone: 'danger' }),
    // the bits panel
    text({ id: 'zxy', x: BX, y: 0, text: `tile ${spatial.tileKey(t)}`, size: 15, role: 'code', anchor: 'start' }),
    row(`x = ${t.x}`, xs, 30, 'xb', 'accent'),
    row(`y = ${t.y}`, ys, 72, 'yb', 'orange'),
    row('quadkey', q.split(''), 126, 'qk', 'visited'),
    xs.map((_, i) => text({ id: `sum${i}`, x: BX + i * 34 + 15, y: 172, text: `${xs[i]}+2·${ys[i]}`, size: 10, role: 'index' })),
    text({ id: 'rule', x: BX, y: 200, text: 'each digit = x bit + 2 × y bit', size: 12, role: 'caption', anchor: 'start' }),
    text({ id: 'rule2', x: BX, y: 218, text: '0 NW · 1 NE · 2 SW · 3 SE', size: 12, role: 'caption', anchor: 'start' }),
  );

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={[-40, -10, BX + 6 * 34 + 60, S + 20]}
        onClick={(e) => {
          const tile = e.node.data as spatial.Tile | undefined; // tileGrid puts the Tile on each rect
          if (tile && tile.z <= 6) setQ(spatial.quadkey(tile));
        }}
      />
      <p className="status">
        Zoom {t.z}: {(4 ** t.z).toLocaleString()} tiles in the world. This one is{' '}
        <code>tile.openstreetmap.org/{spatial.tileKey(t)}.png</code> on OpenStreetMap and quadkey <code>{q}</code> on Bing.
      </p>
      <div className="row">
        <Button onClick={() => setQ(q.slice(0, -1))} disabled={q.length <= 1}>Zoom out</Button>
        <Segmented value={labels} onChange={setLabels} options={[{ value: 'quadkey', label: 'Quadkeys' }, { value: 'zxy', label: 'z/x/y' }]} />
      </div>
      <p className="hint">Two tiles whose quadkeys share a prefix are inside the same bigger tile. Why does that make quadkeys handy as database keys?</p>
    </>
  );
}
