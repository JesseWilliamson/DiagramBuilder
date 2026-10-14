import { injectStyles } from '../styles';

/**
 * CSS for the controls. They read the same --dv-* variables as the SVG (the core
 * stylesheet defines them on `.dv-root` and `.dvc`, and every control root has
 * class `dvc`), so a diagram and its controls always match and re-skin together.
 */
const V = (name: string, fallback: string) => `var(${name}, ${fallback})`;

export const CONTROLS_CSS = /* css */ `
.dvc-field { display: flex; align-items: center; gap: 12px; font: 12px/1.2 ${V('--dv-font', 'ui-sans-serif, system-ui, sans-serif')}; color: ${V('--dv-fg', '#e8eaee')}; }
.dvc-label { color: ${V('--dv-muted', '#7a8190')}; white-space: nowrap; }
.dvc-readout { font-family: ${V('--dv-mono', 'ui-monospace, Menlo, monospace')}; font-variant-numeric: tabular-nums; color: ${V('--dv-fg', '#e8eaee')}; white-space: nowrap; }

.dvc-slider { position: relative; display: flex; align-items: center; flex: 1; height: 20px; touch-action: none; user-select: none; min-width: 80px; }
.dvc-track { position: relative; flex: 1; height: 4px; border-radius: 2px; background: color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 14%, transparent); }
.dvc-range { position: absolute; height: 100%; border-radius: 2px; background: ${V('--dv-accent', '#5b9dff')}; }
.dvc-tick { position: absolute; top: 50%; width: 1px; height: 8px; transform: translate(-50%, -50%); background: color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 28%, transparent); pointer-events: none; }
.dvc-thumb { display: block; width: 14px; height: 14px; border-radius: 50%; background: ${V('--dv-surface', '#17191e')}; border: 2px solid ${V('--dv-accent', '#5b9dff')}; cursor: grab; }
.dvc-thumb:hover { box-shadow: 0 0 0 5px color-mix(in srgb, ${V('--dv-accent', '#5b9dff')} 18%, transparent); }
.dvc-thumb:focus-visible { outline: none; box-shadow: 0 0 0 5px color-mix(in srgb, ${V('--dv-accent', '#5b9dff')} 35%, transparent); }
.dvc-thumb:active { cursor: grabbing; }

.dvc-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 7px; border: 1px solid color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 14%, transparent); }
.dvc-seg-item { all: unset; box-sizing: border-box; padding: 4px 10px; border-radius: 5px; cursor: pointer; color: ${V('--dv-muted', '#7a8190')}; }
.dvc-seg-item:hover { color: ${V('--dv-fg', '#e8eaee')}; }
.dvc-seg-item[data-state="on"] { background: color-mix(in srgb, ${V('--dv-accent', '#5b9dff')} 20%, transparent); color: ${V('--dv-fg', '#e8eaee')}; }
.dvc-seg-item:focus-visible { outline: 2px solid ${V('--dv-accent', '#5b9dff')}; outline-offset: 1px; }

.dvc-select { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 6px; cursor: pointer; border: 1px solid color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 14%, transparent); }
.dvc-select:focus-visible { outline: 2px solid ${V('--dv-accent', '#5b9dff')}; }
.dvc-caret { color: ${V('--dv-muted', '#7a8190')}; }
.dvc-menu { z-index: 50; padding: 4px; border-radius: 8px; background: ${V('--dv-surface', '#17191e')}; border: 1px solid color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 16%, transparent); color: ${V('--dv-fg', '#e8eaee')}; font: 12px ${V('--dv-font', 'system-ui, sans-serif')}; }
.dvc-menu-item { padding: 5px 10px; border-radius: 5px; cursor: pointer; outline: none; }
.dvc-menu-item[data-highlighted] { background: color-mix(in srgb, ${V('--dv-accent', '#5b9dff')} 20%, transparent); }

.dvc-switch { all: unset; box-sizing: border-box; width: 30px; height: 18px; border-radius: 9px; cursor: pointer; background: color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 18%, transparent); position: relative; transition: background .15s; }
.dvc-switch[data-state="checked"] { background: ${V('--dv-accent', '#5b9dff')}; }
.dvc-switch:focus-visible { outline: 2px solid ${V('--dv-accent', '#5b9dff')}; outline-offset: 2px; }
.dvc-switch-thumb { display: block; width: 14px; height: 14px; border-radius: 50%; background: #fff; transform: translateX(2px); transition: transform .15s; }
.dvc-switch-thumb[data-state="checked"] { transform: translateX(14px); }

.dvc-stepper { display: inline-flex; align-items: stretch; border-radius: 6px; border: 1px solid color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 14%, transparent); overflow: hidden; }
.dvc-stepper button { all: unset; box-sizing: border-box; width: 26px; text-align: center; cursor: pointer; color: ${V('--dv-muted', '#7a8190')}; }
.dvc-stepper button:hover:not(:disabled) { color: ${V('--dv-fg', '#e8eaee')}; background: color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 8%, transparent); }
.dvc-stepper button:focus-visible { outline: 2px solid ${V('--dv-accent', '#5b9dff')}; outline-offset: -2px; }
.dvc-stepper button:disabled { opacity: .35; cursor: default; }
.dvc-stepper output { min-width: 34px; padding: 4px 0; text-align: center; font-family: ${V('--dv-mono', 'ui-monospace, Menlo, monospace')}; font-variant-numeric: tabular-nums; }

.dvc-transport { display: flex; align-items: center; gap: 6px; color: ${V('--dv-fg', '#e8eaee')}; font: 12px ${V('--dv-font', 'system-ui, sans-serif')}; }
.dvc-transport button { all: unset; box-sizing: border-box; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 6px; cursor: pointer; color: ${V('--dv-muted', '#7a8190')}; }
.dvc-transport button:hover:not(:disabled) { color: ${V('--dv-fg', '#e8eaee')}; background: color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 8%, transparent); }
.dvc-transport button:focus-visible { outline: 2px solid ${V('--dv-accent', '#5b9dff')}; }
.dvc-transport button:disabled { opacity: .35; cursor: default; }
.dvc-scrub { margin: 0 8px; }

.dvc-code { margin: 0; padding: 8px; border-radius: 8px; border: 1px solid color-mix(in srgb, ${V('--dv-fg', '#e8eaee')} 10%, transparent); font: 12px/1.7 ${V('--dv-mono', 'ui-monospace, Menlo, monospace')}; color: ${V('--dv-muted', '#7a8190')}; overflow-x: auto; }
.dvc-code-line { white-space: pre; padding: 0 8px; border-radius: 4px; border: 1px solid transparent; }
.dvc-code-line.is-active { color: ${V('--dv-fg', '#e8eaee')}; border-color: ${V('--dv-accent', '#5b9dff')}; background: color-mix(in srgb, ${V('--dv-accent', '#5b9dff')} 10%, transparent); }
`;

const ID = 'dsviz-control-styles';

/** Idempotent; cheap enough to call from every control's render. */
export function injectControlStyles(): void {
  if (typeof document === 'undefined') return;
  injectStyles(); // the --dv-* variables the controls read live in the core stylesheet
  if (document.getElementById(ID)) return;
  const el = document.createElement('style');
  el.id = ID;
  el.textContent = CONTROLS_CSS;
  document.head.appendChild(el);
}
