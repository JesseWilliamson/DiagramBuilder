// @vitest-environment happy-dom
import * as d3 from 'd3';
import { describe, expect, it } from 'vitest';
import kitSource from '../site/d3/kit.js?raw';
import { groups } from '../site/examples';

/** Every d3 cell must run, return a DOM node containing an svg with something drawn, and tidy up after itself. */
const sources = import.meta.glob<string>('../site/d3/cells/*.js', { eager: true, query: '?raw', import: 'default' });
const kit = new Function('d3', kitSource)(d3);

describe('d3 examples', () => {
  for (const { name } of groups.flatMap((g) => g.items)) {
    const source = sources[`../site/d3/cells/${name}.js`];
    it(name, async () => {
      expect(source, `site/d3/cells/${name}.js is missing`).toBeTypeOf('string');
      let invalidate!: () => void;
      const invalidation = new Promise<void>((r) => (invalidate = r));
      const node = await new Function('d3', 'kit', 'invalidation', source)(d3, kit, invalidation);
      expect(node).toBeInstanceOf(Node);
      const svg = (node as Element).querySelector('svg');
      expect(svg, 'no <svg> in the returned node').not.toBeNull();
      expect(svg!.querySelectorAll('*').length).toBeGreaterThan(5);
      expect(svg!.getAttribute('viewBox')).toBeTruthy();
      invalidate();
    });
  }
});
