/**
 * Run an Observable-style cell in the browser.
 *
 * A cell is the body of an Observable `{ ... }` block: it uses `d3` and `kit`
 * as free variables, and `return`s the DOM node to show. `invalidation` is the
 * same promise Observable gives a cell; it resolves when the cell is re-run or
 * removed, which is where timers get cleared.
 */
import * as d3 from 'd3';
import kitSource from './kit.js?raw';

let kit: unknown;
/** The shared kit, built once. (kit.js is itself a cell body: it returns the kit object.) */
export function getKit() {
  return (kit ??= new Function('d3', kitSource)(d3));
}

export const kitCellSource = kitSource;

export async function runCell(source: string, invalidation: Promise<void>): Promise<Node> {
  const result = await new Function('d3', 'kit', 'invalidation', source)(d3, getKit(), invalidation);
  if (!(result instanceof Node)) throw new Error('The cell must `return` a DOM node (for example `fig.el`).');
  return result;
}

/** Wrap a cell body the way it is pasted into Observable: `name = { ... }`. */
export function asObservableCell(name: string, source: string) {
  const body = source.trimEnd().split('\n').map((l) => (l ? '  ' + l : l)).join('\n');
  return `${name} = {\n${body}\n}\n`;
}
