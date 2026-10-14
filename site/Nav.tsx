import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('dsviz-theme', theme); } catch { /* storage blocked */ }
  }, [theme]);
  return (
    <button className="nav-icon" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      {theme === 'dark' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z" /></svg>
      )}
    </button>
  );
}

export function Wordmark() {
  return (
    <a className="wordmark" href="#/">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><rect x="2" y="2" width="20" height="20" rx="6" fill="#29cc57" /><path d="M7 15.5 11 10l3 3.5 3.5-5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      dsviz
    </a>
  );
}

/** The floating pill navbar from the home page. */
export function Nav({ page }: { page: string }) {
  return (
    <header className="nav-wrap">
      <nav className="nav-pill">
        <Wordmark />
        <div className="nav-links">
          <a href="#/courses" aria-current={page === 'courses'}>Courses</a>
          <a href="#/docs" aria-current={page === 'docs'}>Docs</a>
          <a href="https://github.com/JesseWilliamson/DiagramBuilder" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <ThemeToggle />
        <a className="pill-btn dark" href="#/lesson/algorithms/binary-search">Start learning</a>
      </nav>
    </header>
  );
}
