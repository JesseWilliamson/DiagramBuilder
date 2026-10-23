import { describe, expect, it } from 'vitest';
import { snapFrame, snapGuides } from '@figurae/core';

const other = { x: 200, y: 100, w: 80, h: 40 };
const box = (x: number, y: number) => ({ x, y, w: 60, h: 30 });

describe('snapFrame', () => {
  it('snaps centres within the threshold, not outside', () => {
    expect(snapFrame(box(204, 300), [other]).x).toBe(200);
    expect(snapFrame(box(204, 300), [other], { threshold: 3 }).x).toBe(204);
  });
  it('snaps edges (my left to their right)', () => {
    const r = snapFrame(box(272, 300), [other]); // left edge 242 vs their right 240
    expect(r.x).toBe(270);
    expect(r.guides[0]).toMatchObject({ axis: 'x', at: 240, kind: 'edge' });
  });
  it('axes are independent', () => {
    const r = snapFrame(box(203, 150), [other]);
    expect(r.x).toBe(200);
    expect(r.y).toBe(150);
    expect(r.guides.map((g) => g.axis)).toEqual(['x']);
  });
  it('falls back to the grid with no guide', () => {
    const r = snapFrame(box(333, 417), [other], { grid: 10 });
    expect([r.x, r.y, r.guides.length]).toEqual([330, 420, 0]);
  });
  it('alignment beats the grid', () => {
    expect(snapFrame(box(203, 300), [other], { grid: 10 }).x).toBe(200);
  });
  it('the guide spans both boxes plus the margin', () => {
    const g = snapFrame(box(203, 300), [other], { margin: 10 }).guides[0];
    expect(g).toMatchObject({ axis: 'x', at: 200, kind: 'center', from: 70, to: 325 });
  });
});

describe('snapGuides', () => {
  it('makes one snap-guide path per guide with stable ids', () => {
    const { guides } = snapFrame(box(203, 100), [other]);
    const parts = snapGuides(guides, 'd');
    expect(parts.map((p) => p.id)).toEqual(['d.snap.x.center', 'd.snap.y.center']);
    expect(parts.every((p) => p.kind === 'path' && p.role === 'snap-guide')).toBe(true);
    expect(parts[0].points).toEqual([[200, 100 - 20 - 12], [200, 100 + 20 + 12]]);
  });
});
