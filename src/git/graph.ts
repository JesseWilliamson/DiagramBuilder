/**
 * Git commit graphs: one row per commit (newest at the top, as `git log`
 * prints them), one column ("lane") per line of history, curved edges where
 * history forks and joins, and branch / tag labels beside the commits.
 *
 * Lanes come from one walk down the list, carrying `lanes`: lanes[i] is the
 * commit the line in column i is travelling down to meet (null = free).
 * For each commit:
 *   1. Every lane waiting for it ends here; the leftmost becomes its column.
 *      If none is waiting it is a branch tip: it takes the first free column.
 *   2. Its FIRST parent inherits its column, so a branch's own history runs
 *      straight down (and a branch made on top of another continues its line).
 *   3. Each further parent (a merge) joins a lane already waiting for that
 *      parent, or opens a new lane in the first free column.
 * This is the same first-parent rule GitGoose's graph uses (without its
 * reserved trunk and HEAD columns), so pictures drawn here match the app.
 *
 * Every edge remembers the lane it travels down. It leaves its child and
 * curves into that lane within one row, runs straight down, and curves into
 * its parent's column in the last row. Edges are keyed by child and parent,
 * commits by hash, so a "before / after" pair of pictures (a rebase, a merge)
 * animates: commits that survive stay put or slide, new ones fade in.
 */
import { Scene, SceneNode, Tone, circle, estimateTextWidth, path, rect, text } from '../scene';
import { V2, Vec } from '../vec';

export interface Commit {
  hash: string;
  /** First parent first, as git stores them. Parents not in the list are drawn as a short stub. */
  parents: readonly string[];
  /** Text beside the commit: a subject line, or a short hash. */
  label?: string;
  /** Overrides the lane's colour for this commit's dot. */
  tone?: Tone;
}

export interface Ref {
  name: string;
  hash: string;
  /** 'branch' (local), 'remote', 'tag' or 'head' (HEAD itself). Decides the label's role. */
  kind: 'branch' | 'remote' | 'tag' | 'head';
}

export interface GitGraphOptions {
  id?: string;
  /** Commits to emphasise; every other commit and edge is dimmed. */
  highlight?: Iterable<string>;
  /** Row height. Default 34. */
  rowH?: number;
  /** Column width. Default 22. */
  laneW?: number;
  /** Commit dot radius. Default 6. */
  r?: number;
  /** Top-left of the graph. */
  x?: number;
  y?: number;
  /** Tones the lanes cycle through, left to right. */
  tones?: readonly Tone[];
}

export interface LanePlacement {
  hash: string;
  row: number;
  lane: number;
  /** One per parent, in order: the lane the edge travels down, and the parent's row (-1 if not listed). */
  edges: { parent: string; lane: number; row: number }[];
}

export interface GitGraph extends Scene {
  /** Centre of a commit's dot. */
  pos(hash: string): Vec;
  lane(hash: string): number;
  row(hash: string): number;
  /** How many columns the graph uses. */
  lanes: number;
  /** x where the labels column starts (right of every lane). */
  labelX: number;
}

/** The lane walk on its own: pure, so it is easy to test and to reuse. */
export function gitLanes(commits: readonly Commit[]): LanePlacement[] {
  const rowOf = new Map(commits.map((c, i) => [c.hash, i]));
  const lanes: (string | null)[] = [];
  const free = (exclude = -1) => {
    for (let i = 0; i < lanes.length; i++) if (lanes[i] === null && i !== exclude) return i;
    return lanes.length;
  };
  return commits.map((c, row) => {
    const incoming: number[] = [];
    lanes.forEach((h, i) => h === c.hash && incoming.push(i));
    const lane = incoming.length ? incoming[0] : free();
    for (const i of incoming) lanes[i] = null;
    const edges: LanePlacement['edges'] = [];
    c.parents.forEach((p, k) => {
      let target: number;
      if (k === 0) target = lane;
      else {
        target = lanes.indexOf(p);
        if (target < 0) target = free(lane);
      }
      lanes[target] = p;
      edges.push({ parent: p, lane: target, row: rowOf.get(p) ?? -1 });
    });
    // free columns at the right edge are dropped, so the graph narrows after a merge
    while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop();
    return { hash: c.hash, row, lane, edges };
  });
}

const DEFAULT_TONES: Tone[] = ['accent', 'success', 'visited', 'orange', 'danger', 'active'];

/** Points along a vertical S-curve from a to b (a cubic with vertical tangents at both ends). */
function sCurve(a: Vec, b: Vec, n = 10): [number, number][] {
  const my = (a.y + b.y) / 2;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    // control points (a.x, my) and (b.x, my)
    const x = u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x;
    const y = u * u * u * a.y + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * b.y;
    return [x, y];
  });
}

