import { describe, expect, it } from 'vitest';
import { Frame, SceneNode, bounds, combine, estimateTextWidth } from '@dsviz/core';
import { cardinalityMarker, communication, conversationOrder, deweyNumbers, er, ER_HEAD, ErEntity, ErRelationship, erSize, headSize, linkKey, MARKER_LENGTH, Message, relationshipIds } from '@dsviz/uml';

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
  const pts = (d: { nodes: SceneNode[] }, id: string): number[][] => byId(d, id).points;
  // distance from a point to the (infinite) line through p and q
  const offLine = (x: number, y: number, [p, q]: number[][]) => Math.abs((q[0] - p[0]) * (p[1] - y) - (p[0] - x) * (q[1] - p[1])) / Math.hypot(q[0] - p[0], q[1] - p[1]);

  it('numbers messages 1..n by default, or with Dewey decimals from parent', () => {
    const flat = communication(people, msgs);
    expect(flat.numbers).toEqual(['1', '2', '3', '4', '5']);
    expect(byId(flat, 'comm:msg:2:label').text).toBe('3: check()');
    expect(byId(flat, 'comm:msg:2:label')).toMatchObject({ size: 12, role: 'message' });
    expect(deweyNumbers(msgs)).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
    expect(deweyNumbers([{ parent: 5 }, { parent: 0 }])).toEqual(['1', '1.1']); // a parent that comes later is ignored
    const d = communication(people, msgs, { numbering: 'dewey' });
    expect(d.numbers).toEqual(['1', '1.1', '1.1.1', '1.2', '2']);
    expect(byId(d, 'comm:msg:2:label').text).toBe('1.1.1: check()');
    expect(byId(communication(people, msgs, { numbered: false }), 'comm:msg:2:label').text).toBe('check()');
  });

  it('cuts long message text with an ellipsis (maxLabel, default 22)', () => {
    const long = [{ from: 'u', to: 'w', label: 'findUserByEmailAddress(email, options)' }];
    expect(byId(communication(people, long), 'comm:msg:0:label').text).toBe('1: findUserByEmailAddres…');
    expect(byId(communication(people, long, { maxLabel: 10 }), 'comm:msg:0:label').text).toBe('1: findUserB…');
    expect(byId(communication(people, long, { maxLabel: 40 }), 'comm:msg:0:label').text).toBe('1: findUserByEmailAddress(email, options)');
  });

  it('on a ring of five with up to two messages per link, no label touches a head or another label', () => {
    const five = [{ id: 'user', label: 'User', kind: 'actor' as const }, { id: 'web', label: ':Browser' }, { id: 'api', label: ':API' }, { id: 'auth', label: ':AuthService' }, { id: 'db', label: ':Database' }];
    const login: Message[] = [
      { from: 'user', to: 'web', label: 'submit(email, pw)' }, { from: 'web', to: 'api', label: 'POST /login' }, { from: 'api', to: 'auth', label: 'verify(email, pw)' },
      { from: 'auth', to: 'db', label: 'findUser(email)' }, { from: 'db', to: 'auth', label: 'user row', kind: 'return' }, { from: 'api', to: 'web', label: '200 + token', kind: 'return' },
    ];
    const d = communication(five, login, { ring: true });
    const bbox = (t: { x: number; y: number; text: string; anchor?: string }): Frame => {
      const w = estimateTextWidth(t.text, 12);
      return { x: t.anchor === 'start' ? t.x + w / 2 : t.anchor === 'end' ? t.x - w / 2 : t.x, y: t.y, w, h: 12 };
    };
    const labels = login.map((_, i) => bbox(byId(d, `comm:msg:${i}:label`)));
    for (const p of five) for (const [i, l] of labels.entries()) expect(overlap(l, d.box(p.id)), `label ${i} over ${p.id}`).toBe(false);
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) expect(overlap(labels[i], labels[j]), `labels ${i} and ${j}`).toBe(false);
    // every arrow is on the side of its link that faces away from the ring's centre
    for (const [i, m] of login.entries()) {
      const key = linkKey(five, m.from, m.to);
      const [p, q] = pts(d, `comm:link:${key}:line`), [t] = pts(d, `comm:msg:${i}:line`);
      const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      expect(t[0] * mid[0] + t[1] * mid[1]).toBeGreaterThan(mid[0] * mid[0] + mid[1] * mid[1]);
    }
    // and the whole thing fits the page
    const b = bounds(combine(d.nodes));
    expect(b.w).toBeLessThan(500);
    expect(b.h).toBeLessThan(330);
  });

  it('draws one link per pair, shared by messages in both directions', () => {
    const d = communication(people, msgs);
    const links = ids(d).filter((i) => /^comm:link:[^:]+:line$/.test(i));
    expect(links.sort()).toEqual(['comm:link:u-w:line', 'comm:link:w-a:line']); // no link for the self-message
    // w→a (1) and a→w (3) ride the same link, on the same side, one row apart
    const l1 = byId(d, 'comm:msg:1:label'), l3 = byId(d, 'comm:msg:3:label');
    expect(Math.hypot(l1.x - l3.x, l1.y - l3.y)).toBeGreaterThanOrEqual(16);
    const a1 = byId(d, 'comm:msg:1:line'), a3 = byId(d, 'comm:msg:3:line');
    const dir = (p: number[][]) => Math.sign(p[1][0] - p[0][0] || p[1][1] - p[0][1]);
    expect(dir(a1.points)).toBe(-dir(a3.points)); // opposite ways along the link
  });

  it('rides each message as an 18px arrow 12 off its link, parallel to it, text beside it and clear of the line', () => {
    const d = communication(people, msgs); // layered: u above w above a, so the links are vertical
    const link = pts(d, 'comm:link:w-a:line');
    for (const i of [1, 3]) {
      // a solid head's tip is its first point, an open chevron's its second
      const tail = pts(d, `comm:msg:${i}:line`)[0], tip = pts(d, `comm:msg:${i}:end`)[i === 1 ? 0 : 1];
      expect(Math.hypot(tip[0] - tail[0], tip[1] - tail[1])).toBeCloseTo(18, 5);
      const mid = [(tail[0] + tip[0]) / 2, (tail[1] + tip[1]) / 2];
      expect(offLine(mid[0], mid[1], link)).toBeCloseTo(12, 5);
      expect(offLine(tail[0], tail[1], link)).toBeCloseTo(12, 5); // parallel: both ends the same distance off
      const label = byId(d, `comm:msg:${i}:label`);
      expect(offLine(label.x, label.y, link)).toBeGreaterThan(12); // the text starts beyond the arrow
      expect(label.anchor).toBe(Math.sign(label.x - link[0][0]) > 0 ? 'start' : 'end'); // and runs away from the line
    }
    // rows read top to bottom in message order: 1.1 above 1.2
    expect(byId(d, 'comm:msg:1:label').y).toBeLessThan(byId(d, 'comm:msg:3:label').y);
  });

  it('on a flat link puts rows beside the line, text beside each arrow toward the outside, stacking away', () => {
    const d = communication([{ ...people[1], x: 0, y: 0 }, { ...people[2], x: 240, y: 0 }], [msgs[1], msgs[3]]);
    const row = (i: number) => ({ arrow: pts(d, `comm:msg:${i}:line`)[0], label: byId(d, `comm:msg:${i}:label`) });
    const r0 = row(0), r1 = row(1);
    expect(Math.abs(r0.arrow[1])).toBeCloseTo(12, 5); // the first row 12 off the link (y = 0): the link is long enough
    expect(Math.sign(r1.arrow[1])).toBe(Math.sign(r0.arrow[1])); // the second on the same side, 16 further out
    expect(Math.abs(r1.arrow[1]) - Math.abs(r0.arrow[1])).toBeCloseTo(16, 5);
    expect(r0.label.y).toBeCloseTo(r0.arrow[1], 5); // text level with its arrow…
    expect(Math.abs(r0.label.x - 120)).toBeCloseTo(14, 5); // …starting just past it
    // a short link: the row would run under the heads, so it starts past their edge
    const short = communication([{ ...people[1], x: 0, y: 0 }, { ...people[2], x: 110, y: 0 }], [msgs[1]]);
    const y = pts(short, 'comm:msg:0:line')[0][1];
    expect(Math.abs(y)).toBeGreaterThan(short.box('w').h / 2 + 6);
    expect(byId(short, 'comm:msg:0:label').y).toBeCloseTo(y, 5);
  });

  it('keeps every row where it is while stepping: upTo only adds rows', () => {
    const all = communication(people, msgs), some = communication(people, msgs, { upTo: 1 });
    for (const k of ['comm:msg:0:label', 'comm:msg:1:label', 'comm:msg:0:line', 'comm:msg:1:end']) expect(byId(some, k)).toEqual(byId(all, k) && { ...byId(all, k), tone: byId(some, k).tone });
  });

  it('draws a message to self as a loop on a side its links do not use, text on the outer side', () => {
    const d = communication(people, msgs);
    const loop = pts(d, 'comm:msg:2:line'), f = d.box('a');
    expect(loop.length).toBe(4);
    // the link w–a comes in at the top of a, so the loop hangs below (a is the lowest head) or sits beside
    expect(loop.every(([, y]) => y >= f.y - f.h / 2)).toBe(true);
    expect(byId(d, 'comm:msg:2:label')).toMatchObject({ role: 'message', size: 12 });
    expect(offLine(byId(d, 'comm:msg:2:label').x, byId(d, 'comm:msg:2:label').y, [loop[1], loop[2]])).toBeGreaterThan(4);
  });

  it('gives every part a stable id and a role; heads are the sequence heads', () => {
    const d = communication(people, msgs);
    expect(new Set(ids(d)).size).toBe(d.nodes.length);
    expect(d.nodes.every((n) => n.role)).toBe(true);
    expect(ids(d)).toContain('comm:head:u:head'); // stick figure
    expect(ids(d)).toContain('comm:head:w:box');
    expect(byId(d, 'comm:head:w:box')).toMatchObject({ role: 'card' });
    expect(byId(d, 'comm:head:w:label')).toMatchObject({ size: 13 });
  });

  it('reveals messages with upTo, tones the current one and its link', () => {
    const d = communication(people, msgs, { upTo: 1 });
    expect(ids(d)).toContain('comm:msg:1:label');
    expect(ids(d)).not.toContain('comm:msg:2:label');
    expect(byId(d, 'comm:msg:1:label')?.tone).toBe('active');
    expect(byId(d, 'comm:msg:1:end')?.tone).toBe('active');
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

  it('rings go round in conversation order, compact but with the heads apart', () => {
    const shuffled = [people[2], people[0], people[1]]; // input order a, u, w; the talk goes u → w → a
    expect(conversationOrder(shuffled, msgs)).toEqual(['u', 'w', 'a']);
    expect(conversationOrder(shuffled, [])).toEqual(['a', 'u', 'w']);
    const d = communication(shuffled, msgs, { ring: true });
    expect(d.box('u').x).toBeCloseTo(0, 5); // the first speaker at the top
    expect(d.box('u').y).toBeLessThan(d.box('w').y);
    expect(d.box('w').x).toBeGreaterThan(0); // then clockwise
    const widest = Math.max(...shuffled.map((p) => headSize(p).w));
    expect(Math.hypot(d.box('u').x, d.box('u').y)).toBeCloseTo(Math.max(95, (widest + 44) / (2 * Math.sin(Math.PI / 3))), 5);
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(overlap(d.box(people[i].id), d.box(people[j].id))).toBe(false);
    expect(Math.hypot(communication(people, msgs, { ring: true, radius: 150 }).box('u').y, 0)).toBeCloseTo(150, 5);
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
    // a 26px header band, then 20px rows with 4px above and below
    expect(erSize(ents[0])).toMatchObject({ head: ER_HEAD, h: ER_HEAD + 2 * 20 + 8 });
    expect(erSize(ents[0], true)).toMatchObject({ head: ER_HEAD, h: ER_HEAD });
    expect(erSize(ents[2])).toMatchObject({ h: ER_HEAD }); // no attributes: just the band
  });

  it('draws the name in a header band that is the whole card when collapsed', () => {
    const d = er(ents, rels);
    const head = byId(d, 'er:c:head'), box = d.box('c');
    expect(head?.role).toBe('er-head');
    expect(head.closed).toBe(true);
    const ys = head.points.map((p: number[]) => p[1]);
    expect(Math.min(...ys)).toBeCloseTo(box.y - box.h / 2);
    expect(Math.max(...ys)).toBeCloseTo(box.y - box.h / 2 + ER_HEAD);
    expect(byId(d, 'er:c:name').y).toBeCloseTo(box.y - box.h / 2 + ER_HEAD / 2);
    expect(byId(d, 'er:c:name').size).toBe(13);
    expect(byId(d, 'er:c:div').points[0][1]).toBeCloseTo(box.y - box.h / 2 + ER_HEAD);
    const k = er(ents, rels, { collapsed: true });
    expect(Math.max(...byId(k, 'er:c:head').points.map((p: number[]) => p[1]))).toBeCloseTo(k.box('c').y + k.box('c').h / 2);
    expect(byId(k, 'er:c:head').points).toHaveLength(head.points.length); // same point count, so the band morphs
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
    expect(byId(d, 'er:l:weak').w).toBeLessThan(d.box('l').w); // the second outline sits just inside the first
    expect(byId(d, 'er:c:weak')).toBeUndefined();
    expect(byId(d, 'er:c:attr:0:key').size).toBe(11);
    expect(byId(d, 'er:c:attr:0:type').size).toBe(11);
    expect(byId(d, 'er:c:attr:0:name').size).toBe(12);
  });

  it('collapsed hides attributes and shrinks every box to its band', () => {
    const d = er(ents, rels, { collapsed: true });
    expect(ids(d).some((i) => i.includes(':attr:') || i.endsWith(':div'))).toBe(false);
    expect(d.box('c').h).toBeLessThan(er(ents, rels).box('c').h);
    for (const e of ents) expect(d.box(e.id).h).toBe(ER_HEAD);
    expect(d.box('c').w).toBeLessThanOrEqual(er(ents, rels).box('c').w); // the hidden rows no longer set the width
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
    expect(bar.points[0][1]).toBeCloseTo(a[1] + 12); // 12px in from the box, along the line
    expect(Math.abs(bar.points[0][0] - bar.points[1][0])).toBeCloseTo(12); // 12px across
    expect(byId(d, 'er:rel:c-o:from:bar0').points[0][1]).toBeCloseTo(a[1] + 6);
    const foot = byId(d, 'er:rel:c-o:to:foot');
    expect(foot.points[0][1]).toBeCloseTo(b[1]); // prongs spread at the box edge…
    expect(Math.abs(foot.points[0][0] - foot.points[2][0])).toBeCloseTo(12); // …12px apart…
    expect(foot.points[1][1]).toBeCloseTo(b[1] - 12); // …converging on the line 12px in
    const ring = byId(d, 'er:rel:c-o:to:ring');
    expect(ring.x).toBeCloseTo(b[0]); // the ring sits on the line, beyond the foot, inside the marker length
    expect(ring.y - ring.r).toBeLessThan(b[1] - 12);
    expect(b[1] - (ring.y - ring.r)).toBeLessThanOrEqual(MARKER_LENGTH);
    // the label sits beside the line, not on it
    const label = byId(d, 'er:rel:c-o:label');
    expect(label.x).toBeCloseTo(a[0] + 9);
    expect(label.anchor).toBe('start');
    expect(label.y).toBeGreaterThan(a[1]);
    expect(label.y).toBeLessThan(b[1]);
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
    // every marker starts at the edge (d = 0) and reaches no further than MARKER_LENGTH along the line
    for (const c of ['one', 'many', 'zero-one', 'zero-many', 'one-many'] as const) {
      const ds = cardinalityMarker(c, { x: 0, y: 0 }, { x: 1, y: 0 }, 'k').flatMap((n) =>
        n.kind === 'path' ? n.points.map((p) => p[0]) : n.kind === 'circle' ? [n.x - n.r, n.x + n.r] : []);
      expect(Math.min(...ds)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ds)).toBeLessThanOrEqual(MARKER_LENGTH);
    }
    // the parts across the line are all 12px: bars ±6, prongs ±6, ring r 4.5
    const ys = (c: Parameters<typeof cardinalityMarker>[0]) => cardinalityMarker(c, { x: 0, y: 0 }, { x: 1, y: 0 }, 'k').flatMap((n) => (n.kind === 'path' ? n.points.map((p) => p[1]) : []));
    expect(Math.max(...ys('one'))).toBe(6);
    expect(Math.min(...ys('one-many'))).toBe(-6);
  });

  it('gives repeated relationships unique ids and fans them out', () => {
    const two: ErRelationship[] = [{ from: 'c', to: 'o' }, { from: 'c', to: 'o' }, { id: 'x', from: 'o', to: 'c' }];
    expect(relationshipIds(two)).toEqual(['c-o', 'c-o-2', 'x']);
    const d = er(ents.map((e, i) => ({ ...e, x: 0, y: i * 220 })), two);
    const p = (k: string) => (byId(d, k) as { points: number[][] }).points[0][0];
    expect(p('er:rel:c-o:line')).not.toBeCloseTo(p('er:rel:c-o-2:line'));
  });

  it('emits click / drag data and fades dimmed entities with their relationships', () => {
    const d = er(ents, rels, { interactive: true, draggable: true, dim: new Set(['l']) });
    expect(byId(d, 'er:c:box')?.data).toEqual({ entity: 'c' });
    expect(byId(d, 'er:l:box')?.opacity).toBe(0.3);
    expect(byId(d, 'er:rel:o-l:line')?.opacity).toBe(0.25);
    expect(byId(d, 'er:rel:c-o:line')?.opacity).toBe(1);
  });
});
