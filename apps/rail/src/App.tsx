import { useEffect, useState } from 'react';
import { Glossary } from './Glossary';
import { lessons, sections } from './lessons';
import { useDone } from './progress';
import { useRoute } from './router';

function Mark() {
  // two running lines and a red lamp: the controller's view of the railway
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" />
      <path d="M7 20 H25 M7 12 H25" stroke="var(--background)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="12" r="3.4" fill="#ff5d5d" />
    </svg>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('rail-theme', dark ? 'dark' : 'light');
    } catch {
      /* storage blocked */
    }
  }, [dark]);
  return (
    <button type="button" className="icon-btn" onClick={() => setDark(!dark)} aria-label={dark ? 'Use light theme' : 'Use dark theme'} title="Theme">
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}

function Sidebar({ current }: { current?: string }) {
  const done = useDone();
  return (
    <nav className="sidebar" aria-label="Lessons">
      <a className="side-back" href="#/">← Network Control</a>
      {sections.map((s, i) => (
        <div key={s.title}>
          <div className="side-group"><span>{i + 1}</span><span>{s.title}</span></div>
          {s.lessons.map((l) => (
            <a key={l.slug} className="side-link" href={`#/lesson/${l.slug}`} aria-current={l.slug === current ? 'page' : undefined}>
              <span className={`dot${done.has(l.slug) ? ' done' : ''}`} aria-label={done.has(l.slug) ? 'done' : undefined} />
              {l.title}
            </a>
          ))}
        </div>
      ))}
      <hr className="side-rule" />
      <a className="side-link" href="#/glossary">Glossary</a>
      <p className="side-note" style={{ marginTop: 12 }}>A teaching aid, not a rulebook. Work to your network's current rules.</p>
    </nav>
  );
}

function Home() {
  const done = useDone();
  return (
    <div className="prose">
      <div className="eyebrow">A course in rail safeworking</div>
      <h1>Network Control</h1>
      <p className="lede">
        How trains are kept apart on Australian railways, learned from the seat that does it: the network controller's. Each lesson has a figure you work
        yourself, as the controller would.
      </p>
      <p>
        A network controller (a Network Control Officer on ARTC's interstate network, a signaller on many metropolitan ones) plans and authorises every
        movement on their board. They set routes, issue authorities, protect people working on the track, and talk to drivers and track workers all
        shift. Almost everything they do comes down to one question:{' '}
        <b>what stops two things being in the same place at the same time?</b> Sometimes the answer is signals and interlocking. Sometimes it is a piece of
        paper, or a sentence read back over the radio.
      </p>
      <div className="cards">
        {lessons.map((l, i) => (
          <a key={l.slug} className="card-link" href={`#/lesson/${l.slug}`}>
            <small>{String(i + 1).padStart(2, '0')}{done.has(l.slug) ? ' · done' : ''}</small>
            <b>{l.title}</b>
            <span>{l.blurb}</span>
          </a>
        ))}
      </div>
      <p className="disclaimer">
        Australia has several rulebooks: ARTC's for the interstate network and the Hunter Valley, Sydney Trains' for the Sydney network, and separate ones for Victoria, Queensland, WA and Tasmania. They share most
        ideas but differ in names, numbers and detail. This course teaches the ideas using the NSW-derived terms (TOA, LPA, ASB…). It is not a substitute
        for accredited training or for the current rules of the network you work on.
      </p>
    </div>
  );
}

function LessonPage({ slug }: { slug: string }) {
  const i = lessons.findIndex((l) => l.slug === slug);
  if (i < 0) return <Home />;
  const { Body, title } = lessons[i];
  const prev = lessons[i - 1], next = lessons[i + 1];
  return (
    <article>
      <div className="eyebrow">Lesson {i + 1} of {lessons.length}</div>
      <h1>{title}</h1>
      <Body />
      <nav className="pager" aria-label="More lessons">
        {prev && <a href={`#/lesson/${prev.slug}`}><small>← Previous</small>{prev.title}</a>}
        {next ? <a className="next" href={`#/lesson/${next.slug}`}><small>Next →</small>{next.title}</a> : <a className="next" href="#/glossary"><small>Next →</small>Glossary</a>}
      </nav>
    </article>
  );
}

export function App() {
  const route = useRoute();
  useEffect(() => {
    const t = route.page === 'lesson' ? lessons.find((l) => l.slug === route.slug)?.title : route.page === 'glossary' ? 'Glossary' : undefined;
    document.title = t ? `${t} · Network Control` : "Network Control: rail working from the controller's desk";
  }, [route]);
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/"><Mark /><span className="brand-name">Network Control</span></a>
        <nav>
          <a href={`#/lesson/${lessons[0].slug}`} aria-current={route.page === 'lesson' ? 'page' : undefined}>Lessons</a>
          <a href="#/glossary" aria-current={route.page === 'glossary' ? 'page' : undefined}>Glossary</a>
        </nav>
        <ThemeToggle />
      </header>
      <div className="layout">
        <Sidebar current={route.page === 'lesson' ? route.slug : undefined} />
        <main className="content">
          {route.page === 'lesson' ? <LessonPage key={route.slug} slug={route.slug} /> : route.page === 'glossary' ? <Glossary /> : <Home />}
        </main>
      </div>
      <footer className="foot">Network Control · interactive lessons in Australian rail safeworking · figures drawn with dsviz</footer>
    </>
  );
}
