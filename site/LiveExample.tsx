import { useState } from 'react';
import { demo } from './demos';
import { Editor } from './live/Editor';
import { Boundary, useLive } from './live/useLive';

/** One example: the running diagram, and the code that draws it (editable). */
export function LiveExample({ name, title, desc }: { name: string; title: string; desc: string }) {
  const d = demo(name);
  const live = useLive(d.source, d.initial);
  const [open, setOpen] = useState(false);
  return (
    <article className="example" id={name}>
      <div className="ex-head">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      <div className="ex-body">
        <div className="ex-stage">
          <Boundary key={live.runKey} onError={live.onRenderError}>
            <live.C />
          </Boundary>
        </div>
        <div className={`ex-code ${open ? 'is-open' : ''}`}>
          <div className="ex-code-bar">
            <span>{d.file}</span>
            <span className="ex-code-actions">
              {live.edited && <button type="button" onClick={live.reset}>Reset</button>}
              <button type="button" onClick={live.run} title="Ctrl/⌘ + Enter">Run</button>
            </span>
          </div>
          <div className="ex-editor">
            <Editor value={live.code} onChange={live.setCode} onRun={live.run} label={`Code for ${title}`} />
          </div>
          <button type="button" className="ex-expand" onClick={() => setOpen(!open)}>{open ? 'Collapse' : 'Show all code'}</button>
          {live.error && <pre className="ex-error">{live.error}</pre>}
        </div>
      </div>
    </article>
  );
}
