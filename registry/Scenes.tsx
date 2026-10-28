// The one rule behind every animation: nodes are matched by id.
//   same id  → it moves from where it is to where it should be
//   new id   → it fades in (here: drops in from above)
//   gone id  → it fades out (here: falls away)
import { useState } from 'react';
import { circle, rect, SceneNode, text, Tone } from 'dsviz';
import { Button, Diagram } from 'dsviz/react';

type Item = { id: number; shape: 'circle' | 'square'; tone: Tone };
const tones: Tone[] = ['active', 'accent', 'success', 'danger', 'visited'];
let next = 5;
const make = (id: number): Item => ({ id, shape: id % 2 ? 'circle' : 'square', tone: tones[id % tones.length] });

export default function Scenes() {
  const [items, setItems] = useState<Item[]>([0, 1, 2, 3, 4].map(make));

  const nodes: SceneNode[] = [];
  items.forEach((it, i) => {
    const x = 40 + i * 64, y = 40;
    const common = { id: `shape${it.id}`, x, y, tone: it.tone, enter: { y: -10 }, exit: { y: 90 } };
    nodes.push(it.shape === 'circle' ? circle({ ...common, r: 22 }) : rect({ ...common, w: 44, h: 44, rx: 6 }));
    nodes.push(text({ id: `label${it.id}`, x, y: 86, text: `#${it.id}`, size: 12, role: 'index', enter: { y: 30 }, exit: { y: 130 } }));
  });

  return (
    <>
      <Diagram scene={{ nodes }} viewBox={[0, 0, 400, 110]} />
      <div className="row">
        <Button onClick={() => setItems((xs) => [...xs].sort(() => Math.random() - 0.5))}>Shuffle</Button>
        <Button onClick={() => setItems((xs) => (xs.length < 6 ? [...xs, make(next++)] : xs))}>Add</Button>
        <Button onClick={() => setItems((xs) => xs.slice(1))}>Remove first</Button>
        <Button onClick={() => setItems((xs) => xs.map((x) => ({ ...x, tone: tones[Math.floor(Math.random() * tones.length)] })))}>Recolour</Button>
      </div>
    </>
  );
}
