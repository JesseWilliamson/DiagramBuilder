import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BinarySearch } from './BinarySearch';
import { WhyFast } from './WhyFast';

function App() {
  return (
    <main>
      <button className="toggle" onClick={() => {
        const r = document.documentElement;
        r.dataset.theme = r.dataset.theme === 'light' ? 'dark' : 'light';
      }}>theme</button>
      <h2>The idea</h2>
      <BinarySearch />
      <h2>Why it is fast</h2>
      <WhyFast />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
