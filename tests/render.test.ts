// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createView, text, toSVG } from '../src';
import { Button, Diagram } from '../src/react';

const SVG = 'http://www.w3.org/2000/svg';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const svg = () => document.body.appendChild(document.createElementNS(SVG, 'svg'));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('text crossfade', () => {
  it('new words fade in while a ghost of the old words fades out where it was', async () => {
    const el = svg();
    const view = createView(el, { duration: 60 });
    view.render({ nodes: [text({ id: 'msg', x: 0, y: 0, text: 'lo = 3' })] });
    await wait(100);
    view.render({ nodes: [text({ id: 'msg', x: 40, y: 0, text: 'lo = 5' })] });
    const live = el.querySelector('[data-id="msg"]')!;
    expect(live.textContent).toBe('lo = 5');
    expect(Number(live.getAttribute('opacity'))).toBeLessThan(0.2); // starting from transparent
    const ghost = el.querySelector('.dv-ghost')!;
    expect(ghost.textContent).toBe('lo = 3');
    expect(ghost.getAttribute('data-id')).toBeNull(); // lookups and events only see the live one
    expect(ghost.getAttribute('x')).toBe('0'); // it stays where the old words were
    await wait(150);
    expect(el.querySelector('.dv-ghost')).toBeNull();
    expect(live.getAttribute('opacity')).toBe('1');
    view.destroy();
  });
  it('no ghost when only the position changes, or when crossfade is off', async () => {
    const el = svg();
    const view = createView(el, { duration: 60 });
    view.render({ nodes: [text({ id: 't', x: 0, y: 0, text: 'same' })] });
    view.render({ nodes: [text({ id: 't', x: 10, y: 0, text: 'same' })] });
    expect(el.querySelector('.dv-ghost')).toBeNull();
    const off = createView(svg(), { duration: 60, crossfade: false });
    off.render({ nodes: [text({ id: 't', x: 0, y: 0, text: 'a' })] });
    off.render({ nodes: [text({ id: 't', x: 0, y: 0, text: 'b' })] });
    expect(off.svg.querySelector('.dv-ghost')).toBeNull();
    view.destroy();
    off.destroy();
  });
});

describe('stylesheet injection', () => {
  it('controls add their stylesheet once, not on every render', async () => {
    const spy = vi.spyOn(document, 'getElementById');
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    const ui = (n: number) => createElement('div', null, ...Array.from({ length: 5 }, (_, i) => createElement(Button, { key: i, onClick: () => {}, children: `b${n}` })));
    for (let n = 0; n < 10; n++) await act(async () => root.render(ui(n)));
    const lookups = spy.mock.calls.filter(([id]) => id === 'dsviz-control-styles').length;
    expect(lookups).toBeLessThanOrEqual(1);
    expect(document.querySelectorAll('#dsviz-control-styles')).toHaveLength(1);
    await act(async () => root.unmount());
    spy.mockRestore();
  });
  it('<Diagram injectStyles={false}> leaves <head> alone', async () => {
    document.getElementById('dsviz-default-styles')?.remove();
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    await act(async () => root.render(createElement(Diagram, { scene: { nodes: [] }, injectStyles: false })));
    expect(document.getElementById('dsviz-default-styles')).toBeNull();
    await act(async () => root.render(createElement(Diagram, { scene: { nodes: [] } })));
    expect(document.getElementById('dsviz-default-styles')).not.toBeNull();
    await act(async () => root.unmount());
  });
});

describe('toSVG themes', () => {
  const scene = { nodes: [text({ id: 't', x: 0, y: 0, text: 'hi' })] };
  it('pins the dark palette on the svg itself and paints its surface behind', () => {
    const s = toSVG(scene, { theme: 'dark' });
    expect(s).toMatch(/<svg[^>]*style="[^"]*--dv-fg: #fff/);
    expect(s).toContain('class="dv-background"');
    expect(toSVG(scene, { theme: 'light' })).toMatch(/<svg[^>]*style="[^"]*--dv-fg: #000/);
    expect(toSVG(scene, { theme: 'dark', background: false })).not.toContain('dv-background');
  });
  it('without a theme the output is unchanged: no pinned colours, no background', () => {
    const s = toSVG(scene);
    expect(s).not.toMatch(/<svg[^>]*style=/);
    expect(s).not.toContain('dv-background');
  });
});
