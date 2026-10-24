import { describe, expect, it } from 'vitest';
import { Commit, foldedCommits, gitLanes, graph, orderCommits } from '@dsviz/git';

/** Commits newest first, from "hash:parent,parent" strings. */
const log = (...lines: string[]): Commit[] =>
  lines.map((l) => {
    const [hash, ps = ''] = l.split(':');
    return { hash, parents: ps ? ps.split(',') : [] };
  });
const lanesOf = (commits: Commit[], o?: Parameters<typeof gitLanes>[1]) => Object.fromEntries(gitLanes(commits, o).map((p) => [p.hash, p.lane]));
const edgesOf = (commits: Commit[], hash: string, o?: Parameters<typeof gitLanes>[1]) => gitLanes(commits, o).find((p) => p.hash === hash)!.edges;

describe('git lanes', () => {
  it('a linear history is one lane', () => {
    const l = lanesOf(log('d:c', 'c:b', 'b:a', 'a'));
    expect(l).toEqual({ d: 0, c: 0, b: 0, a: 0 });
  });

  it('a branch and merge opens a lane and closes it again', () => {
    //  m       merge of f2 into main
    //  | \
    //  c  f2
    //  |  f1
    //  | /
    //  b
    //  a
    const commits = log('m:c,f2', 'c:b', 'f2:f1', 'f1:b', 'b:a', 'a');
    const placed = gitLanes(commits);
    const l = lanesOf(commits);
    expect(l).toEqual({ m: 0, c: 0, f2: 1, f1: 1, b: 0, a: 0 });
    // the merge's second parent travels down lane 1 (one row between); f1's edge joins lane 0 at b
    expect(placed[0].edges).toEqual([{ parent: 'c', lane: 0, row: 1, via: [], color: 0 }, { parent: 'f2', lane: 1, row: 2, via: [1], color: 1 }]);
    expect(placed[3].edges).toEqual([{ parent: 'b', lane: 1, row: 4, via: [], color: 1 }]);
    // after b the lane is free again: the graph is one column wide at the bottom
    const g = graph(commits);
    expect(g.lanes).toBe(2);
    expect(g.pos('a').x).toBe(g.pos('m').x);
  });

  it('a branch on top of another continues its lane', () => {
    // topic (z, y, x) sits straight on main's tip b: no new column
    const l = lanesOf(log('z:y', 'y:x', 'x:b', 'b:a', 'a'));
    expect(new Set(Object.values(l))).toEqual(new Set([0]));
  });

  it('two tips sharing a parent: the second takes a new lane that ends at the fork', () => {
    const l = lanesOf(log('t2:b', 't1:b', 'b:a', 'a'));
    expect(l).toEqual({ t2: 0, t1: 1, b: 0, a: 0 });
  });

  it('a parent outside the list is a dashed stub, not a crash, and reserves no column', () => {
    const g = graph(log('c:b', 'b:zzz'));
    const stub = g.nodes.find((n) => n.id === 'git:edge:b-zzz');
    expect(stub?.dashed).toBe(true);
    expect(g.lanes).toBe(1);
  });

  // Two branches off main, feature-a merged first. Straight lanes leave feature-b where it was;
  // compact lanes close feature-a's column at the fork and feature-b slides left into it.
  //  M4
  //  M3 ─╮        merge of A2
  //  B2  │         (feature-b tip, lane 2)
  //  │   A2
  //  │   A1
  //  B1  │
  //  M2 ─╯        fork of feature-a
  //  M1 ─╯        fork of feature-b
  const two = log('M4:M3', 'M3:M2,A2', 'B2:B1', 'A2:A1', 'A1:M2', 'B1:M1', 'M2:M1', 'M1');

  it('straight lanes never move a line sideways', () => {
    const l = lanesOf(two);
    expect(l).toEqual({ M4: 0, M3: 0, B2: 2, A2: 1, A1: 1, B1: 2, M2: 0, M1: 0 });
    const [toM1] = edgesOf(two, 'B1');
    expect(toM1.via).toEqual([2]);
  });

  it('compact lanes remove a finished column, so the line to its right shifts left', () => {
    // as `two`, with feature-b forking one commit lower so its line outlives feature-a's column
    const h = log('M4:M3', 'M3:M2,A2', 'B2:B1', 'A2:A1', 'A1:M2', 'B1:M0', 'M2:M1', 'M1:M0', 'M0');
    expect(lanesOf(h, { lanes: 'compact' }).B2).toBe(2);
    const [toM0] = edgesOf(h, 'B1', { lanes: 'compact' });
    // B1 is in column 2 and still there in M2's row; M2 closes feature-a's column, so in M1's row the edge is in column 1
    expect(toM0.lane).toBe(2);
    expect(toM0.via).toEqual([2, 1]);
    // straight lanes leave it in column 2 the whole way
    expect(edgesOf(h, 'B1')[0].via).toEqual([2, 2]);
    // the line keeps the colour of the column it opened in, so it does not change colour as it shifts
    expect(toM0.color).toBe(2);
    expect(gitLanes(h, { lanes: 'compact' }).find((p) => p.hash === 'B1')!.color).toBe(2);
  });

  it('compact lanes open a merged branch right beside the merge, pushing a neighbour outwards', () => {
    // B is already in column 1 when main's merge opens feature-a's column
    const h = log('M4:M3', 'B3:B2', 'M3:M2,A2', 'B2:B1', 'A2:A1', 'A1:M2', 'B1:M2', 'M2:M1', 'M1');
    const straight = lanesOf(h), compact = lanesOf(h, { lanes: 'compact' });
    expect(straight.B3).toBe(1);
    expect(straight.A2).toBe(2);
    expect(compact.B3).toBe(1);
    expect(compact.A2).toBe(1);
    expect(compact.B2).toBe(2);
  });

  it('pin gives a branch the leftmost column wherever its tip is', () => {
    // feature is newest, so without a pin it takes lane 0 and main goes right
    const h = log('F2:F1', 'M3:M2', 'F1:M2', 'M2:M1', 'M1');
    expect(lanesOf(h)).toEqual({ F2: 0, M3: 1, F1: 0, M2: 0, M1: 0 });
    expect(lanesOf(h, { pin: ['M3'] })).toEqual({ F2: 1, M3: 0, F1: 1, M2: 0, M1: 0 });
    // a branch on top of main is drawn as one line by pinning its tip instead (GitGoose's straight-tip hint)
    const onTop = log('Z:Y', 'Y:B', 'B:A', 'A');
    expect(lanesOf(onTop, { pin: ['B'] })).toEqual({ Z: 1, Y: 1, B: 0, A: 0 });
    expect(lanesOf(onTop, { pin: ['Z'] })).toEqual({ Z: 0, Y: 0, B: 0, A: 0 });
  });

  it('a merge of a pinned tip joins its held column instead of opening a new one', () => {
    // topic merged main in; main's tip M2 is pinned and arrives later
    const h = log('T2:T1,M2', 'T1:M1', 'M2:M1', 'M1');
    const [, toM2] = edgesOf(h, 'T2', { pin: ['M2'] });
    expect(toM2.lane).toBe(0);
    expect(lanesOf(h, { pin: ['M2'] })).toEqual({ T2: 1, T1: 1, M2: 0, M1: 0 });
  });

  it('fold hides the commits only the merge reaches and marks the merge', () => {
    const h = log('M4:M3', 'M3:M2,A2', 'B2:B1', 'A2:A1', 'A1:M2', 'B1:M1', 'M2:M1', 'M1');
    expect([...foldedCommits(h, ['M3'])].sort()).toEqual(['A1', 'A2']);
    const placed = gitLanes(h, { fold: ['M3'] });
    expect(placed.map((p) => p.hash)).toEqual(['M4', 'M3', 'B2', 'B1', 'M2', 'M1']);
    expect(placed[1].folded).toBe(true);
    expect(placed[1].edges).toHaveLength(1);
    // feature-b now sits in lane 1: nothing waits in between
    expect(lanesOf(h, { fold: ['M3'] }).B2).toBe(1);
    const g = graph(h, [], { fold: ['M3'] });
    expect(g.hidden).toEqual(new Set(['A1', 'A2']));
    expect(g.nodes.find((n) => n.id === 'git:commit:M3')?.role).toBe('git-fold');
    expect(g.nodes.some((n) => n.id === 'git:commit:A1')).toBe(false);
  });

  it('fold leaves a merge alone when its other parent is already on the first-parent line', () => {
    const h = log('M2:M1,X', 'M1:X', 'X');
    expect(foldedCommits(h, ['M2']).size).toBe(0);
    expect(gitLanes(h, { fold: ['M2'] })[0].folded).toBeUndefined();
  });
});

