import { describe, expect, it } from 'vitest';
import { git } from '../src';

/** Commits newest first, from "hash:parent,parent" strings. */
const log = (...lines: string[]): git.Commit[] =>
  lines.map((l) => {
    const [hash, ps = ''] = l.split(':');
    return { hash, parents: ps ? ps.split(',') : [] };
  });
const lanesOf = (commits: git.Commit[]) => Object.fromEntries(git.gitLanes(commits).map((p) => [p.hash, p.lane]));

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
    const placed = git.gitLanes(commits);
    const l = lanesOf(commits);
    expect(l).toEqual({ m: 0, c: 0, f2: 1, f1: 1, b: 0, a: 0 });
    // the merge's second parent travels down lane 1; f1's edge joins lane 0 at b
    expect(placed[0].edges).toEqual([{ parent: 'c', lane: 0, row: 1 }, { parent: 'f2', lane: 1, row: 2 }]);
    expect(placed[3].edges).toEqual([{ parent: 'b', lane: 1, row: 4 }]);
    // after b the lane is free again: the graph is one column wide at the bottom
    const g = git.graph(commits);
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

  it('a parent outside the list is a dashed stub, not a crash', () => {
    const g = git.graph(log('c:b', 'b:zzz'));
    const stub = g.nodes.find((n) => n.id === 'git:edge:b-zzz');
    expect(stub?.dashed).toBe(true);
  });
});

describe('git.graph scene', () => {
  const commits = log('m:c,f', 'c:b', 'f:b', 'b:a', 'a');
  it('draws ref labels as pills beside their commit, keyed by name', () => {
    const g = git.graph(commits, [{ name: 'main', hash: 'm', kind: 'branch' }, { name: 'v1.0', hash: 'b', kind: 'tag' }]);
    const main = g.nodes.find((n) => n.id === 'git:ref:main');
    expect(main?.role).toBe('git-ref-branch');
    expect(main?.kind === 'rect' && main.y).toBe(g.pos('m').y);
    expect(g.nodes.find((n) => n.id === 'git:ref:v1.0')?.role).toBe('git-ref-tag');
  });
  it('merges are their own role and lanes get their own tone', () => {
    const g = git.graph(commits);
    expect(g.nodes.find((n) => n.id === 'git:commit:m')?.role).toBe('git-merge');
    expect(g.nodes.find((n) => n.id === 'git:commit:f')?.tone).not.toBe(g.nodes.find((n) => n.id === 'git:commit:c')?.tone);
  });
  it('highlight dims everything else and haloes the chosen commits', () => {
    const g = git.graph(commits, [], { highlight: ['f'] });
    expect(g.nodes.find((n) => n.id === 'git:commit:c')?.opacity).toBeLessThan(1);
    expect(g.nodes.find((n) => n.id === 'git:commit:f')?.opacity).toBeUndefined();
    expect(g.nodes.some((n) => n.id === 'git:halo:f')).toBe(true);
  });
  it('a curved edge starts at the child and ends at the parent', () => {
    const g = git.graph(commits);
    const e = g.nodes.find((n) => n.id === 'git:edge:f-b');
    expect(e?.kind === 'path' && e.points[0]).toEqual([g.pos('f').x, g.pos('f').y]);
    expect(e?.kind === 'path' && e.points.at(-1)).toEqual([g.pos('b').x, g.pos('b').y]);
  });
});
