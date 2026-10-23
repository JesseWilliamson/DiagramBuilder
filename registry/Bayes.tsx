// A test that is "99% accurate" can still be wrong most of the time it says yes.
// The tree multiplies along each path; Bayes' rule is just "of the + leaves, how much is sick?"
import { useState } from 'react';
import { combine, rect, text } from '@figurae/core';
import { probTree } from '@figurae/prob';
import { Diagram, MathText, Slider } from '@figurae/react';

const pct = (p: number) => `${+(p * 100).toFixed(p < 0.01 ? 2 : 1)}%`;

export default function Bayes() {
  const [prior, setPrior] = useState(1); // % of people who are sick
  const [sens, setSens] = useState(99); // P(+ | sick)
  const [spec, setSpec] = useState(95); // P(− | healthy)
  const p = prior / 100, se = sens / 100, sp = spec / 100;

  const tree = probTree(
    {
      key: 'all', label: 'person', children: [
        { key: 'sick', label: 'sick', p, children: [{ key: 'pos', label: '+', p: se }, { key: 'neg', label: '−', p: 1 - se }] },
        { key: 'well', label: 'healthy', p: 1 - p, children: [{ key: 'pos', label: '+', p: 1 - sp }, { key: 'neg', label: '−', p: sp }] },
      ],
    },
    { levelGap: 140, leafGap: 40, format: pct, tones: { 'all/sick/pos': 'success', 'all/well/pos': 'danger' } },
  );
  const tp = p * se, fp = (1 - p) * (1 - sp);
  const posterior = tp / (tp + fp);

  // Among everyone who tests positive: true positives vs false positives, as one bar.
  const W = 380, y = 160;
  const split = W * posterior;
  const bar = [
    text({ id: 'bar:title', x: 0, y: y - 18, text: 'everyone who tests +', size: 12, role: 'caption', anchor: 'start' }),
    rect({ id: 'bar:tp', x: split / 2, y, w: Math.max(0, split), h: 18, rx: 3, tone: 'success' }),
    rect({ id: 'bar:fp', x: split + (W - split) / 2, y, w: Math.max(0, W - split), h: 18, rx: 3, tone: 'danger' }),
    text({ id: 'bar:tp:t', x: 4, y: y + 22, text: `sick ${pct(posterior)}`, size: 12, role: 'value', tone: 'success', anchor: 'start' }),
    text({ id: 'bar:fp:t', x: W - 4, y: y + 22, text: `healthy ${pct(1 - posterior)}`, size: 12, role: 'value', tone: 'danger', anchor: 'end' }),
  ];

  return (
    <>
      <Diagram scene={combine(tree, bar)} />
      <div className="row"><div className="grow"><Slider label="Prevalence" value={prior} onChange={setPrior} min={0.1} max={20} step={0.1} format={(v) => `${v}%`} /></div></div>
      <div className="row"><div className="grow"><Slider label="Sensitivity" value={sens} onChange={setSens} min={50} max={100} step={0.5} format={(v) => `${v}%`} /></div></div>
      <div className="row"><div className="grow"><Slider label="Specificity" value={spec} onChange={setSpec} min={50} max={100} step={0.5} format={(v) => `${v}%`} /></div></div>
      <p className="status formula">
        <MathText tex="P(\text{sick} \mid +) =" /> <span className="tone-success">{tp.toFixed(4)}</span> / (<span className="tone-success">{tp.toFixed(4)}</span> + <span className="tone-danger">{fp.toFixed(4)}</span>) = <b>{pct(posterior)}</b>
      </p>
      <p className="hint">With 1% prevalence, most positives are false. What has to change for a positive to mean “probably sick”?</p>
    </>
  );
}
