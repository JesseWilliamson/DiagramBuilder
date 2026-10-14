/**
 * Render a scene to a standalone SVG string (no DOM needed).
 * Useful for server-side rendering, tests, thumbnails, or pasting into docs.
 */
import { describe, numericProps } from './describe';
import { bounds } from './scene';
import { DEFAULT_CSS, LIFT_DEFS } from './styles';
import { getDefaultTheme, themes } from './themes';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function toSVG(scene, o = {}) {
    const pad = o.padding ?? 24;
    const theme = typeof o.theme === 'string' ? themes[o.theme] : (o.theme ?? getDefaultTheme());
    const b = bounds(scene);
    const vb = [b.x - pad, b.y - pad, b.w + 2 * pad, b.h + 2 * pad].map((v) => Math.round(v * 100) / 100);
    const seen = new Set();
    const body = scene.nodes
        .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
        .map((n) => {
        const d = describe(n, numericProps(n), theme.geometry);
        const attrs = Object.entries(d.attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
        return d.text !== undefined ? `<${d.tag} ${attrs}>${esc(d.text)}</${d.tag}>` : `<${d.tag} ${attrs}/>`;
    })
        .join('\n  ');
    const style = (o.embedStyles === false ? '' : `<style>${DEFAULT_CSS}</style>\n  `) + (theme.lift ? `<defs>${LIFT_DEFS}</defs>\n  ` : '');
    const width = o.width ? ` width="${o.width}"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" class="dv-root dv-theme-${theme.name}" viewBox="${vb.join(' ')}"${width}>\n  ${style}${body}\n</svg>`;
}
