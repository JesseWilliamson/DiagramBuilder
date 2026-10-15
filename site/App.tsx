import { useEffect, useState } from 'react';
import { Api } from './Api';
import { Examples, Home } from './Pages';
import { Guide } from './Guide';
import { useRoute } from './router';

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('dsviz-theme', theme); } catch { /* storage blocked */ }
  }, [theme]);
  return (
    <button className="theme-btn" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle dark mode">
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}

export function App() {
  const [page] = useRoute();
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="logo" href="#/">dsviz</a>
          <nav>
            <a href="#/examples" aria-current={page === 'examples'}>Examples</a>
            <a href="#/guide" aria-current={page === 'guide'}>Guide</a>
            <a href="#/api" aria-current={page === 'api'}>API</a>
            <a href="https://github.com/JesseWilliamson/DiagramBuilder" target="_blank" rel="noreferrer">GitHub</a>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main>
        {page === 'examples' ? <Examples /> : page === 'guide' ? <Guide /> : page === 'api' ? <Api /> : <Home />}
      </main>
      <footer className="foot">dsviz · interactive SVG diagrams for teaching · MIT</footer>
    </>
  );
}
