import { useCallback, useEffect, useRef, useState } from 'react';
import { groups } from './examples';
import { Editor } from './live/Editor';
import { asObservableCell, kitCellSource, runCell } from './d3/run';

/** Every cell in d3/cells/, as text. A cell that has not been written yet is simply missing. */
const sources = import.meta.glob<string>('./d3/cells/*.js', { eager: true, query: '?raw', import: 'default' });

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

/** One example: the running d3 cell, and the code behind it (editable). */
function D3Example({ name, title, desc }: { name: string; title: string; desc: string }) {
  const original = sources[`./d3/cells/${name}.js`];
  const [code, setCode] = useState(original ?? '');
  const [run, setRun] = useState({ code: original ?? '', n: 0 });
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Mount the cell. Cleanup resolves `invalidation`, exactly as Observable does when a cell re-runs.
  useEffect(() => {
    if (!original) return;
    let alive = true;
    let invalidate!: () => void;
    const invalidation = new Promise<void>((resolve) => (invalidate = resolve));
    runCell(run.code, invalidation)
      .then((node) => {
        if (!alive) return;
        host.current?.replaceChildren(node);
        setError(null);
      })
      .catch((e: Error) => alive && setError(`${e.name}: ${e.message}`));
    return () => {
      alive = false;
      invalidate();
    };
  }, [run, original]);

  const rerun = useCallback((src: string) => setRun((r) => ({ code: src, n: r.n + 1 })), []);
  const edit = (v: string) => {
    setCode(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => rerun(v), 700);
  };
  const reset = () => { setCode(original); rerun(original); };

  return (
    <article className="example" id={name}>
      <div className="ex-head">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      {!original ? (
        <p className="ex-intro">Not written yet.</p>
      ) : (
        <div className="ex-body">
          <div className="ex-stage">
            <div ref={host} />
          </div>
          <div className={`ex-code ${open ? 'is-open' : ''}`}>
            <div className="ex-code-bar">
              <span>{name}.js</span>
              <span className="ex-code-actions">
                {code !== original && <button type="button" onClick={reset}>Reset</button>}
                <CopyButton text={asObservableCell(name.replace(/^./, (c) => c.toLowerCase()), code)} label="Copy for Observable" />
                <button type="button" onClick={() => rerun(code)} title="Ctrl/⌘ + Enter">Run</button>
              </span>
            </div>
            <div className="ex-editor">
              <Editor value={code} onChange={edit} onRun={() => rerun(code)} label={`d3 code for ${title}`} />
            </div>
            <button type="button" className="ex-expand" onClick={() => setOpen(!open)}>{open ? 'Collapse' : 'Show all code'}</button>
            {error && <pre className="ex-error">{error}</pre>}
          </div>
        </div>
      )}
    </article>
  );
}

export function ExamplesD3() {
  return (
    <div className="examples-layout">
      <nav className="doc-toc" aria-label="Examples">
        <a href="#/examples-d3" onClick={(e) => { e.preventDefault(); document.getElementById('d3-setup')?.scrollIntoView({ behavior: 'smooth' }); }}>Using in Observable</a>
        {groups.map((g) => (
          <div key={g.id}>
            <div className="toc-group">{g.title}</div>
            {g.items.map((it) => (
              <a key={it.name} href="#/examples-d3" onClick={(e) => { e.preventDefault(); document.getElementById(it.name)?.scrollIntoView({ behavior: 'smooth' }); }}>{it.title}</a>
            ))}
          </div>
        ))}
      </nav>
      <div className="examples-main">
        <h1>Examples in d3</h1>
        <p className="lede">
          The same diagrams as the <a href="#/examples">examples page</a>, redrawn with plain <a href="https://d3js.org" target="_blank" rel="noreferrer">d3</a> instead of
          dsviz. Each one is a notebook cell: the code beside it is the whole thing, editable here, and pastable into Observable.
        </p>
        <section id="d3-setup" className="d3-setup">
          <h2>Using these in Observable</h2>
          <ol>
            <li>Make a cell called <code>kit</code> and paste the kit into it. It is about 300 lines of plumbing (stylesheet, controls, a step player, arrowheads); none of it draws.</li>
            <li>For any example, press <b>Copy for Observable</b> and paste it as a new cell. It is already wrapped as <code>name = &#123; … &#125;</code>.</li>
          </ol>
          <p className="ex-intro">
            Observable already provides <code>d3</code>, so there is nothing to import. A cell <code>return</code>s a DOM node, and timers are cleaned up with the
            <code> invalidation</code> promise. Where a cell uses <code>kit.slider</code> and friends you can swap in Observable's <code>Inputs</code>.
          </p>
          <div className="row"><CopyButton text={asObservableCell('kit', kitCellSource).replace('kit = {', 'kit = {')} label="Copy the kit for Observable" /></div>
        </section>
        {groups.map((g) => (
          <section key={g.id} className="ex-group">
            <h2>{g.title}</h2>
            <p className="ex-intro">{g.intro}</p>
            {g.items.map((it) => <D3Example key={it.name} {...it} />)}
          </section>
        ))}
      </div>
    </div>
  );
}
