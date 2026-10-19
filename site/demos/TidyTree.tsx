// An n-ary tree (a project's folders) laid out two ways. 'leaves' gives every
// leaf its own column: simple, never overlaps, but wide. 'tidy' (Reingold–
// Tilford) pushes each subtree left until its outline almost touches the one
// before it, so the same tree fits in far less width. Add files and watch the
// subtrees make room: nodes are keyed by path, so everything slides.
import { useState } from 'react';
import { tree } from 'dsviz';
import type { TreeNode } from 'dsviz';
import { Button, Diagram, Segmented } from 'dsviz/react';

const start: TreeNode = {
  key: 'src', children: [
    { key: 'src/ds', label: 'ds', children: [{ key: 'src/ds/array', label: 'array.ts' }, { key: 'src/ds/tree', label: 'tree.ts' }] },
    { key: 'src/layout', label: 'layout', children: [{ key: 'src/layout/layered', label: 'layered.ts' }, { key: 'src/layout/tidy', label: 'tidy.ts' }] },
    { key: 'src/index', label: 'index.ts' },
    { key: 'src/react', label: 'react', children: [{ key: 'src/react/Diagram', label: 'Diagram.tsx' }] },
  ],
};

/** Add a file to the n-th folder (round robin), immutably. */
function addFile(t: TreeNode, count: number): TreeNode {
  const folders = (t.children ?? []).filter((c) => c.children);
  const target = folders[count % folders.length];
  return {
    ...t,
    children: t.children!.map((c) => (c === target ? { ...c, children: [...c.children!, { key: `${c.key}/new${count}`, label: `new${count}.ts` }] } : c)),
  };
}

export default function TidyTree() {
  const [layout, setLayout] = useState<'tidy' | 'leaves'>('tidy');
  const [root, setRoot] = useState(start);
  const [n, setN] = useState(0);
  return (
    <>
      <Diagram scene={tree(root, { layout, shape: 'rect', r: 16, dy: 64, tones: { src: 'accent' } })} camera="fit" />
      <div className="row">
        <Segmented value={layout} onChange={setLayout} options={[{ value: 'tidy', label: 'Tidy' }, { value: 'leaves', label: 'One column per leaf' }]} />
        <Button onClick={() => (setRoot(addFile(root, n)), setN(n + 1))}>Add a file</Button>
        <Button onClick={() => (setRoot(start), setN(0))}>Reset</Button>
      </div>
    </>
  );
}
