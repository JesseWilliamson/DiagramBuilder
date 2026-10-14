import { Component, ComponentType, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { compile } from './compile';

/**
 * A demo's live state: the code being edited and the component it compiles
 * to. The lesson card renders `Live`, the code drawer edits `code`; both share
 * this one hook, so typing in the drawer updates the diagram in the lesson.
 * Render it as `<Boundary key={live.runKey} onError={live.onRenderError}><live.C /></Boundary>`.
 */
export function useLive(source: string, initial: ComponentType) {
  const [code, setCodeState] = useState(source);
  const [comp, setComp] = useState<{ C: ComponentType }>({ C: initial });
  const [run, setRun] = useState(0); // remount key: a fixed demo renders fresh
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // a new demo (next step): start over from its source
  useEffect(() => {
    setCodeState(source);
    setComp({ C: initial });
    setError(null);
    setRun((r) => r + 1);
  }, [source, initial]);

  const build = useCallback((src: string) => {
    try {
      setComp({ C: compile(src) });
      setRun((r) => r + 1);
      setError(null);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, []);
  const setCode = (v: string) => {
    setCodeState(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => build(v), 700);
  };
  const reset = () => {
    setCodeState(source);
    setComp({ C: initial });
    setRun((r) => r + 1);
    setError(null);
  };
  // Note: return the component and a key, never a component defined in here:
  // a new function every render would be a new component type, and React
  // would remount (and reset) the demo on every keystroke.
  return { code, setCode, run: () => build(code), reset, error, edited: code !== source, C: comp.C, runKey: run, onRenderError: (e: Error) => setError(`${e.name}: ${e.message}`) };
}

export class Boundary extends Component<{ children: ReactNode; onError: (e: Error) => void }, { failed: boolean }> {
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
