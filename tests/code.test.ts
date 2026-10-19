import { describe, expect, it } from 'vitest';
import { code } from '../src';

const src = `def search(a, t):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == t:
            return mid`;

describe('code.block', () => {
  it('one numbered, monospace line per source line, keyed by line number', () => {
    const b = code.block(src);
    expect(b.nodes.filter((n) => n.role === 'code-line')).toHaveLength(6);
    expect(b.nodes.find((n) => n.id === 'code:num:4')?.kind === 'text' && (b.nodes.find((n) => n.id === 'code:num:4') as { text: string }).text).toBe('4');
    expect(b.line(2).y).toBeGreaterThan(b.line(1).y);
  });
  it('keeps indentation (SVG would collapse plain spaces)', () => {
    const line = code.block(src).nodes.find((n) => n.id === 'code:line:2') as { text: string };
    expect(line.text.startsWith('    lo,')).toBe(true);
  });
  it('a highlight band covers exactly its lines, keyed by its index so it can slide', () => {
    const b = code.block(src, { highlight: [[3, 4]] });
    const band = b.nodes.find((n) => n.id === 'code:hl:0');
    expect(band?.role).toBe('code-highlight');
    expect(band?.kind === 'rect' && band.y - band.h / 2).toBe(b.line(3).y - 21 / 2);
    expect(band?.kind === 'rect' && band.y + band.h / 2).toBe(b.line(4).y + 21 / 2);
    // moving it keeps the id
    expect(code.block(src, { highlight: [[6, 6]] }).nodes.some((n) => n.id === 'code:hl:0')).toBe(true);
  });
  it('the block is as wide as its longest line, and numbers can be turned off', () => {
    const with_ = code.block(src), without = code.block(src, { numbers: false });
    expect(with_.box.w).toBeGreaterThan(without.box.w);
    expect(without.nodes.some((n) => n.role === 'code-number')).toBe(false);
    expect(without.box.w).toBeCloseTo(Math.max(...src.split('\n').map((l) => l.length)) * 13 * 0.6 + 20);
  });
  it('start renumbers the lines; anchors follow', () => {
    const b = code.block(['x = 1', 'y = 2'], { start: 10, highlight: [[11, 11]] });
    expect(b.nodes.some((n) => n.id === 'code:line:11')).toBe(true);
    expect(b.right(11).x).toBe(b.box.x + b.box.w);
  });
});
