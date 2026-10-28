import { describe, expect, it } from 'vitest';
import { mathTspans, parseMath } from 'dsviz';

const flat = (tex: string) => parseMath(tex).map((s) => `${s.italic ? 'i' : 'u'}${s.shift === 1 ? '^' : s.shift === -1 ? '_' : ''}:${s.text}`);

describe('parseMath', () => {
  it('italic variables, upright numbers, spaced operators, superscripts', () => {
    expect(flat('a^2 + b^2 = c^2')).toEqual(['i:a', 'u^:2', 'u:\u205f+\u205f', 'i:b', 'u^:2', 'u:\u2005=\u2005', 'i:c', 'u^:2']);
  });
  it('function names are upright, their arguments italic', () => {
    expect(flat('sin x')).toEqual(['u:sin', 'i:x']);
  });
  it('a leading minus is unary (no spaces) and becomes a real minus', () => {
    expect(flat('-x')).toEqual(['u:−', 'i:x']);
    expect(flat('a - b')).toEqual(['i:a', 'u:\u205f−\u205f', 'i:b']);
  });
  it('commands, groups and subscripts', () => {
    expect(flat('\\theta_{i+1}')).toEqual(['i:θ', 'i_:i', 'u_:+1']);
    expect(flat('P(A \\cap B)')).toEqual(['i:P', 'u:(', 'i:A', 'u:\u205f∩\u205f', 'i:B', 'u:)']);
    expect(flat("f'(x)")).toEqual(['i:f', 'u:′(', 'i:x', 'u:)']);
  });
  it('degrees and plain numbers stay upright', () => {
    expect(flat('62°')).toEqual(['u:62°']);
  });
});

describe('mathTspans', () => {
  it('raises superscripts with dy and drops back for the next span', () => {
    const svg = mathTspans(parseMath('x^2+1'), 20);
    expect(svg).toContain('dy="-8.4"');
    expect(svg).toContain('dy="8.4"');
  });
});
