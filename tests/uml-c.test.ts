import { describe, expect, it } from 'vitest';
import { Frame, SceneNode } from '@figurae/core';
import { cardinalityMarker, communication, deweyNumbers, er, erSize, ErEntity, ErRelationship, Message, relationshipIds } from '@figurae/uml';

const ids = (d: { nodes: SceneNode[] }) => d.nodes.map((n) => n.id);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const byId = (d: { nodes: SceneNode[] }, id: string): any => d.nodes.find((n) => n.id === id);
const overlap = (a: Frame, b: Frame) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;

describe('communication', () => {
  const people = [{ id: 'u', label: 'User', kind: 'actor' as const }, { id: 'w', label: ':Web' }, { id: 'a', label: ':Api' }];
  const msgs: Message[] = [
    { from: 'u', to: 'w', label: 'go()' },
    { from: 'w', to: 'a', label: 'get()', parent: 0 },
    { from: 'a', to: 'a', label: 'check()', parent: 1 },
    { from: 'a', to: 'w', label: 'ok', kind: 'return', parent: 0 },
    { from: 'w', to: 'u', label: 'done', kind: 'return' },
  ];

  it('numbers messages with Dewey decimals from parent', () => {
    expect(deweyNumbers(msgs)).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
    expect(deweyNumbers([{ parent: 5 }, { parent: 0 }])).toEqual(['1', '1.1']); // a parent that comes later is ignored
    const d = communication(people, msgs);
    expect(d.numbers).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
    expect(byId(d, 'comm:msg:2:label').text).toBe('1.1.1: check()');
  });

  it('draws one link per pair, shared by messages in both directions', () => {
    const d = communication(people, msgs);
    const links = ids(d).filter((i) => /^comm:link:[^:]+:line$/.test(i));
    expect(links.sort()).toEqual(['comm:link:u-w:line', 'comm:link:w-a:line']); // no link for the self-message
    // w→a (1) and a→w (3) ride the same link, on the same side, one row apart
    const l1 = byId(d, 'comm:msg:1:label'), l3 = byId(d, 'comm:msg:3:label');
    expect(Math.hypot(l1.x - l3.x, l1.y - l3.y)).toBeGreaterThan(20);
    const a1 = byId(d, 'comm:msg:1:line'), a3 = byId(d, 'comm:msg:3:line');
    const dir = (p: number[][]) => Math.sign(p[1][0] - p[0][0] || p[1][1] - p[0][1]);
    expect(dir(a1.points)).toBe(-dir(a3.points)); // opposite ways along the link
  });

  it('gives every part a stable id and a role; heads are the sequence heads', () => {
    const d = communication(people, msgs);
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(d.nodes.every((n) => n.role)).toBe(true);
    expect(ids(d)).toContain('comm:head:u:head'); // stick figure
    expect(ids(d)).toContain('comm:head:w:box');
  });

  it('reveals messages with upTo, tones the current one and its link', () => {
    const d = communication(people, msgs, { upTo: 1 });
    expect(ids(d)).toContain('comm:msg:1:label');
    expect(ids(d)).not.toContain('comm:msg:2:label');
    expect(byId(d, 'comm:msg:1:label')?.tone).toBe('active');
    expect(byId(d, 'comm:msg:0:label')?.tone).toBeUndefined();
    expect(byId(d, 'comm:link:w-a:line')?.tone).toBe('active');
    expect(byId(d, 'comm:link:u-w:line')?.tone).toBeUndefined();
    expect(byId(d, 'comm:link:w-a:line')).toBeDefined();
    expect(ids(communication(people, msgs, { upTo: 0 }))).toContain('comm:link:w-a:line'); // links are structure: always there
  });

  it('places participants without x/y in layers, or on a ring, and keeps given positions', () => {
    const layers = communication(people, msgs);
    const ys = people.map((p) => layers.box(p.id).y);
    expect(new Set(ys).size).toBeGreaterThan(1);
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(overlap(layers.box(people[i].id), layers.box(people[j].id))).toBe(false);
    const ring = communication(people, msgs, { ring: true });
    const r = people.map((p) => Math.hypot(ring.box(p.id).x, ring.box(p.id).y));
    expect(Math.max(...r) - Math.min(...r)).toBeLessThan(1e-6);
    const fixed = communication([{ ...people[0], x: 10, y: 20 }, people[1], people[2]], msgs);
    expect(fixed.box('u')).toMatchObject({ x: 10, y: 20 });
  });

  it('emits click / drag data', () => {
    const d = communication(people, msgs, { interactive: true, draggable: true });
    const box = byId(d, 'comm:head:w:box');
    expect(box?.draggable).toBe(true);
    expect(box?.data).toEqual({ participant: 'w' });
    expect(byId(d, 'comm:head:u:hit')?.data).toEqual({ participant: 'u' });
  });
});

