import { injectStyles } from '../styles';

/**
 * CSS for the controls. Deliberately quiet: small, flat, neutral greys with one
 * blue accent, so the diagram is the thing you look at. They read the same
 * --dv-* variables as the diagrams (defined on `.dvc`), so a host app restyles
 * both from one place, or swaps the controls for its own entirely.
 */
export const CONTROLS_CSS = /* css */ `
.dvc {
  --dvc-ink: var(--dv-fg); --dvc-sub: #6b6b6b; --dvc-line: #d9d9d9; --dvc-track: #ececec; --dvc-bg: #fff; --dvc-soft: #f5f5f5;
  --dvc-accent: #456dff; --dvc-strong: #1a1a1a; --dvc-strong-ink: #fff; --dvc-hl: #fdf3d3; --dvc-hl-bar: #f7c325;
  font-family: var(--dv-font); color: var(--dvc-ink);
}
:root[data-theme="dark"] .dvc, .dark .dvc {
  --dvc-sub: #a3a3a3; --dvc-line: #3d3d3d; --dvc-track: #333; --dvc-bg: #1e1e1e; --dvc-soft: #262626;
  --dvc-accent: #7491ff; --dvc-strong: #f2f2f2; --dvc-strong-ink: #141414; --dvc-hl: #3d3100; --dvc-hl-bar: #d7a613;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not(.light) .dvc {
    --dvc-sub: #a3a3a3; --dvc-line: #3d3d3d; --dvc-track: #333; --dvc-bg: #1e1e1e; --dvc-soft: #262626;
    --dvc-accent: #7491ff; --dvc-strong: #f2f2f2; --dvc-strong-ink: #141414; --dvc-hl: #3d3100; --dvc-hl-bar: #d7a613;
  }
}
.dvc-field { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.dvc-label { color: var(--dvc-sub); white-space: nowrap; }
.dvc-readout { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; min-width: 3ch; }

.dvc-btn { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 7px; cursor: pointer; font: 500 13px var(--dv-font); color: var(--dvc-ink); background: var(--dvc-bg); border: 1px solid var(--dvc-line); transition: background .12s, border-color .12s; }
.dvc-btn:hover:not(:disabled) { background: var(--dvc-soft); }
.dvc-btn:active:not(:disabled) { transform: translateY(1px); }
.dvc-btn:focus-visible { outline: 2px solid var(--dvc-accent); outline-offset: 1px; }
.dvc-btn:disabled { opacity: .4; cursor: default; }
.dvc-btn.is-primary { background: var(--dvc-strong); color: var(--dvc-strong-ink); border-color: var(--dvc-strong); }
.dvc-btn.is-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--dvc-strong) 85%, #888); }

.dvc-slider { position: relative; display: flex; align-items: center; flex: 1; height: 22px; touch-action: none; user-select: none; min-width: 90px; }
.dvc-track { position: relative; flex: 1; height: 4px; border-radius: 2px; background: var(--dvc-track); }
.dvc-range { position: absolute; height: 100%; border-radius: 2px; background: var(--dvc-accent); }
.dvc-tick { position: absolute; top: 50%; width: 1px; height: 7px; transform: translate(-50%, -50%); background: var(--dvc-line); pointer-events: none; }
.dvc-thumb { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--dvc-bg); border: 2px solid var(--dvc-accent); box-shadow: 0 1px 2px rgb(0 0 0 / .2); cursor: grab; }
.dvc-thumb:hover { box-shadow: 0 0 0 5px color-mix(in srgb, var(--dvc-accent) 18%, transparent); }
.dvc-thumb:focus-visible { outline: none; box-shadow: 0 0 0 5px color-mix(in srgb, var(--dvc-accent) 35%, transparent); }
.dvc-thumb:active { cursor: grabbing; }

.dvc-seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--dvc-track); }
.dvc-seg-item { all: unset; box-sizing: border-box; padding: 4px 11px; border-radius: 6px; cursor: pointer; font: 500 13px var(--dv-font); color: var(--dvc-sub); }
.dvc-seg-item:hover { color: var(--dvc-ink); }
.dvc-seg-item[data-state="on"] { background: var(--dvc-bg); color: var(--dvc-ink); box-shadow: 0 1px 2px rgb(0 0 0 / .12); }
.dvc-seg-item:focus-visible { outline: 2px solid var(--dvc-accent); outline-offset: 1px; }

.dvc-select { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 10px; border-radius: 7px; cursor: pointer; font: 500 13px var(--dv-font); border: 1px solid var(--dvc-line); background: var(--dvc-bg); }
.dvc-select:focus-visible { outline: 2px solid var(--dvc-accent); }
.dvc-caret { color: var(--dvc-sub); }
.dvc-menu { z-index: 50; padding: 4px; border-radius: 9px; background: var(--dvc-bg); border: 1px solid var(--dvc-line); box-shadow: 0 6px 20px rgb(0 0 0 / .1); font: 13px var(--dv-font); }
.dvc-menu-item { padding: 6px 10px; border-radius: 6px; cursor: pointer; outline: none; }
.dvc-menu-item[data-highlighted] { background: var(--dvc-soft); }

.dvc-switch { all: unset; box-sizing: border-box; width: 30px; height: 18px; border-radius: 9px; cursor: pointer; background: var(--dvc-line); position: relative; transition: background .15s; }
.dvc-switch[data-state="checked"] { background: var(--dvc-accent); }
.dvc-switch:focus-visible { outline: 2px solid var(--dvc-accent); outline-offset: 2px; }
.dvc-switch-thumb { display: block; width: 14px; height: 14px; border-radius: 50%; background: #fff; transform: translateX(2px); transition: transform .15s; box-shadow: 0 1px 2px rgb(0 0 0 / .25); }
.dvc-switch-thumb[data-state="checked"] { transform: translateX(14px); }

.dvc-stepper { display: inline-flex; align-items: stretch; height: 30px; border-radius: 7px; border: 1px solid var(--dvc-line); overflow: hidden; background: var(--dvc-bg); }
.dvc-stepper button { all: unset; box-sizing: border-box; width: 28px; text-align: center; cursor: pointer; color: var(--dvc-sub); font-size: 15px; }
.dvc-stepper button:hover:not(:disabled) { background: var(--dvc-soft); color: var(--dvc-ink); }
.dvc-stepper button:disabled { opacity: .35; cursor: default; }
.dvc-stepper button:focus-visible { outline: 2px solid var(--dvc-accent); outline-offset: -2px; }
.dvc-stepper output { min-width: 36px; padding: 0 4px; display: grid; place-items: center; font: 600 13px var(--dv-font); font-variant-numeric: tabular-nums; border-inline: 1px solid var(--dvc-line); }

.dvc-transport { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.dvc-transport button { all: unset; box-sizing: border-box; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; color: var(--dvc-sub); }
.dvc-transport button:hover:not(:disabled) { background: var(--dvc-soft); color: var(--dvc-ink); }
.dvc-transport button.is-play { background: var(--dvc-accent); color: #fff; }
.dvc-transport button.is-play:hover { background: color-mix(in srgb, var(--dvc-accent) 85%, #000); color: #fff; }
.dvc-transport button:focus-visible { outline: 2px solid var(--dvc-accent); }
.dvc-transport button:disabled { opacity: .3; cursor: default; }
.dvc-scrub { margin: 0 8px; }

.dvc-input { all: unset; box-sizing: border-box; height: 30px; padding: 0 9px; border-radius: 7px; font: 500 13px var(--dv-mono); color: var(--dvc-ink); border: 1px solid var(--dvc-line); background: var(--dvc-bg); }
.dvc-input:focus { border-color: var(--dvc-accent); }

.dvc-code { margin: 0; padding: 8px 4px; border-radius: 8px; background: var(--dvc-soft); font: 12.5px/1.7 var(--dv-mono); color: var(--dvc-sub); overflow-x: auto; }
.dvc-code-line { white-space: pre; padding: 0 10px; border-radius: 4px; transition: background .2s, color .2s; }
.dvc-code-line.is-active { color: var(--dvc-ink); background: var(--dvc-hl); box-shadow: inset 2px 0 0 var(--dvc-hl-bar); }
/* maths in HTML: same font and rules as the diagram's maths labels */
.dvc-math { font-family: var(--dv-math-font, "STIX Two Text", "Times New Roman", serif); font-size: 1.12em; white-space: nowrap; }
.dvc-math i { font-style: italic; }
.dvc-math sup, .dvc-math sub { font-size: .7em; line-height: 0; }
@media (prefers-reduced-motion: reduce) { .dvc, .dvc * { transition: none !important; } }
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
