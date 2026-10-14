// Finished lessons, remembered per browser. Best-effort: storage can be blocked.
const KEY = 'dsviz-progress';
export function loadDone(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
}
export function markDone(id: string) {
  const s = loadDone();
  s.add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}