describe('er', () => {
  const ents: ErEntity[] = [
    { id: 'c', name: 'Customer', attributes: [{ name: 'id', type: 'int', key: 'primary' }, { name: 'phone', nullable: true }] },
    { id: 'o', name: 'Order', attributes: [{ name: 'id', key: 'primary' }, { name: 'cid', key: 'foreign' }] },
    { id: 'l', name: 'Line', weak: true },
  ];
  const rels: ErRelationship[] = [
    { from: 'c', to: 'o', fromCard: 'one', toCard: 'zero-many', label: 'places' },
    { from: 'o', to: 'l', fromCard: 'one', toCard: 'one-many', identifying: false },
  ];

  it('sizes boxes from their text and grows with attributes', () => {
    expect(erSize(ents[0]).h).toBeGreaterThan(erSize(ents[0], true).h);
    expect(erSize({ id: 'x', name: 'A very long entity name indeed' }).w).toBeGreaterThan(110);
  });

  it('lays out entities without x/y in layers, the one side above the many side, without overlap', () => {
    const d = er(ents, rels);
    expect(d.box('c').y).toBeLessThan(d.box('o').y);
    expect(d.box('o').y).toBeLessThan(d.box('l').y);
    expect(overlap(d.box('c'), d.box('o'))).toBe(false);
    // flipping the order of from/to keeps the one side on top
    const flipped = er(ents, [{ from: 'o', to: 'c', fromCard: 'zero-many', toCard: 'one' }]);
    expect(flipped.box('c').y).toBeLessThan(flipped.box('o').y);
    expect(er([{ ...ents[0], x: 5, y: 6 }, ents[1]], rels).box('c')).toMatchObject({ x: 5, y: 6 });
  });

  it('marks keys, nullable attributes, weak entities; every part has an id and a role', () => {
    const d = er(ents, rels);
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(d.nodes.every((n) => n.role)).toBe(true);
    expect(byId(d, 'er:c:attr:0:key').text).toBe('PK');
    expect(byId(d, 'er:c:attr:0:key')?.role).toBe('er-key');
    expect(byId(d, 'er:o:attr:1:key').text).toBe('FK');
    expect(byId(d, 'er:c:attr:1:name')?.role).toBe('er-attr-null');
    expect(byId(d, 'er:l:weak')?.role).toBe('er-weak');
    expect(byId(d, 'er:c:weak')).toBeUndefined();
  });

  it('collapsed hides attributes', () => {
    const d = er(ents, rels, { collapsed: true });
    expect(ids(d).some((i) => i.includes(':attr:'))).toBe(false);
    expect(d.box('c').h).toBeLessThan(er(ents, rels).box('c').h);
  });

  it('puts the right marker at the right end of the line', () => {
    const d = er(ents.map((e, i) => ({ ...e, x: 0, y: i * 220 })), rels);
    const line = byId(d, 'er:rel:c-o:line');
    const [a, b] = line.points; // a on Customer's bottom edge, b on Order's top edge
    expect(a[1]).toBeCloseTo(d.box('c').y + d.box('c').h / 2);
    expect(b[1]).toBeCloseTo(d.box('o').y - d.box('o').h / 2);
    // from end is 'one': two bars, near a. to end is 'zero-many': foot + ring, near b.
    expect(ids(d)).toEqual(expect.arrayContaining(['er:rel:c-o:from:bar0', 'er:rel:c-o:from:bar1', 'er:rel:c-o:to:foot', 'er:rel:c-o:to:ring']));
    expect(byId(d, 'er:rel:c-o:from:bar0')?.role).toBe('er-card-one');
    expect(byId(d, 'er:rel:c-o:to:ring')?.role).toBe('er-card-zero-many');
    const bar = byId(d, 'er:rel:c-o:from:bar1');
    expect(bar.points[0][1]).toBeCloseTo(a[1] + 14); // 14px in from the box, along the line
    const foot = byId(d, 'er:rel:c-o:to:foot');
    expect(foot.points[0][1]).toBeCloseTo(b[1]); // prongs spread at the box edge…
    expect(foot.points[1][1]).toBeCloseTo(b[1] - 13); // …converging on the line
    // one-many: bar + foot, and no ring; o–l is non-identifying so dashed
    expect(ids(d)).toContain('er:rel:o-l:to:bar0');
    expect(ids(d)).not.toContain('er:rel:o-l:to:ring');
    expect(byId(d, 'er:rel:o-l:line')?.dashed).toBe(true);
    expect(byId(d, 'er:rel:c-o:line')?.dashed).toBeFalsy();
  });

  it('cardinality markers: parts per kind', () => {
    const parts = (c: Parameters<typeof cardinalityMarker>[0]) => cardinalityMarker(c, { x: 0, y: 0 }, { x: 1, y: 0 }, 'k').map((n) => n.id.slice(2)).sort();
    expect(parts('one')).toEqual(['bar0', 'bar1']);
    expect(parts('many')).toEqual(['foot']);
    expect(parts('zero-one')).toEqual(['bar0', 'ring']);
    expect(parts('zero-many')).toEqual(['foot', 'ring']);
    expect(parts('one-many')).toEqual(['bar0', 'foot']);
  });

  it('gives repeated relationships unique ids and fans them out', () => {
    const two: ErRelationship[] = [{ from: 'c', to: 'o' }, { from: 'c', to: 'o' }, { id: 'x', from: 'o', to: 'c' }];
    expect(relationshipIds(two)).toEqual(['c-o', 'c-o-2', 'x']);
    const d = er(ents.map((e, i) => ({ ...e, x: 0, y: i * 220 })), two);
    const p = (k: string) => (byId(d, k) as { points: number[][] }).points[0][0];
    expect(p('er:rel:c-o:line')).not.toBeCloseTo(p('er:rel:c-o-2:line'));
  });

  it('Chen: a diamond per relationship, 1 / N at the ends', () => {
    const d = er(ents, rels, { notation: 'chen' });
    expect(ids(d)).toContain('er:rel:c-o:diamond');
    expect(ids(d)).toContain('er:rel:c-o:label');
    expect(byId(d, 'er:rel:c-o:from:card').text).toBe('1');
    expect(byId(d, 'er:rel:c-o:to:card').text).toBe('N');
    expect(ids(d).some((i) => i.includes(':attr:'))).toBe(false);
    expect(d.box('c').y).toBeLessThan(d.box('o').y);
    const dia = byId(d, 'er:rel:c-o:diamond');
    const cy = dia.points.reduce((s: number, q: number[]) => s + q[1], 0) / 4;
    expect(cy).toBeGreaterThan(d.box('c').y);
    expect(cy).toBeLessThan(d.box('o').y);
    expect(ids(er(ents, [{ ...rels[0], identifying: true }], { notation: 'chen' }))).toContain('er:rel:c-o:diamond2');
  });

  it('emits click / drag data and fades dimmed entities with their relationships', () => {
    const d = er(ents, rels, { interactive: true, draggable: true, dim: new Set(['l']) });
    expect(byId(d, 'er:c:box')?.data).toEqual({ entity: 'c' });
    expect(byId(d, 'er:l:box')?.opacity).toBe(0.3);
    expect(byId(d, 'er:rel:o-l:line')?.opacity).toBe(0.25);
    expect(byId(d, 'er:rel:c-o:line')?.opacity).toBe(1);
  });
});
