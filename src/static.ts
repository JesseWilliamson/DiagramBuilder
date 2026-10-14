/**
 * Render a scene to a standalone SVG string (no DOM needed).
 * Useful for server-side rendering, tests, thumbnails, or pasting into docs.
 */
import { describe, numericProps } from './describe';
import { Scene, bounds } from './scene';
import { DEFAULT_CSS } from './styles';
import { geometry } from './themes';

export interface ToSvgOptions {
  padding?: number;
  /** Embed the default stylesheet so the file looks right on its own. Default true. */
  embedStyles?: boolean;
  width?: number;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toSVG(scene: Scene, o: ToSvgOptions = {}): string {
  const pad = o.padding ?? 24;
  const b = bounds(scene);
  const vb = [b.x - pad, b.y - pad, b.w + 2 * pad, b.h + 2 * pad].map((v) => Math.round(v * 100) / 100);
  const seen = new Set<string>();
  const body = scene.nodes
    .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
    .map((n) => {
      const d = describe(n, numericProps(n), geometry);
      const attrs = Object.entries(d.attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
      return d.text !== undefined ? `<${d.tag} ${attrs}>${esc(d.text)}</${d.tag}>` : `<${d.tag} ${attrs}/>`;
    })
    .join('\n  ');
  const style = (o.embedStyles === false ? '' : `<style>${DEFAULT_CSS}</style>\n  `);
  const width = o.width ? ` width="${o.width}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="dv-root" viewBox="${vb.join(' ')}"${width}>\n  ${style}${body}\n</svg>`;
}
