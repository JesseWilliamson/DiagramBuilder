import { useEffect, useState } from 'react';

/** A tiny hash router: '#/course/x' → ['course', 'x']. Hash URLs work on GitHub Pages without a server. */
export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
export const go = (path: string) => { window.location.hash = path; };
