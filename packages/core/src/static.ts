/**
 * Render a scene to a standalone SVG string (no DOM needed).
 * Useful for server-side rendering, tests, thumbnails, or pasting into docs.
 */
import { describe, numericProps } from './describe';
import { Scene, bounds } from './scene';
import { DEFAULT_CSS, THEME_VARS } from './styles';
import { geometry } from './themes';

export interface ToSvgOptions {
  padding?: number;
  /** Embed the default stylesheet so the file looks right on its own. Default true. */
  embedStyles?: boolean;
  width?: number;
  /**
   * Pin the light or dark palette. A standalone SVG file has no page around it
   * to say `.dark`, so the theme's variables go on the <svg> itself (an inline
   * style beats any stylesheet rule), along with a background in the theme's
   * surface colour so white text never lands on a white viewer.
   * Default: none (the file follows whatever page it is placed in).
   */
  theme?: 'light' | 'dark';
  /** Paint the theme's surface behind the drawing. Default: true when `theme` is set. */
  background?: boolean;
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
      return d.html !== undefined ? `<${d.tag} ${attrs}>${d.html}</${d.tag}>` : d.text !== undefined ? `<${d.tag} ${attrs}>${esc(d.text)}</${d.tag}>` : `<${d.tag} ${attrs}/>`;
    })
    .join('\n  ');
  const style = o.embedStyles === false ? '' : `<style><![CDATA[${DEFAULT_CSS}]]></style>\n  `; // CDATA: a "<" in the CSS must not read as markup
  const width = o.width ? ` width="${o.width}"` : '';
  const vars = o.theme ? ` style="${esc(THEME_VARS[o.theme].replace(/\s+/g, ' '))}"` : '';
  const bg = (o.background ?? !!o.theme)
    ? `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" style="fill: var(--dv-surface)" class="dv-background"/>\n  `
    : '';
  const cls = o.theme ? `dv-root dv-theme-${o.theme}` : 'dv-root';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="${vb.join(' ')}"${width}${vars}>\n  ${style}${bg}${body}\n</svg>`;
}
