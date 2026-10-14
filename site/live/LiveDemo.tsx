import { Component, ComponentType, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { compile } from './compile';
import { Editor } from './Editor';

class Boundary extends Component<{ children: ReactNode; onError: (e: Error) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: Error) {
    this.props.onError(e);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface LiveDemoProps {
  /** The demo module's source text (imported with ?raw). */
  source: string;
  /** The same module, compiled by Vite: used until the code is edited. */
  initial: ComponentType;
  file: string;
}

/**
 * Code on the left, the running demo on the right. Edits recompile after a
 * short pause (or immediately with Ctrl/⌘+Enter). A compile or render error
 * is shown under the code and the last working version keeps running.
 */
export function LiveDemo({ source, initial, file }: LiveDemoProps) {
  const [code, setCode] = useState(source);
  const [Demo, setDemo] = useState<{ C: ComponentType }>({ C: initial });
  const [run, setRun] = useState(0); // bumps the boundary key so a fixed demo can render again
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const build = useCallback((src: string) => {
    try {
      const C = compile(src);
      setDemo({ C });
      setRun((r) => r + 1);
      setError(null);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onChange = (v: string) => {
    setCode(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => build(v), 700);
  };

  return (
    <div className="demo">
      <div className="editor-pane">
        <div className="editor-bar">
          <span className="fname">{file}</span>
          {code !== source && (
            <button type="button" className="chip-btn" onClick={() => { setCode(source); setDemo({ C: initial }); setRun((r) => r + 1); setError(null); }}>
              Reset
            </button>
          )}
          <button type="button" className="chip-btn primary" onClick={() => build(code)} title="Ctrl/⌘ + Enter">Run</button>
        </div>
        <div className="editor-scroll">
          <Editor value={code} onChange={onChange} onRun={() => build(code)} label={`Code for ${file}`} />
        </div>
        {error && <pre className="error">{error}</pre>}
      </div>
      <div className="stage-pane">
        <div className="stage">
          <Boundary key={run} onError={(e) => { setError(`${e.name}: ${e.message}`); }}>
            <Demo.C />
          </Boundary>
        </div>
      </div>
    </div>
  );
}
