import katex from 'katex';
import { useMemo } from 'react';

/**
 * Inline (or display) maths. KaTeX with `output: 'mathml'` emits MathML, which
 * browsers render natively, so no KaTeX fonts or CSS are needed.
 */
export function M({ children, display }: { children: string; display?: boolean }) {
  const html = useMemo(() => katex.renderToString(children, { output: 'mathml', displayMode: display, throwOnError: false }), [children, display]);
  return <span className={display ? 'math display' : 'math'} dangerouslySetInnerHTML={{ __html: html }} />;
}
