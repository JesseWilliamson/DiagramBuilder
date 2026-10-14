import { Editor } from './live/Editor';
import type { useLive } from './live/useLive';

/** The demo's source, editable, in a panel that slides in from the right. */
export function CodeDrawer({ open, onClose, file, live }: { open: boolean; onClose: () => void; file: string; live: ReturnType<typeof useLive> }) {
  return (
    <>
      <div className={`drawer-scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'is-open' : ''}`} aria-hidden={!open} aria-label="Code for this diagram">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">Live code</div>
            <div className="drawer-file">{file}</div>
          </div>
          <div className="drawer-actions">
            {live.edited && <button type="button" className="pill-btn white small" onClick={live.reset}>Reset</button>}
            <button type="button" className="pill-btn dark small" onClick={live.run} title="Ctrl/⌘ + Enter">Run</button>
            <button type="button" className="nav-icon" onClick={onClose} aria-label="Close code">✕</button>
          </div>
        </div>
        <p className="drawer-note">This is the real component, importing from <code>dsviz</code>. Edit it and the diagram updates.</p>
        <div className="drawer-editor">
          {open && <Editor value={live.code} onChange={live.setCode} onRun={live.run} label={`Code for ${file}`} />}
        </div>
        {live.error && <pre className="drawer-error">{live.error}</pre>}
      </aside>
    </>
  );
}
