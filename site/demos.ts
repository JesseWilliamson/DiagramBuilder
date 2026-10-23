import type { ComponentType } from 'react';
import index from '../registry/index.json';

/**
 * Every file in registry/ twice: once compiled by Vite (fast first paint) and once
 * as raw text (what the editor shows and recompiles when you change it).
 */
const modules = import.meta.glob<{ default: ComponentType }>('../registry/*.tsx', { eager: true });
const sources = import.meta.glob<string>('../registry/*.tsx', { eager: true, query: '?raw', import: 'default' });

export function demo(name: string): { initial: ComponentType; source: string; file: string; command: string } {
  const key = `../registry/${name}.tsx`;
  if (!modules[key]) throw new Error(`no demo ${name}`);
  return { initial: modules[key].default, source: sources[key], file: `${name}.tsx`, command: `npx @dsviz/cli add ${index.find((e) => e.file === `${name}.tsx`)?.name}` };
}
