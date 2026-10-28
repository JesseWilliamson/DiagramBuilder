// What merge and rebase do to history. Commits are keyed by hash, so switching
// pictures animates: a merge ADDS one commit with two parents, while a rebase
// copies the feature commits onto main as NEW commits (new hashes, so the old
// dots fade out and new ones fade in) and leaves the old ones unreferenced.
import { useState } from 'react';
import { Commit, graph, Ref } from 'dsviz/git';
import { Diagram, Segmented } from 'dsviz/react';

type View = 'before' | 'merge' | 'rebase';
const base: Commit[] = [
  { hash: 'c3', parents: ['c2'], label: 'Fix login redirect' },
  { hash: 'f2', parents: ['f1'], label: 'Add dark theme toggle' },
  { hash: 'f1', parents: ['c2'], label: 'Extract theme tokens' },
  { hash: 'c2', parents: ['c1'], label: 'Cache user profile' },
  { hash: 'c1', parents: [], label: 'Initial commit' },
];
const pictures: Record<View, { commits: Commit[]; refs: Ref[]; highlight?: string[]; note: string }> = {
  before: {
    commits: base,
    refs: [{ name: 'main', hash: 'c3', kind: 'branch' }, { name: 'feature', hash: 'f2', kind: 'branch' }, { name: 'HEAD', hash: 'f2', kind: 'head' }],
    note: 'feature forked from main at c2; both moved on since.',
  },
  merge: {
    commits: [{ hash: 'm1', parents: ['c3', 'f2'], label: "Merge branch 'feature'" }, ...base],
    refs: [{ name: 'main', hash: 'm1', kind: 'branch' }, { name: 'HEAD', hash: 'm1', kind: 'head' }, { name: 'feature', hash: 'f2', kind: 'branch' }],
    highlight: ['m1'],
    note: 'git merge feature: one new commit with two parents. Nothing else changes.',
  },
  rebase: {
    commits: [
      { hash: "f2'", parents: ["f1'"], label: 'Add dark theme toggle' },
      { hash: "f1'", parents: ['c3'], label: 'Extract theme tokens' },
      ...base.filter((c) => !c.hash.startsWith('f')),
    ],
    refs: [{ name: 'feature', hash: "f2'", kind: 'branch' }, { name: 'HEAD', hash: "f2'", kind: 'head' }, { name: 'main', hash: 'c3', kind: 'branch' }],
    highlight: ["f1'", "f2'"],
    note: 'git rebase main: f1 and f2 are replayed on top of c3 as new commits, so history is one straight line.',
  },
};

export default function GitGraph() {
  const [view, setView] = useState<View>('before');
  const p = pictures[view];
  return (
    <>
      <Diagram scene={graph(p.commits, p.refs, { highlight: p.highlight })} camera="fit" />
      <p className="status">{p.note}</p>
      <Segmented value={view} onChange={setView} options={[{ value: 'before', label: 'Before' }, { value: 'merge', label: 'Merge' }, { value: 'rebase', label: 'Rebase' }]} />
    </>
  );
}