describe('orderCommits', () => {
  // f2 was rebased: its author date is older than main's newest commit, and its commit date newer
  const c = (hash: string, parents: string[], date: number, authorDate = date): Commit => ({ hash, parents, date, authorDate });
  const unsorted = [c('m1', [], 1), c('f2', ['m2'], 4, 2), c('m2', ['m1'], 3)];

  it('sorts by one date, which can put a parent above its child', () => {
    expect(orderCommits(unsorted, 'author-date').map((x) => x.hash)).toEqual(['m2', 'f2', 'm1']);
    expect(orderCommits(unsorted, 'commit-date').map((x) => x.hash)).toEqual(['f2', 'm2', 'm1']);
  });

  it('topo keeps every child above its parents and otherwise follows the dates', () => {
    expect(orderCommits(unsorted, 'topo').map((x) => x.hash)).toEqual(['f2', 'm2', 'm1']);
    // a parent dated after its child (clock skew) still goes below it
    const skew = [c('a', [], 9), c('b', ['a'], 5), c('x', [], 7)];
    expect(orderCommits(skew, 'commit-date').map((x) => x.hash)).toEqual(['a', 'x', 'b']);
    expect(orderCommits(skew, 'topo').map((x) => x.hash)).toEqual(['x', 'b', 'a']);
  });
});

