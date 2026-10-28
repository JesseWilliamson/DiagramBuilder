// The same history drawn the ways different git clients draw it. Two choices
// decide the picture: how rows are ORDERED (here: as git log prints them) and
// how COLUMNS are assigned. Straight lanes keep a slot for each branch, so
// nothing moves sideways (GitKraken); compact lanes insert a merged branch
// beside its merge and remove finished columns, so neighbours shift (Git
// Extensions, gitk). Pinning main holds the left column for it wherever its tip
// is; folding hides a merged branch behind a hollow merge dot (click it); a
// lane cap cuts the far lanes and marks them with git's ~. feature-c's tip is
// the newest commit, so without the pin it would take the left column.
import { useState } from 'react';
import { Commit, graph as gitGraph, Ref } from 'dsviz/git';
import { Diagram, NumberStepper, Segmented, Switch } from 'dsviz/react';

// newest first; a merge's first parent is the branch it was merged into
const history: Commit[] = [
  { hash: 'C2', parents: ['C1'], label: 'Retry uploads' },
  { hash: 'M5', parents: ['M4'], label: 'Bump version' },
  { hash: 'M4', parents: ['M3', 'A2'], label: "Merge 'feature-a'" },
  { hash: 'B2', parents: ['B1'], label: 'Dark theme: toggle' },
  { hash: 'A2', parents: ['A1'], label: 'Search: ranking' },
  { hash: 'C1', parents: ['M2'], label: 'Upload queue' },
  { hash: 'A1', parents: ['M3'], label: 'Search: index' },
  { hash: 'M3', parents: ['M2'], label: 'Fix login redirect' },
  { hash: 'B1', parents: ['M1'], label: 'Dark theme: tokens' },
  { hash: 'M2', parents: ['M1'], label: 'Cache user profile' },
  { hash: 'M1', parents: ['M0'], label: 'Add settings page' },
  { hash: 'M0', parents: [], label: 'Initial commit' },
];
const refs: Ref[] = [
  { name: 'main', hash: 'M5', kind: 'branch' },
  { name: 'feature-c', hash: 'C2', kind: 'branch' },
  { name: 'feature-b', hash: 'B2', kind: 'branch' },
  { name: 'feature-a', hash: 'A2', kind: 'branch' },
];

export default function GitLayouts() {
  const [lanes, setLanes] = useState<'straight' | 'compact'>('straight');
  const [bend, setBend] = useState<'curve' | 'corner' | 'angle'>('curve');
  const [pin, setPin] = useState(true);
  const [fold, setFold] = useState<string[]>([]);
  const [cap, setCap] = useState(5);
  const scene = gitGraph(history, refs, { lanes, bend, pin: pin ? ['M5'] : [], fold, maxLanes: cap, interactive: true });
  const toggleFold = (hash: string) => setFold(fold.includes(hash) ? fold.filter((h) => h !== hash) : [...fold, hash]);
  return (
    <>
      <Diagram
        scene={scene}
        camera="fit"
        label="A commit graph with main and three feature branches, drawn with the chosen lane style"
        onClick={(e) => {
          const hash = (e.node.data as { hash?: string })?.hash;
          if (hash && history.find((c) => c.hash === hash)!.parents.length > 1) toggleFold(hash);
        }}
      />
      <p className="status">
        {lanes === 'straight' ? 'Straight: a finished column stays an empty slot for the next branch; no line moves sideways.' : 'Compact: feature-a opens beside its merge and its column is removed at the fork, so feature-b and feature-c shift.'}
        {fold.length ? ' The merge is folded: click it to unfold.' : ' Click the merge to fold feature-a.'}
      </p>
      <div className="row">
        <Segmented label="Lanes" value={lanes} onChange={setLanes} options={[{ value: 'straight', label: 'Straight' }, { value: 'compact', label: 'Compact' }]} />
        <Segmented label="Bend" value={bend} onChange={setBend} options={[{ value: 'curve', label: 'Curve' }, { value: 'corner', label: 'Corner' }, { value: 'angle', label: 'Angle' }]} />
        <Switch label="Pin main left" checked={pin} onChange={setPin} />
        <NumberStepper label="Lane cap" value={cap} onChange={setCap} min={1} max={5} />
      </div>
    </>
  );
}
