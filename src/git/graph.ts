/**
 * Git commit graphs: one row per commit (newest at the top, as `git log`
 * prints them), one column ("lane") per line of history, edges where history
 * forks and joins, and branch / tag labels beside the commits.
 *
 * Every tool that draws a commit graph makes the same two choices: how to
 * ORDER THE ROWS (which commit goes above which) and how to ASSIGN COLUMNS
 * (which lane each line of history runs in). This module exposes both as
 * options so the choices can be drawn side by side:
 *
 *   orderCommits(commits, 'topo')   rows: author date, commit date, or a temporal topological sort
 *   lanes: 'straight' | 'compact'   columns: slots reserved and reused (GitKraken) or
 *                                   inserted and removed, so neighbours shift (Git Extensions, gitk)
 *   pin: [tip, ...]                 the leftmost columns belong to these branches (main first)
 *   fold: [merge, ...]              a merged branch hidden behind its merge commit
 *   maxLanes: n                     lanes past the cap are cut and marked with git's `~`
 *   bend: 'curve' | 'corner' | 'angle'   how a line changes column
 *
 * The lane walk (gitLanes) is one pass down the list carrying `slots`:
 * slots[i] is the commit the line in column i is travelling down to meet
 * (null = free). For each commit:
 *   1. Every slot waiting for it ends here; the leftmost becomes its column.
 *      If none is waiting it is a branch tip: it takes a free column.
 *   2. Its FIRST parent inherits its column, so a branch's own history runs
 *      straight down (and a branch made on top of another continues its line).
 *   3. Each further parent (a merge) joins a slot already waiting for that
 *      parent, or opens a new one.
 * This is the first-parent rule GitGoose's graph uses, so pictures drawn here
 * match the app; `pin` is its reserved trunk column, generalised.
 *
 * Every edge remembers the column it occupies in each row it passes (`via`).
 * With straight lanes that column never changes; with compact lanes it
 * shifts left when a column to its left closes, and the edge bends. Edges are
 * keyed by child and parent, commits by hash, so a "before / after" pair of
 * pictures (a rebase, a merge, a change of layout) animates: commits that
 * survive stay put or slide, new ones fade in.
 */
import { Scene, SceneNode, Tone, V2, Vec, circle, estimateTextWidth, path, rect, text } from '../core';

export interface Commit {
  hash: string;
  /** First parent first, as git stores them. Parents not in the list are drawn as a short stub. */
  parents: readonly string[];
  /** Text beside the commit: a subject line, or a short hash. */
  label?: string;
  /** Overrides the lane's colour for this commit's dot. */
  tone?: Tone;
  /** Committer time, any unit: only the order matters. `orderCommits` reads it. */
  date?: number;
  /** Author time, when it differs from `date` (a rebase or cherry-pick keeps the author's). */
  authorDate?: number;
  /**
   * What the row is: a commit (default), the uncommitted changes ('wip': a dashed node joined
   * to HEAD by a dashed line) or a stash ('stash': a dashed card beside the commit it was made on).
   */
  kind?: 'commit' | 'wip' | 'stash';
}

export interface Ref {
  name: string;
  hash: string;
  /** 'branch' (local), 'remote', 'tag' or 'head' (HEAD itself). Decides the label's role. */
  kind: 'branch' | 'remote' | 'tag' | 'head';
}

export type LaneStyle = 'straight' | 'compact';

export interface LaneOptions {
  /**
   * 'straight' (default): a finished column becomes an empty slot that a later branch reuses,
   * so no line ever moves sideways. 'compact': a merge opens its branch's column right beside
   * it and a finished column is removed, so the columns to the right shift and their lines bend.
   */
  lanes?: LaneStyle;
  /**
   * Tips whose lines own the leftmost columns, in order: pin[0]'s first-parent chain runs down
   * column 0 wherever its tip is in the list, pin[1]'s down column 1, and so on. A tip not in the
   * list keeps its column empty.
   */
  pin?: readonly string[];
  /**
   * Merge commits to fold: the commits reachable from their other parents but not from their
   * first parent are left out, and the merge is drawn as a fold mark.
   */
  fold?: Iterable<string>;
}

