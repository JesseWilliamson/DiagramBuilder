/**
 * Web map tiles ("slippy maps": OpenStreetMap, Google, Mapbox…).
 *
 * 1. Project the globe onto a square with Web Mercator. We use "world
 *    coordinates" in [0, 1): x = 0 at 180°W, y = 0 at the top (≈85.05°N, the
 *    latitude where the Mercator map becomes exactly square).
 * 2. At zoom z, cut the square into 2^z × 2^z tiles of 256 px. Tile (x, y) is
 *    column x, row y, and its image lives at `…/{z}/{x}/{y}.png`.
 * 3. Each zoom level splits every tile into four, so the tiles form a quadtree.
 *    The quadkey (Bing Maps) is the tile's quadtree path: one digit per level,
 *    digit = (bit of x) + 2 × (bit of y), reading x and y from the top bit down.
 *
 * Layouts take a `size`: how many pixels the whole world square is drawn at.
 */
import { Box, Scene, SceneNode, Tone, path, rect, text } from '../scene';

export interface Tile {
  z: number;
  x: number;
  y: number;
}

/** Latitude where Web Mercator is cut off so the world is a square. */
export const MAX_LAT = (Math.atan(Math.sinh(Math.PI)) * 180) / Math.PI; // 85.0511…

/** Pixels per tile edge in every common tile scheme. */
export const TILE_SIZE = 256;

/** Longitude / latitude (degrees) → world coordinates in [0, 1]. */
export function project(lon: number, lat: number): { x: number; y: number } {
  const φ = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return { x: (lon + 180) / 360, y: (1 - Math.log(Math.tan(Math.PI / 4 + φ / 2)) / Math.PI) / 2 };
}

/** World coordinates → longitude / latitude (degrees). */
export function unproject(x: number, y: number): { lon: number; lat: number } {
  return { lon: x * 360 - 180, lat: (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI };
}

/** The tile at zoom z containing a world point. */
export function tileAtWorld(x: number, y: number, z: number): Tile {
  const n = 2 ** z, c = (v: number) => Math.max(0, Math.min(n - 1, Math.floor(v * n)));
  return { z, x: c(x), y: c(y) };
}

/** The tile at zoom z containing a longitude / latitude. */
export function tileAt(lon: number, lat: number, z: number): Tile {
  const p = project(lon, lat);
  return tileAtWorld(p.x, p.y, z);
}

/** A tile's square in world coordinates. */
export function tileBox(t: Tile): Box {
  const s = 1 / 2 ** t.z;
  return { x: t.x * s, y: t.y * s, w: s, h: s };
}

export const tileKey = (t: Tile) => `${t.z}/${t.x}/${t.y}`;
export const parentTile = (t: Tile): Tile | null => (t.z ? { z: t.z - 1, x: t.x >> 1, y: t.y >> 1 } : null);
export const childTiles = (t: Tile): Tile[] =>
  [0, 1, 2, 3].map((d) => ({ z: t.z + 1, x: 2 * t.x + (d & 1), y: 2 * t.y + (d >> 1) }));

/** z/x/y → quadkey. One digit per level, top bit first: digit = xbit + 2·ybit. */
export function quadkey(t: Tile): string {
  let q = '';
  for (let i = t.z - 1; i >= 0; i--) q += ((t.x >> i) & 1) + 2 * ((t.y >> i) & 1);
  return q;
}

/** quadkey → z/x/y (the reverse: peel each digit back into one bit of x and of y). */
export function fromQuadkey(q: string): Tile {
  let x = 0, y = 0;
  for (const d of q) {
    x = 2 * x + (+d & 1);
    y = 2 * y + (+d >> 1);
  }
  return { z: q.length, x, y };
}

/** Every tile at zoom z that overlaps a world-coordinate box (clipped to the world). */
export function tilesCovering(box: Box, z: number): Tile[] {
  const n = 2 ** z, eps = 1e-12;
  const a = tileAtWorld(box.x, box.y, z);
  const b = tileAtWorld(Math.min(1, box.x + box.w) - eps, Math.min(1, box.y + box.h) - eps, z);
  const out: Tile[] = [];
  for (let y = a.y; y <= b.y && y < n; y++) for (let x = a.x; x <= b.x && x < n; x++) out.push({ z, x, y });
  return out;
}

/** Fill a URL template: tileUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png', t). Also knows {q} (quadkey). */
export const tileUrl = (template: string, t: Tile) =>
  template.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)).replace('{q}', quadkey(t));

