// Raw primitives: every layout in dsviz is built from rect, circle, text, arrow and path.
import { useState } from 'react';
import { SceneNode, arrow, rect, text } from 'dsviz';
import { Button, Diagram } from 'dsviz/react';

const steps = [
  { id: 'state', label: 'your state', sub: '{ lo, hi, mid }' },
  { id: 'layout', label: 'layout()', sub: 'array(), plot.fn()' },
  { id: 'scene', label: 'Scene', sub: 'nodes with ids' },
  { id: 'view', label: '<Diagram>', sub: 'diff by id + tween' },
];

export default function Pipeline() {
  const [active, setActive] = useState(0);

  const nodes: SceneNode[] = [];
  steps.forEach((s, i) => {
    const on = i === active;
    const x = i * 170, y = on ? -8 : 0; // the active box lifts a little: same id, so it tweens
    nodes.push(
      rect({ id: s.id, x, y, w: 144, h: 64, rx: 10, tone: on ? 'accent' : undefined, interactive: true, data: i }),
      text({ id: `${s.id}:t`, x, y: y - 9, text: s.label, size: 15, weight: 600 }),
      text({ id: `${s.id}:s`, x, y: y + 13, text: s.sub, size: 11, role: 'caption' }),
    );
    if (i > 0) nodes.push(arrow({ id: `a${i}`, x1: x - 98, y1: 0, x2: x - 74, y2: 0, tone: i === active ? 'accent' : undefined }));
  });

  return (
    <>
      <Diagram scene={{ nodes }} height={150} onClick={(e) => typeof e.node.data === 'number' && setActive(e.node.data)} />
      <div className="row">
        <Button variant="primary" onClick={() => setActive((active + 1) % steps.length)}>Next stage</Button>
        <p className="hint">Click a box, or step through the pipeline.</p>
      </div>
    </>
  );
}