export interface GitGraphOptions extends LaneOptions {
  id?: string;
  /** Commits to emphasise; every other commit and edge is dimmed. */
  highlight?: Iterable<string>;
  /** How a line changes column: an S-curve (default), a GitKraken-style rounded corner, or a straight diagonal. */
  bend?: 'curve' | 'corner' | 'angle';
  /** Columns past this many are not drawn; a `~` marks each row they cross, as `git log --graph-lane-limit` does. */
  maxLanes?: number;
  /** Pointer cursor on the commits (click events carry `data: { hash }` either way). */
  interactive?: boolean;
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

export interface LaneEdge {
  parent: string;
  /**
   * The column the walk gave the edge as it leaves its child: the child's own column for a first
   * parent, the slot a merge opens or joins otherwise. With compact lanes `via[0]` can differ once
   * the columns have shifted.
   */
  lane: number;
  /** The parent's row, -1 if it is not in the list (drawn as a stub). */
  row: number;
  /** The column the edge occupies in each row strictly between child and parent. */
  via: number[];
  /** Colour index of the line it rides: the column that line opened in, kept when columns shift. */
  color: number;
}

export interface LanePlacement {
  hash: string;
  row: number;
  lane: number;
  /** Colour index of the line the commit sits on (its column, unless compact lanes have shifted it). */
  color: number;
  /** One per drawn parent, in order. */
  edges: LaneEdge[];
  /** A merge whose other parents were folded away: drawn as a fold mark. */
  folded?: boolean;
}

export interface GitGraph extends Scene {
  /** Centre of a commit's dot. */
  pos(hash: string): Vec;
  lane(hash: string): number;
  row(hash: string): number;
  /** How many columns the graph uses (after the cap). */
  lanes: number;
  /** x where the labels column starts (right of every lane). */
  labelX: number;
  /** Commits left out by `fold`. */
  hidden: ReadonlySet<string>;
  /** The drawn commits, top to bottom. */
  rows: readonly string[];
}

export type CommitOrder = 'author-date' | 'commit-date' | 'topo';

/**
 * Put commits in the order a graph lists them, newest first.
 *   'author-date' and 'commit-date' sort by one timestamp. Both can put a parent above its
 *   child: a rebase keeps old author dates, and clocks differ between machines.
 *   'topo' is the temporal topological sort: among the commits whose listed children are all
 *   placed, always take the newest (by `date`). Every child comes before its parents, and when the
 *   dates are sane the result equals date order. This is what `git log --date-order` does.
 */
export function orderCommits(commits: readonly Commit[], by: CommitOrder): Commit[] {
  const at = new Map(commits.map((c, i) => [c.hash, i]));
  const stamp = (c: Commit) => (by === 'author-date' ? c.authorDate ?? c.date : c.date) ?? 0;
  const newer = (a: Commit, b: Commit) => stamp(b) - stamp(a) || at.get(a.hash)! - at.get(b.hash)!;
  if (by !== 'topo') return [...commits].sort(newer);
  const byHash = new Map(commits.map((c) => [c.hash, c]));
  // how many listed children each commit still waits for
  const waiting = new Map<string, number>();
  for (const c of commits) for (const p of c.parents) if (byHash.has(p)) waiting.set(p, (waiting.get(p) ?? 0) + 1);
  const ready = commits.filter((c) => !waiting.get(c.hash));
  const out: Commit[] = [];
  while (ready.length) {
    let best = 0;
    for (let i = 1; i < ready.length; i++) if (newer(ready[i], ready[best]) < 0) best = i;
    const [c] = ready.splice(best, 1);
    out.push(c);
    for (const p of c.parents) {
      const n = waiting.get(p);
      if (n === undefined) continue;
      waiting.set(p, n - 1);
      if (n === 1) ready.push(byHash.get(p)!);
    }
  }
  return out;
}

/** The commits `fold` hides: reachable from a folded merge's other parents but not from its first. */
export function foldedCommits(commits: readonly Commit[], fold: Iterable<string>): Set<string> {
  const byHash = new Map(commits.map((c) => [c.hash, c]));
  const reach = (from: readonly string[]) => {
    const seen = new Set<string>();
    const stack = from.filter((h) => byHash.has(h));
    while (stack.length) {
      const h = stack.pop()!;
      if (seen.has(h)) continue;
      seen.add(h);
      stack.push(...byHash.get(h)!.parents);
    }
    return seen;
  };
  const hidden = new Set<string>();
  for (const m of fold) {
    const c = byHash.get(m);
    if (!c || c.parents.length < 2) continue;
    const kept = reach([c.parents[0]]);
    for (const h of reach(c.parents.slice(1))) if (!kept.has(h)) hidden.add(h);
  }
  return hidden;
}

interface Slot {
  hash: string;
  /** The column the slot opened in: its line keeps this colour even when compact lanes shift it. */
  color: number;
  /** A pinned column, waiting for its tip from the top of the graph. */
  held?: boolean;
}

/** The lane walk on its own: pure, so it is easy to test and to reuse. Folded commits are left out. */
export function gitLanes(commits: readonly Commit[], o: LaneOptions = {}): LanePlacement[] {
  const fold = new Set(o.fold ?? []);
  const hidden = fold.size ? foldedCommits(commits, fold) : new Set<string>();
  const visible = commits.filter((c) => !hidden.has(c.hash));
  const rowOf = new Map(visible.map((c, i) => [c.hash, i]));
  const compact = o.lanes === 'compact';
  let slots: (Slot | null)[] = (o.pin ?? []).map((hash, color) => ({ hash, color, held: true }));
  // edges still travelling down: the slot each rides, and the lanes it has passed
  let open: { slot: Slot; parent: string; via: number[] }[] = [];
  const free = (exclude = -1) => {
    for (let i = 0; i < slots.length; i++) if (slots[i] === null && i !== exclude) return i;
    return slots.length;
  };
  // the smallest colour no open line is using: its column, unless compact lanes have shifted things
  const freeColor = () => {
    const used = new Set(slots.map((s) => s?.color));
    let c = 0;
    while (used.has(c)) c++;
    return c;
  };
  const placed = visible.map((c, row) => {
    // every edge not ending here crosses this row in its slot's current column
    for (const e of open) if (e.parent !== c.hash) e.via.push(slots.indexOf(e.slot));
    open = open.filter((e) => e.parent !== c.hash);

    const incoming: number[] = [];
    slots.forEach((s, i) => s?.hash === c.hash && incoming.push(i));
    const lane = incoming.length ? incoming[0] : free();
    // the commit sits on the line that reached it first; a tip starts a line of its own
    const color = incoming.length ? slots[lane]!.color : freeColor();
    for (const i of incoming) slots[i] = null;

    const folded = fold.has(c.hash) && c.parents.some((p) => hidden.has(p));
    const parents = folded ? c.parents.filter((p) => !hidden.has(p)) : c.parents;
    const edges: LaneEdge[] = [];
    parents.forEach((p, k) => {
      const prow = rowOf.get(p);
      if (prow === undefined) {
        // not in the list: a short stub, which reserves nothing
        const stub = k === 0 ? lane : free(lane);
        edges.push({ parent: p, lane: stub, row: -1, via: [], color: k === 0 ? color : stub });
        return;
      }
      let target: number;
      if (k === 0) target = lane;
      else {
        target = slots.findIndex((s) => s?.hash === p);
        if (target < 0) {
          // compact: open the branch's column right beside the merge; straight: reuse a free slot or append
          target = compact ? lane + 1 : free(lane);
          if (compact) slots.splice(target, 0, null);
        }
      }
      // a first parent continues the child's line, in its colour; a new slot takes its column's
      if (slots[target]?.hash !== p) slots[target] = { hash: p, color: k === 0 ? color : freeColor() };
      const via: number[] = [];
      edges.push({ parent: p, lane: target, row: prow, via, color: slots[target]!.color });
      open.push({ slot: slots[target]!, parent: p, via });
    });

    // compact: finished columns are removed, so everything to their right shifts left.
    // straight: only the free columns at the right edge are dropped, so nothing moves.
    if (compact) slots = slots.filter((s) => s !== null);
    else while (slots.length && slots[slots.length - 1] === null) slots.pop();
    return { hash: c.hash, row, lane, color, edges, ...(folded ? { folded: true } : {}) };
  });
  return placed;
}

const DEFAULT_TONES: Tone[] = ['accent', 'success', 'visited', 'orange', 'danger', 'active'];
type Pt = [number, number];

/** Points along a vertical S-curve from a to b (a cubic with vertical tangents at both ends). */
function sCurve(a: Vec, b: Vec, n = 10): Pt[] {
  const my = (a.y + b.y) / 2;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    // control points (a.x, my) and (b.x, my)
    const x = u * u * u * a.x + 3 * u * u * t * a.x + 3 * u * t * t * b.x + t * t * t * b.x;
    const y = u * u * u * a.y + 3 * u * u * t * my + 3 * u * t * t * my + t * t * t * b.y;
    return [x, y];
  });
}