export function graph(commits: readonly Commit[], refs: readonly Ref[] = [], o: GitGraphOptions = {}): GitGraph {
  const id = o.id ?? 'git';
  const rowH = o.rowH ?? 34, laneW = o.laneW ?? 22, r = o.r ?? 6;
  const x0 = (o.x ?? 0) + laneW / 2, y0 = (o.y ?? 0) + rowH / 2;
  const tones = o.tones?.length ? o.tones : DEFAULT_TONES;
  const toneOf = (lane: number) => tones[lane % tones.length];
  const hi = o.highlight ? new Set(o.highlight) : null;
  const dim = (...hashes: string[]) => (hi && !hashes.every((h) => hi.has(h)) ? 0.3 : undefined);

  const placed = gitLanes(commits);
  const byHash = new Map(placed.map((p) => [p.hash, p]));
  const X = (lane: number) => x0 + lane * laneW;
  const Y = (row: number) => y0 + row * rowH;
  const lanes = Math.max(0, ...placed.flatMap((p) => [p.lane + 1, ...p.edges.map((e) => e.lane + 1)]));
  const labelX = (o.x ?? 0) + lanes * laneW + 10;

  const edges: SceneNode[] = [];
  const dots: SceneNode[] = [];
  const labels: SceneNode[] = [];
  for (const p of placed) {
    const at = V2(X(p.lane), Y(p.row));
    for (const e of p.edges) {
      const k = `${id}:edge:${p.hash}-${e.parent}`;
      const tone = toneOf(e.lane);
      // a parent outside the list: a short stub down its lane
      const endRow = e.row < 0 ? p.row + 0.6 : e.row;
      const end = V2(X(e.row < 0 ? e.lane : byHash.get(e.parent)!.lane), Y(endRow));
      let pts: [number, number][];
      if (endRow - p.row <= 1) {
        pts = at.x === end.x ? [[at.x, at.y], [end.x, end.y]] : sCurve(at, end);
      } else {
        // leave into the travel lane within the first row, run down it, join the parent in the last row
        const top = V2(X(e.lane), Y(p.row + 1)), bottom = V2(X(e.lane), Y(endRow - 1));
        pts = [
          ...(at.x === top.x ? [[at.x, at.y] as [number, number]] : sCurve(at, top)),
          ...(bottom.y > top.y ? [[bottom.x, bottom.y] as [number, number]] : []),
          ...(bottom.x === end.x ? [[end.x, end.y] as [number, number]] : sCurve(bottom, end).slice(1)),
        ];
      }
      edges.push(path({ id: k, points: pts, role: 'git-edge', tone, dashed: e.row < 0, opacity: dim(p.hash, e.parent) }));
    }
    const c = commits[p.row];
    const merge = c.parents.length > 1;
    if (hi?.has(p.hash)) dots.push(circle({ id: `${id}:halo:${p.hash}`, x: at.x, y: at.y, r: r + 5, role: 'git-halo', tone: c.tone ?? toneOf(p.lane) }));
    dots.push(circle({ id: `${id}:commit:${p.hash}`, x: at.x, y: at.y, r, role: merge ? 'git-merge' : 'git-commit', tone: c.tone ?? toneOf(p.lane), opacity: dim(p.hash), data: { hash: p.hash } }));
  }

  // labels: ref pills first, then the commit's own text, in one row to the right of every lane
  for (const p of placed) {
    let x = labelX;
    const y = Y(p.row);
    const c = commits[p.row];
    for (const ref of refs.filter((f) => f.hash === p.hash)) {
      const k = `${id}:ref:${ref.name}`;
      const w = estimateTextWidth(ref.name, 11) + 14;
      const tone = ref.kind === 'tag' ? 'muted' : toneOf(p.lane);
      labels.push(
        rect({ id: k, x: x + w / 2, y, w, h: 18, rx: ref.kind === 'tag' ? 3 : 9, role: `git-ref-${ref.kind}`, tone, opacity: dim(p.hash) }),
        text({ id: `${k}:label`, x: x + w / 2, y, text: ref.name, size: 11, role: 'git-ref-label', tone, opacity: dim(p.hash) }),
      );
      x += w + 6;
    }
    if (c.label) labels.push(text({ id: `${id}:label:${p.hash}`, x, y, text: c.label, size: 12.5, anchor: 'start', role: 'git-label', opacity: dim(p.hash) }));
  }

  const get = (h: string) => byHash.get(h);
  return {
    nodes: [...edges, ...dots, ...labels],
    pos: (h) => (get(h) ? V2(X(get(h)!.lane), Y(get(h)!.row)) : V2(x0, y0)),
    lane: (h) => get(h)?.lane ?? -1,
    row: (h) => get(h)?.row ?? -1,
    lanes,
    labelX,
  };
}
