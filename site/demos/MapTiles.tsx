// How a web map decides which images to download. Left: the whole world as one
// Web Mercator square, cut into 2^z × 2^z tiles at zoom z. Right: your screen,
// 512 × 320 px. Only the tiles under the screen are fetched, and each is drawn
// at (tile × 256 − screen corner) px. Drag either side to pan; change the zoom.
import { useRef, useState } from 'react';
import { circle, combine, path, rect, spatial, text } from 'dsviz';
import { Diagram, NumberStepper } from 'dsviz/react';

const S = 300; // world square, in diagram px
const SW = 512, SH = 320; // the screen, in real px
const K = 0.4; // the screen is drawn at 40%
const TK = 256 * K; // a tile's side on the drawn screen
const SX = S + TK + 20, SY = (S - SH * K) / 2; // the screen's top-left, leaving room for tiles to hang over
const CITIES: [string, number, number][] = [
  ['London', -0.13, 51.51], ['New York', -74.01, 40.71], ['Tokyo', 139.69, 35.69], ['Sydney', 151.21, -33.87],
  ['Rio', -43.17, -22.91], ['Cape Town', 18.42, -33.92], ['Reykjavík', -21.94, 64.15], ['Singapore', 103.82, 1.35],
  ['Cairo', 31.24, 30.04], ['Los Angeles', -118.24, 34.05], ['Moscow', 37.62, 55.76], ['Anchorage', -149.9, 61.22],
].map(([n, lon, lat]) => [n as string, ...Object.values(spatial.project(lon as number, lat as number))] as [string, number, number]);

export default function MapTiles() {
  // `from` is the zoom we just came from, for the zoom animation
  const [{ z, from }, setZoom] = useState({ z: 2, from: 2 });
  const [c, setC] = useState(spatial.project(10, 45)); // map centre, world coords
  const grab = useRef({ x: 0, y: 0, c });

  const W = 256 * 2 ** z; // the world's width in screen px at this zoom
  // the screen's top-left corner in world px, and its box in world coords (0..1)
  const L = c.x * W - SW / 2, T = c.y * W - SH / 2;
  const view = { x: L / W, y: T / W, w: SW / W, h: SH / W };
  const tiles = spatial.tilesCovering(view, z);

  // Zoom animation: a new tile starts where its patch of the world WAS on screen
  // before the zoom (scaled about the screen centre), then grows/shrinks into place.
  const f = 2 ** (from - z);
  const cx = SX + (SW / 2) * K, cy = SY + (SH / 2) * K;
  const onScreen = (t: spatial.Tile) => {
    const x = SX + (t.x * 256 - L + 128) * K, y = SY + (t.y * 256 - T + 128) * K;
    return { x, y, enter: { x: cx + (x - cx) * f, y: cy + (y - cy) * f, w: TK * f, h: TK * f, opacity: 1 } };
  };

  const n = 2 ** z;
  const lines = Array.from({ length: n - 1 }, (_, i) => (i + 1) / n);
  const scene = combine(
    // ── the world ──
    rect({ id: 'world', x: S / 2, y: S / 2, w: S, h: S, role: 'tile' }),
    spatial.tileGrid(tiles, { size: S, tone: () => 'accent', labelMin: 52 }),
    lines.map((v) => [
      path({ id: `gx:${v}`, points: [[v * S, 0], [v * S, S]], role: 'grid' }),
      path({ id: `gy:${v}`, points: [[0, v * S], [S, v * S]], role: 'grid' }),
    ]),
    spatial.graticule({ size: S, lonStep: 60, lats: [-60, 0, 60] }),
    CITIES.map(([name, x, y]) => circle({ id: `w:${name}`, x: x * S, y: y * S, r: 2.5, role: 'dot' })),
    rect({ id: 'viewport', x: c.x * S, y: c.y * S, w: view.w * S, h: view.h * S, role: 'viewport', draggable: true }),
    text({ id: 'world:t', x: S / 2, y: S + 16, text: `zoom ${z}: ${n} × ${n} = ${n * n} tiles`, size: 12, role: 'caption' }),
    // ── the screen ──
    tiles.map((t) => {
      const k = spatial.tileKey(t), p = onScreen(t);
      return [
        rect({ id: `s:${k}`, x: p.x, y: p.y, w: TK, h: TK, role: 'tile', tone: 'accent', enter: p.enter }),
        text({ id: `s:${k}:t`, x: p.x - TK / 2 + 5, y: p.y - TK / 2 + 11, text: `${k}.png`, size: 10.5, role: 'code', tone: 'accent', anchor: 'start' }),
      ];
    }),
    CITIES.map(([name, x, y]) => {
      const px = SX + (x * W - L) * K, py = SY + (y * W - T) * K;
      if (px < SX || px > SX + SW * K || py < SY || py > SY + SH * K) return null;
      return [
        circle({ id: `s:${name}`, x: px, y: py, r: 3.5, role: 'dot', tone: 'danger' }),
        text({ id: `s:${name}:t`, x: px + 6, y: py - 7, text: name, size: 11, role: 'label', anchor: 'start' }),
      ];
    }),
    // a transparent drag target over the screen, then the screen's frame on top
    rect({ id: 'pan', x: cx, y: cy, w: SW * K, h: SH * K, role: 'hit', draggable: true }),
    rect({ id: 'screen', x: cx, y: cy, w: SW * K, h: SH * K, role: 'screen' }),
    text({ id: 'screen:t', x: cx, y: S + 16, text: `screen ${SW} × ${SH} px: ${tiles.length} tiles`, size: 12, role: 'caption' }),
  );

  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return (
    <>
      <Diagram
        scene={scene}
        viewBox={[-40, -20, SX + SW * K + TK + 50, S + 50]}
        duration={300}
        onDragStart={(e) => (grab.current = { x: e.x, y: e.y, c })}
        onDrag={(e) => {
          const g = grab.current;
          // dragging the viewport moves it with the pointer; dragging the screen moves the map the OTHER way
          const k = e.id === 'viewport' ? 1 / S : -1 / (W * K);
          if (e.id !== 'viewport' && e.id !== 'pan') return;
          setZoom({ z, from: z });
          setC({ x: clamp(g.c.x + (e.x - g.x) * k), y: clamp(g.c.y + (e.y - g.y) * k) });
        }}
      />
      <div className="row">
        <NumberStepper label="Zoom" value={z} onChange={(v) => setZoom({ z: v, from: z })} min={1} max={7} />
      </div>
      <div className="stats">
        {tiles.slice(0, 4).map((t) => <span key={spatial.tileKey(t)}>{spatial.tileUrl('tile.openstreetmap.org/{z}/{x}/{y}.png', t)}</span>)}
        {tiles.length > 4 && <span>… and {tiles.length - 4} more</span>}
      </div>
      <p className="hint">Zoom in from 1 to 7. The world grows from 4 tiles to 16,384, but how many does the screen need each time? Why do tiles hang over the screen's edge?</p>
    </>
  );
}