// ── layouts ───────────────────────────────────────────────────────────────────

export interface TileGridOptions {
  id?: string;
  /** Top-left of the world square. */
  x?: number;
  y?: number;
  /** Side of the world square in px. Default 256 (zoom 0 at actual size). */
  size?: number;
  tone?: (t: Tile) => Tone | undefined;
  /** Label each tile 'z/x/y', with its quadkey, or not at all. Default 'zxy'. */
  labels?: 'zxy' | 'quadkey' | false;
  /** Hide labels on tiles smaller than this (px). Default 44. */
  labelMin?: number;
  interactive?: boolean;
}

/**
 * Draw some tiles (role 'tile', keyed by z/x/y). A tile enters from its
 * parent's square, so zooming in looks like each tile breaking into four.
 */
export function tileGrid(tiles: readonly Tile[], o: TileGridOptions = {}): Scene {
  const id = o.id ?? 'tiles';
  const x0 = o.x ?? 0, y0 = o.y ?? 0, S = o.size ?? TILE_SIZE;
  const labels = o.labels ?? 'zxy';
  const nodes: SceneNode[] = [];
  const px = (b: Box) => ({ x: x0 + (b.x + b.w / 2) * S, y: y0 + (b.y + b.h / 2) * S, w: b.w * S, h: b.h * S });
  for (const t of tiles) {
    const k = tileKey(t), r = px(tileBox(t)), p = parentTile(t);
    const tone = o.tone?.(t);
    nodes.push(rect({ id: `${id}:${k}`, ...r, role: 'tile', tone, interactive: o.interactive, data: t, enter: p ? { ...px(tileBox(p)), opacity: 1 } : undefined }));
    if (labels && r.w >= (o.labelMin ?? 44)) {
      const s = labels === 'zxy' ? k : quadkey(t) || '""';
      const size = Math.min(12, (r.w * 0.85) / (s.length * 0.6));
      nodes.push(text({ id: `${id}:${k}:t`, x: r.x, y: r.y, text: s, size, role: 'code', tone }));
    }
  }
  return { nodes };
}

export interface GraticuleOptions {
  id?: string;
  x?: number;
  y?: number;
  size?: number;
  /** Meridians every this many degrees. Default 30. */
  lonStep?: number;
  /** Parallels to draw (degrees). Default 0, ±30, ±60, ±80. */
  lats?: readonly number[];
  /** Label the parallels on the left edge. Default true. */
  labels?: boolean;
}

/**
 * Longitude / latitude lines on the Web Mercator square. The parallels are
 * evenly spaced in degrees but not on the map: they spread out towards the
 * poles, which is why Greenland looks the size of Africa.
 */
export function graticule(o: GraticuleOptions = {}): Scene {
  const id = o.id ?? 'grat';
  const x0 = o.x ?? 0, y0 = o.y ?? 0, S = o.size ?? TILE_SIZE;
  const step = o.lonStep ?? 30, lats = o.lats ?? [-80, -60, -30, 0, 30, 60, 80];
  const nodes: SceneNode[] = [];
  for (let lon = -180 + step; lon < 180; lon += step) {
    const x = x0 + project(lon, 0).x * S;
    nodes.push(path({ id: `${id}:lon:${lon}`, points: [[x, y0], [x, y0 + S]], role: 'grid' }));
  }
  for (const lat of lats) {
    const y = y0 + project(0, lat).y * S;
    nodes.push(path({ id: `${id}:lat:${lat}`, points: [[x0, y], [x0 + S, y]], role: lat ? 'grid' : 'guide' }));
    if (o.labels ?? true) nodes.push(text({ id: `${id}:lat:${lat}:t`, x: x0 - 5, y, text: `${Math.abs(lat)}°${lat > 0 ? 'N' : lat < 0 ? 'S' : ''}`, size: 10, role: 'index', anchor: 'end' }));
  }
  return { nodes };
}
