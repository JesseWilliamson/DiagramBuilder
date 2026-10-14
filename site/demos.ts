import type { ComponentType } from 'react';

/**
 * Every file in demos/ twice: once compiled by Vite (fast first paint) and once
 * as raw text (what the editor shows and recompiles when you change it).
 */
const modules = import.meta.glob<{ default: ComponentType }>('./demos/*.tsx', { eager: true });
const sources = import.meta.glob<string>('./demos/*.tsx', { eager: true, query: '?raw', import: 'default' });

export function demo(name: string): { initial: ComponentType; source: string; file: string } {
  const key = `./demos/${name}.tsx`;
  if (!modules[key]) throw new Error(`no demo ${name}`);
  return { initial: modules[key].default, source: sources[key], file: `${name}.tsx` };
}