/** Points on a circular arc from angle `s` to angle `e` (radians, y down) about (cx, cy). */
function arc(cx: number, cy: number, r: number, s: number, e: number, n = 4): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n, a = s + (e - s) * t;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

/**
 * The points of one segment of an edge, from a down to b, which may be in another column.
 * `travel` is the column (as x) the line occupies between the two rows, which decides the shape
 * when the bend is a corner: level with the node then a quarter turn (leaving), a quarter turn
 * into the node's row (entering), or two turns when the line sidesteps between rows.
 */
function segment(a: Vec, b: Vec, travel: number, bend: NonNullable<GitGraphOptions['bend']>): Pt[] {
  if (a.x === b.x) return [[b.x, b.y]];
  if (bend === 'angle') return [[b.x, b.y]];
  if (bend === 'curve') return sCurve(a, b).slice(1);
  const dir = Math.sign(b.x - a.x);
  const r = Math.min(8, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2);
  const q = Math.PI / 2;
  if (travel === a.x) {
    // down the column, then turn into the parent's row
    return [[a.x, b.y - r], ...arc(a.x + dir * r, b.y - r, r, dir > 0 ? Math.PI : 0, q), [b.x, b.y]];
  }
  if (travel === b.x) {
    // out of the child's row, then turn down the column
    return [[b.x - dir * r, a.y], ...arc(b.x - dir * r, a.y + r, r, -q, dir > 0 ? 0 : -Math.PI), [b.x, b.y]];
  }
  const my = (a.y + b.y) / 2;
  return [
    [a.x, my - r], ...arc(a.x + dir * r, my - r, r, dir > 0 ? Math.PI : 0, q),
    [b.x - dir * r, my], ...arc(b.x - dir * r, my + r, r, -q, dir > 0 ? 0 : -Math.PI),
    [b.x, b.y],
  ];
}

