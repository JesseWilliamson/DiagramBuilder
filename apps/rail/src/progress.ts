// Which lessons are done: a lesson counts as done when its last check is answered
// correctly. Kept in localStorage (it is only a convenience, so a blocked store is fine).
import { useSyncExternalStore } from 'react';

const KEY = 'rail-progress';
let done: Set<string> = load();
const listeners = new Set<() => void>();

function load(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function markDone(slug: string) {
  if (done.has(slug)) return;
  done = new Set(done).add(slug);
  try {
    localStorage.setItem(KEY, JSON.stringify([...done]));
  } catch {
    /* storage blocked: progress lasts for this visit only */
  }
  listeners.forEach((l) => l());
}

export function useDone(): ReadonlySet<string> {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => done,
  );
}
