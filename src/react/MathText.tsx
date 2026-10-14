import { Fragment } from 'react';
import { parseMath } from '../mathtext';
import { injectControlStyles } from './controls-styles';

/**
 * The same TeX-lite typesetting as a diagram's maths labels, for the HTML
 * around it, so a status line and a label set "x²" the same way.
 *
 *   <MathText tex="a^2 + b^2 = c^2" />
 */
export function MathText({ tex }: { tex: string }) {
  injectControlStyles();
  return (
    <span className="dvc-math">
      {parseMath(tex).map((s, i) => {
        const inner = s.italic ? <i>{s.text}</i> : <Fragment>{s.text}</Fragment>;
        return s.shift === 1 ? <sup key={i}>{inner}</sup> : s.shift === -1 ? <sub key={i}>{inner}</sub> : <Fragment key={i}>{inner}</Fragment>;
      })}
    </span>
  );
}