describe('graph scene', () => {
  const commits = log('m:c,f', 'c:b', 'f:b', 'b:a', 'a');
  it('draws ref labels as pills beside their commit, keyed by name', () => {
    const g = graph(commits, [{ name: 'main', hash: 'm', kind: 'branch' }, { name: 'v1.0', hash: 'b', kind: 'tag' }]);
    const main = g.nodes.find((n) => n.id === 'git:ref:main');
    expect(main?.role).toBe('git-ref-branch');
    expect(main?.kind === 'rect' && main.y).toBe(g.pos('m').y);
    expect(g.nodes.find((n) => n.id === 'git:ref:v1.0')?.role).toBe('git-ref-tag');
  });
  it('merges are their own role and lanes get their own tone', () => {
    const g = graph(commits);
    expect(g.nodes.find((n) => n.id === 'git:commit:m')?.role).toBe('git-merge');
    expect(g.nodes.find((n) => n.id === 'git:commit:f')?.tone).not.toBe(g.nodes.find((n) => n.id === 'git:commit:c')?.tone);
  });
  it('highlight dims everything else and haloes the chosen commits', () => {
    const g = graph(commits, [], { highlight: ['f'] });
    expect(g.nodes.find((n) => n.id === 'git:commit:c')?.opacity).toBeLessThan(1);
    expect(g.nodes.find((n) => n.id === 'git:commit:f')?.opacity).toBeUndefined();
    expect(g.nodes.some((n) => n.id === 'git:halo:f')).toBe(true);
  });
  it('a curved edge starts at the child and ends at the parent, whatever the bend', () => {
    for (const bend of ['curve', 'corner', 'angle'] as const) {
      const g = graph(commits, [], { bend });
      const e = g.nodes.find((n) => n.id === 'git:edge:f-b');
      expect(e?.kind === 'path' && e.points[0]).toEqual([g.pos('f').x, g.pos('f').y]);
      expect(e?.kind === 'path' && e.points.at(-1)).toEqual([g.pos('b').x, g.pos('b').y]);
    }
  });
  it('a corner bend leaves a merge level with the node and enters a parent level with its row', () => {
    const g = graph(commits, [], { bend: 'corner' });
    const leave = g.nodes.find((n) => n.id === 'git:edge:m-f');
    const enter = g.nodes.find((n) => n.id === 'git:edge:f-b');
    expect(leave?.kind === 'path' && leave.points[1][1]).toBe(g.pos('m').y);
    expect(enter?.kind === 'path' && enter.points[1][0]).toBe(g.pos('f').x);
  });
  it('maxLanes cuts the far lanes and marks their rows with a tilde', () => {
    // four lanes open at once below C: main, feature-a, B and C
    const wide = log('M3:M2,A', 'B:M1', 'A:M1', 'C:M1', 'M2:M1', 'M1');
    const full = graph(wide);
    expect(full.lanes).toBe(4);
    const capped = graph(wide, [], { maxLanes: 2 });
    expect(capped.lanes).toBe(3); // two lanes plus the tilde column
    expect(capped.nodes.some((n) => n.id === 'git:commit:B')).toBe(false);
    expect(capped.nodes.some((n) => n.id === 'git:commit:C')).toBe(false);
    expect(capped.nodes.some((n) => n.role === 'git-cut')).toBe(true);
    expect(capped.nodes.some((n) => n.id === 'git:commit:A')).toBe(true);
    // the cut lanes' edges still reach the tilde column, so nothing dangles
    const toM1 = capped.nodes.find((n) => n.id === 'git:edge:B-M1');
    expect(toM1?.kind === 'path' && toM1.points[0][0]).toBe(capped.pos('C').x);
  });
  it('wip and stash rows are dashed', () => {
    const g = graph([{ hash: 'wip', parents: ['h'], kind: 'wip' }, { hash: 's', parents: ['h'], kind: 'stash' }, { hash: 'h', parents: [] }]);
    expect(g.nodes.find((n) => n.id === 'git:commit:wip')?.role).toBe('git-wip');
    expect(g.nodes.find((n) => n.id === 'git:edge:wip-h')?.dashed).toBe(true);
    expect(g.nodes.find((n) => n.id === 'git:commit:s')?.role).toBe('git-stash');
    expect(g.nodes.find((n) => n.id === 'git:edge:s-h')?.dashed).toBe(true);
  });
});