/** A small tilde: git's mark for a lane cut off by the cap. */
function tilde(cx: number, cy: number, w: number): Pt[] {
  return Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return [cx - w / 2 + w * t, cy + Math.sin(t * Math.PI * 2) * w * 0.18];
  });
}

export function graph(commits: readonly Commit[], refs: readonly Ref[] = [], o: GitGraphOptions = {}): GitGraph {
  const id = o.id ?? 'git';
  const rowH = o.rowH ?? 34, laneW = o.laneW ?? 22, r = o.r ?? 6;
  const x0 = (o.x ?? 0) + laneW / 2, y0 = (o.y ?? 0) + rowH / 2;
  const tones = o.tones?.length ? o.tones : DEFAULT_TONES;
  const toneOf = (lane: number) => tones[lane % tones.length];
  const bend = o.bend ?? 'curve';
  const cap = o.maxLanes ?? Infinity;
  const hi = o.highlight ? new Set(o.highlight) : null;
  const dim = (...hashes: string[]) => (hi && !hashes.every((h) => hi.has(h)) ? 0.3 : undefined);

  const placed = gitLanes(commits, o);
  const byHash = new Map(placed.map((p) => [p.hash, p]));
  const commitOf = new Map(commits.map((c) => [c.hash, c]));
  const hidden = new Set(commits.filter((c) => !byHash.has(c.hash)).map((c) => c.hash));
  const X = (lane: number) => x0 + lane * laneW;
  const Y = (row: number) => y0 + row * rowH;
  const used = Math.max(0, ...placed.flatMap((p) => [p.lane + 1, ...p.edges.flatMap((e) => [e.lane + 1, ...e.via.map((l) => l + 1)])]));
  // rows where something lies past the cap get a tilde in the column just past it
  const cutRows = new Set<number>();
  const cut = (lane: number, row: number) => {
    if (lane < cap) return false;
    cutRows.add(Math.round(row));
    return true;
  };
  const lanes = Math.min(used, cap + (used > cap ? 1 : 0));
  const labelX = (o.x ?? 0) + lanes * laneW + 10;

  const edges: SceneNode[] = [];
  const dots: SceneNode[] = [];
  const labels: SceneNode[] = [];
  for (const p of placed) {
    const c = commitOf.get(p.hash)!;
    const at = V2(X(p.lane), Y(p.row));
    const dashed = c.kind === 'wip' || c.kind === 'stash';
    for (const e of p.edges) {
      const k = `${id}:edge:${p.hash}-${e.parent}`;
      const tone = toneOf(e.color);
      const opacity = dim(p.hash, e.parent);
      if (e.row < 0) {
        // a parent outside the list: a short stub down its lane
        if (cut(p.lane, p.row) || cut(e.lane, p.row)) continue;
        const end = V2(X(e.lane), Y(p.row + 0.6));
        edges.push(path({ id: k, points: [[at.x, at.y], ...segment(at, end, X(e.lane), bend)], role: 'git-edge', tone, dashed: true, opacity }));
        continue;
      }
      // the edge's course: the child, the column it holds in each row between, the parent
      const parent = byHash.get(e.parent)!;
      const course = [{ lane: p.lane, row: p.row }, ...e.via.map((lane, i) => ({ lane, row: p.row + 1 + i })), { lane: parent.lane, row: parent.row }];
      // runs of points inside the cap; a run that meets the cap heads into the tilde column
      const runs: { pts: Pt[]; from: number }[] = [];
      let run: { pts: Pt[]; from: number } | null = null;
      let prev: Vec | null = null;
      course.forEach((pt, i) => {
        const beyond = cut(pt.lane, pt.row);
        const here = V2(X(Math.min(pt.lane, cap)), Y(pt.row));
        if (beyond) {
          if (run && prev) run.pts.push(...segment(prev, here, X(cap), bend));
          run = null;
          prev = null;
          return;
        }
        if (!run) {
          run = { pts: [], from: i };
          runs.push(run);
          // coming back from past the cap: start in the tilde column one row up
          if (i > 0) {
            const back = V2(X(cap), Y(course[i - 1].row));
            run.pts.push([back.x, back.y], ...segment(back, here, X(cap), bend));
          } else run.pts.push([here.x, here.y]);
        } else if (prev) {
          // the column the line occupies between the two rows: the next via, else the edge's own lane
          const travel = i === 1 ? X(e.via[0] ?? e.lane) : X(course[i - 1].lane);
          run.pts.push(...segment(prev, here, travel, bend));
        }
        prev = here;
      });
      runs.forEach((seg, i) => {
        if (seg.pts.length < 2) return;
        edges.push(path({ id: i === 0 ? k : `${k}:${i}`, points: seg.pts, role: 'git-edge', tone, dashed: dashed || undefined, opacity }));
      });
    }
    if (cut(p.lane, p.row)) continue;
    const tone = c.tone ?? toneOf(p.color);
    const data = { hash: p.hash };
    const interactive = o.interactive || undefined;
    if (hi?.has(p.hash)) dots.push(circle({ id: `${id}:halo:${p.hash}`, x: at.x, y: at.y, r: r + 5, role: 'git-halo', tone }));
    if (c.kind === 'stash') {
      dots.push(rect({ id: `${id}:commit:${p.hash}`, x: at.x, y: at.y, w: r * 2.2, h: r * 2.2, rx: r * 0.5, role: 'git-stash', tone, dashed: true, opacity: dim(p.hash), data, interactive }));
    } else {
      const role = c.kind === 'wip' ? 'git-wip' : p.folded ? 'git-fold' : c.parents.length > 1 ? 'git-merge' : 'git-commit';
      dots.push(circle({ id: `${id}:commit:${p.hash}`, x: at.x, y: at.y, r: p.folded ? r + 1 : r, role, tone, dashed: c.kind === 'wip' || undefined, opacity: dim(p.hash), data, interactive }));
      if (p.folded) dots.push(text({ id: `${id}:fold:${p.hash}`, x: at.x, y: at.y, text: '+', size: 11, weight: 700, role: 'git-fold-sign', tone, opacity: dim(p.hash) }));
    }
  }
  for (const row of cutRows) edges.push(path({ id: `${id}:cut:${row}`, points: tilde(X(cap), Y(row), laneW * 0.6), smooth: true, role: 'git-cut' }));

  // labels: ref pills first, then the commit's own text, in one row to the right of every lane
  for (const p of placed) {
    let x = labelX;
    const y = Y(p.row);
    const c = commitOf.get(p.hash)!;
    for (const ref of refs.filter((f) => f.hash === p.hash)) {
      const k = `${id}:ref:${ref.name}`;
      const w = estimateTextWidth(ref.name, 11) + 14;
      const tone = ref.kind === 'tag' ? 'muted' : toneOf(p.color);
      labels.push(
        rect({ id: k, x: x + w / 2, y, w, h: 18, rx: ref.kind === 'tag' ? 3 : 9, role: `git-ref-${ref.kind}`, tone, opacity: dim(p.hash), data: { ref: ref.name } }),
        text({ id: `${k}:label`, x: x + w / 2, y, text: ref.name, size: 11, role: 'git-ref-label', tone, opacity: dim(p.hash) }),
      );
      x += w + 6;
    }
    if (c.label) labels.push(text({ id: `${id}:label:${p.hash}`, x, y, text: c.label, size: 12.5, anchor: 'start', role: 'git-label', opacity: dim(p.hash) }));
  }

  const get = (h: string) => byHash.get(h);
  return {
    nodes: [...edges, ...dots, ...labels],
    pos: (h) => (get(h) ? V2(X(Math.min(get(h)!.lane, cap)), Y(get(h)!.row)) : V2(x0, y0)),
    lane: (h) => get(h)?.lane ?? -1,
    row: (h) => get(h)?.row ?? -1,
    lanes,
    labelX,
    hidden,
    rows: placed.map((p) => p.hash),
  };
}
