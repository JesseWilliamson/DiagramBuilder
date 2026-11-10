// Hash routes (#/, #/lesson/<slug>, #/glossary), so the built site works from any folder or GitHub Pages.
import { useEffect, useState } from 'react';

export type Route = { page: 'home' } | { page: 'glossary' } | { page: 'lesson'; slug: string };

export function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'lesson' && parts[1]) return { page: 'lesson', slug: parts[1] };
  if (parts[0] === 'glossary') return { page: 'glossary' };
  return { page: 'home' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
