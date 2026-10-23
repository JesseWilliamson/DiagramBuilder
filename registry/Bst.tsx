// A binary search tree you can grow. The tree is your own plain object; figurae only lays it out.
// New nodes grow out of their parent because the layout gives them `enter` = the parent's position.
import { useEffect, useRef, useState } from 'react';
import { Tone } from '@figurae/core';
import { binaryTree, BinaryTreeNode } from '@figurae/ds';
import { Button, Diagram, NumberStepper } from '@figurae/react';

type Node = { key: number; left: Node | null; right: Node | null };

function insert(n: Node | null, key: number): Node {
  if (!n) return { key, left: null, right: null };
  if (key < n.key) return { ...n, left: insert(n.left, key) }; // copy on write: React sees a new tree
  if (key > n.key) return { ...n, right: insert(n.right, key) };
  return n;
}

function searchPath(root: Node | null, key: number): number[] {
  const path: number[] = [];
  for (let n = root; n; n = key < n.key ? n.left : n.right) {
    path.push(n.key);
    if (n.key === key) break;
  }
  return path;
}

const start = [50, 30, 70, 20, 40, 60, 85, 35].reduce<Node | null>(insert, null);

export default function Bst() {
  const [root, setRoot] = useState<Node | null>(start);
  const [value, setValue] = useState(45);
  const [tones, setTones] = useState<Record<number, Tone>>({});
  const [msg, setMsg] = useState('Insert a value, or click a node to search for it.');
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Walk the search path one node per tick, then call done().
  function walk(key: number, done: () => void) {
    timers.current.forEach(clearTimeout);
    const path = searchPath(root, key);
    path.forEach((k, i) =>
      timers.current.push(window.setTimeout(() => {
        setTones({ ...Object.fromEntries(path.slice(0, i).map((p) => [p, 'visited' as Tone])), [k]: 'active' });
        setMsg(k === key ? `Found ${k}.` : `${key} ${key < k ? '<' : '>'} ${k}: go ${key < k ? 'left' : 'right'}.`);
      }, i * 420)),
    );
    timers.current.push(window.setTimeout(done, path.length * 420));
  }

  function add(key: number) {
    walk(key, () => {
      const exists = searchPath(root, key).includes(key);
      setRoot((r) => insert(r, key));
      setTones({ [key]: exists ? 'active' : 'success' });
      setMsg(exists ? `${key} is already in the tree.` : `Inserted ${key}.`);
    });
  }

  const scene = binaryTree(root as BinaryTreeNode | null, { tones, edgeTones: tones, interactive: true, r: 18, dx: 40, dy: 58 });

  return (
    <>
      <Diagram
        scene={scene}
        onClick={(e) => {
          const key = (e.node.data as { key?: number } | undefined)?.key;
          if (key !== undefined) walk(key, () => setTones({ [key]: 'success' }));
        }}
      />
      <p className="status">{msg}</p>
      <div className="row">
        <NumberStepper label="Value" value={value} onChange={setValue} min={1} max={99} />
        <Button variant="primary" onClick={() => add(value)}>Insert</Button>
        <Button onClick={() => { const v = 1 + Math.floor(Math.random() * 99); setValue(v); add(v); }}>Random</Button>
        <Button onClick={() => { timers.current.forEach(clearTimeout); setRoot(null); setTones({}); setMsg('Empty tree.'); }}>Clear</Button>
      </div>
    </>
  );
}
