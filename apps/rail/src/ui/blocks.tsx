// The lesson building blocks, after getbetter's course pages: a figure card
// (diagram, controls panel, caption), a fact you can reveal, and a quick check.
import { useState, type ReactNode } from 'react';

export function Figure({ children, panel, caption, wide }: { children: ReactNode; panel?: ReactNode; caption?: ReactNode; wide?: boolean }) {
  return (
    <figure className="figure">
      <div className={`figure-body${wide || !panel ? ' wide' : ''}`}>
        <div className="figure-stage">{children}</div>
        {panel && <div className="figure-panel dvc">{panel}</div>}
      </div>
      {caption && <figcaption className="figure-caption">{caption}</figcaption>}
    </figure>
  );
}

/** A labelled control in the figure panel. */
export function Ctl({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ctl">
      <span className="ctl-label">{label}</span>
      {children}
    </div>
  );
}

const Bulb = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
  </svg>
);

/** A question with its answer hidden until asked for: try to answer it before you look. */
export function Fact({ q, children, kind = 'fact' }: { q: ReactNode; children: ReactNode; kind?: 'fact' | 'watch out' }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className={`fact${kind === 'watch out' ? ' warn' : ''}`}>
      <div className="fact-kind"><Bulb /> {kind}</div>
      <div className="fact-q">{q}</div>
      {open ? <div className="fact-a">{children}</div> : <button type="button" className="reveal" onClick={() => setOpen(true)}>Show the answer</button>}
    </aside>
  );
}

/** Multiple choice. One answer is right; every option explains itself, so a wrong pick still teaches. */
export function Check({ q, options, onAnswered }: { q: ReactNode; options: { text: ReactNode; right?: boolean; why: ReactNode }[]; onAnswered?: (right: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null && options[picked].right;
  return (
    <div className="check" role="group">
      <div className="check-q">{q}</div>
      <div className="check-opts">
        {options.map((o, i) => {
          const state = picked === i ? (o.right ? ' right' : ' wrong') : done && o.right ? ' right' : '';
          return (
            <button
              type="button"
              key={i}
              className={`check-opt${state}`}
              aria-disabled={done}
              onClick={() => {
                if (done) return;
                setPicked(i);
                onAnswered?.(!!o.right);
              }}
            >
              <span className="letter">{String.fromCharCode(65 + i)}</span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="check-why" aria-live="polite">
          <b className={options[picked].right ? 'ok' : 'bad'}>{options[picked].right ? 'Right. ' : 'Not quite. '}</b>
          {options[picked].why}
          {!options[picked].right && <span className="muted"> Try another.</span>}
        </div>
      )}
    </div>
  );
}
