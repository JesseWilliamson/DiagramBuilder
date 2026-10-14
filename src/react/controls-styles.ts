import { injectStyles } from '../styles';

/**
 * CSS for the controls and the lesson kit, modelled on Brilliant's UI:
 *   - pills everywhere (radius 9999px), Inter-like sans, black text
 *   - 3D buttons: a solid 4px "lip" underneath (box-shadow 0 4px 0), and on
 *     press the button drops onto it (translateY(4px), no shadow)
 *   - grey #f2f2f2 tracks / unselected pills; selected = white pill on the track
 *   - green #29cc57 for progress and "correct", red #ff5d5d for "try again"
 * Colours read the same --dv-* variables as the diagrams (defined on `.dvc`).
 */
export const CONTROLS_CSS = /* css */ `
.dvc {
  --dvc-ink: var(--dv-fg); --dvc-sub: #666; --dvc-track: #f2f2f2; --dvc-line: rgb(0 0 0 / .1); --dvc-card: #fff;
  --dvc-cta: #333; --dvc-cta-lip: #000; --dvc-cta-ink: #fff; --dvc-green: #29cc57; --dvc-green-lip: #009b2b; --dvc-red: #ff5d5d;
  --dvc-correct-bg: #eafaee; --dvc-correct-ink: #007c23; --dvc-wrong-bg: #ffefef; --dvc-wrong-ink: #c43939; --dvc-select: #456dff;
}
:root[data-theme="dark"] .dvc, .dark .dvc {
  --dvc-sub: #b3b3b3; --dvc-track: #2a2a2a; --dvc-line: rgb(255 255 255 / .14); --dvc-card: #1e1e1e;
  --dvc-cta: #f2f2f2; --dvc-cta-lip: #999; --dvc-cta-ink: #141414; --dvc-correct-bg: #001f09; --dvc-correct-ink: #5ed981; --dvc-wrong-bg: #270b0b; --dvc-wrong-ink: #ff8585; --dvc-select: #7491ff;
}
.dvc { font-family: var(--dv-font); color: var(--dvc-ink); }
.dvc-field { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 500; }
.dvc-label { color: var(--dvc-sub); white-space: nowrap; }
.dvc-readout { font-variant-numeric: tabular-nums; font-weight: 600; white-space: nowrap; }

/* 3D button */
.dvc-btn { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px; border-radius: 9999px; cursor: pointer; font: 600 15px var(--dv-font); color: var(--dvc-ink); background: var(--dvc-card); border: 2px solid var(--dvc-line); box-shadow: 0 4px 0 0 var(--dvc-line); transition: transform .06s, box-shadow .06s, background .12s; margin-bottom: 4px; }
.dvc-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--dvc-ink) 4%, var(--dvc-card)); }
.dvc-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 0 0 0 transparent; }
.dvc-btn:focus-visible { outline: 3px solid var(--dvc-select); outline-offset: 2px; }
.dvc-btn:disabled { cursor: default; color: #b3b3b3; background: var(--dvc-track); border-color: transparent; box-shadow: 0 4px 0 0 transparent; }
.dvc-btn.is-primary { background: var(--dvc-cta); color: var(--dvc-cta-ink); border-color: transparent; box-shadow: 0 4px 0 0 var(--dvc-cta-lip); }
.dvc-btn.is-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--dvc-cta) 88%, #fff); }
.dvc-btn.is-primary:disabled { background: var(--dvc-track); color: #b3b3b3; box-shadow: 0 4px 0 0 transparent; }
.dvc-btn.is-green { background: var(--dvc-green); color: #fff; border-color: transparent; box-shadow: 0 4px 0 0 var(--dvc-green-lip); }
.dvc-btn.is-large { height: 48px; min-width: 220px; font-size: 16px; }
.dvc-btn.is-icon { width: 40px; padding: 0; }

/* slider */
.dvc-slider { position: relative; display: flex; align-items: center; flex: 1; height: 28px; touch-action: none; user-select: none; min-width: 100px; }
.dvc-track { position: relative; flex: 1; height: 8px; border-radius: 9999px; background: var(--dvc-track); }
.dvc-range { position: absolute; height: 100%; border-radius: 9999px; background: var(--dvc-ink); }
.dvc-tick { position: absolute; top: 50%; width: 2px; height: 2px; border-radius: 1px; transform: translate(-50%, -50%); background: color-mix(in srgb, var(--dvc-ink) 30%, transparent); pointer-events: none; }
.dvc-thumb { display: block; width: 24px; height: 24px; border-radius: 50%; background: var(--dvc-card); border: 2.5px solid var(--dvc-ink); box-shadow: 0 2px 0 0 var(--dvc-ink); cursor: grab; transition: transform .1s; }
.dvc-thumb:hover { transform: scale(1.08); }
.dvc-thumb:active { cursor: grabbing; transform: translateY(2px); box-shadow: none; }
.dvc-thumb:focus-visible { outline: 3px solid var(--dvc-select); outline-offset: 2px; }

/* segmented: grey pill track, white selected pill (like Brilliant's Grade / Topic toggle) */
.dvc-seg { display: inline-flex; gap: 2px; padding: 4px; border-radius: 9999px; background: var(--dvc-track); }
.dvc-seg-item { all: unset; box-sizing: border-box; padding: 6px 16px; border-radius: 9999px; cursor: pointer; font: 600 14px var(--dv-font); color: var(--dvc-sub); transition: background .15s, color .15s; }
.dvc-seg-item:hover { color: var(--dvc-ink); }
.dvc-seg-item[data-state="on"] { background: var(--dvc-card); color: var(--dvc-ink); box-shadow: 0 1px 3px rgb(0 0 0 / .1); }
.dvc-seg-item:focus-visible { outline: 3px solid var(--dvc-select); outline-offset: 1px; }

/* select */
.dvc-select { all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 9999px; cursor: pointer; font: 600 14px var(--dv-font); background: var(--dvc-track); }
.dvc-select:focus-visible { outline: 3px solid var(--dvc-select); }
.dvc-caret { color: var(--dvc-sub); }
.dvc-menu { z-index: 50; padding: 6px; border-radius: 16px; background: var(--dvc-card); box-shadow: 0 0 25px rgb(0 0 0 / .15); font: 500 14px var(--dv-font); }
.dvc-menu-item { padding: 8px 14px; border-radius: 10px; cursor: pointer; outline: none; }
.dvc-menu-item[data-highlighted] { background: var(--dvc-track); }

/* switch */
.dvc-switch { all: unset; box-sizing: border-box; width: 44px; height: 26px; border-radius: 9999px; cursor: pointer; background: #ccc; position: relative; transition: background .15s; }
.dvc-switch[data-state="checked"] { background: var(--dvc-green); }
.dvc-switch:focus-visible { outline: 3px solid var(--dvc-select); outline-offset: 2px; }
.dvc-switch-thumb { display: block; width: 20px; height: 20px; border-radius: 50%; background: #fff; transform: translateX(3px); transition: transform .15s; box-shadow: 0 1px 2px rgb(0 0 0 / .25); }
.dvc-switch-thumb[data-state="checked"] { transform: translateX(21px); }

/* stepper: − n + */
.dvc-stepper { display: inline-flex; align-items: center; gap: 4px; padding: 4px; border-radius: 9999px; background: var(--dvc-track); }
.dvc-stepper button { all: unset; box-sizing: border-box; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px; cursor: pointer; font: 600 18px var(--dv-font); color: var(--dvc-ink); background: var(--dvc-card); box-shadow: 0 2px 0 0 var(--dvc-line); }
.dvc-stepper button:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }
.dvc-stepper button:disabled { opacity: .35; cursor: default; }
.dvc-stepper button:focus-visible { outline: 3px solid var(--dvc-select); }
.dvc-stepper output { min-width: 40px; text-align: center; font: 700 16px var(--dv-font); font-variant-numeric: tabular-nums; }

/* transport */
.dvc-transport { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.dvc-transport button { all: unset; box-sizing: border-box; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; color: var(--dvc-ink); background: var(--dvc-card); border: 2px solid var(--dvc-line); box-shadow: 0 3px 0 0 var(--dvc-line); margin-bottom: 3px; }
.dvc-transport button.is-play { background: var(--dvc-cta); color: var(--dvc-cta-ink); border-color: transparent; box-shadow: 0 3px 0 0 var(--dvc-cta-lip); }
.dvc-transport button:active:not(:disabled) { transform: translateY(3px); box-shadow: none; }
.dvc-transport button:focus-visible { outline: 3px solid var(--dvc-select); }
.dvc-transport button:disabled { opacity: .35; cursor: default; }
.dvc-scrub { margin: 0 6px; }

/* text input */
.dvc-input { all: unset; box-sizing: border-box; height: 40px; padding: 0 14px; border-radius: 12px; font: 600 15px var(--dv-font); color: var(--dvc-ink); border: 2px solid var(--dvc-line); background: var(--dvc-card); }
.dvc-input:focus { border-color: var(--dvc-ink); }

/* code trace */
.dvc-code { margin: 0; padding: 12px 8px; border-radius: 16px; background: var(--dvc-track); font: 13px/1.75 var(--dv-mono); color: var(--dvc-sub); overflow-x: auto; }
.dvc-code-line { white-space: pre; padding: 0 10px; border-radius: 8px; transition: background .2s, color .2s; }
.dvc-code-line.is-active { color: var(--dvc-ink); background: #fdf3d3; box-shadow: inset 3px 0 0 #f7c325; font-weight: 600; }
:root[data-theme="dark"] .dvc-code-line.is-active { background: #5c4400; }

/* challenge (goals checklist) */
.dvc-challenge { border-radius: 16px; padding: 14px 16px; background: var(--dvc-track); font-size: 14px; }
.dvc-challenge.is-complete { background: var(--dvc-correct-bg); animation: dvc-pop-card .5s cubic-bezier(.3, 1.6, .5, 1); }
.dvc-challenge-head { display: flex; justify-content: space-between; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 10px; }
.dvc-challenge.is-complete .dvc-challenge-head { color: var(--dvc-correct-ink); }
.dvc-challenge-count { color: var(--dvc-sub); }
.dvc-challenge ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.dvc-challenge li { display: flex; gap: 10px; align-items: center; color: var(--dvc-sub); font-weight: 500; }
.dvc-challenge li.is-met { color: var(--dvc-ink); }
.dvc-check { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #ccc; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #fff; background: var(--dvc-card); }
.dvc-challenge li.is-met .dvc-check { background: var(--dvc-green); border-color: var(--dvc-green); animation: dvc-pop .45s cubic-bezier(.3, 1.8, .5, 1); }
@keyframes dvc-pop { 0% { transform: scale(.3); } 100% { transform: scale(1); } }
@keyframes dvc-pop-card { 0% { transform: scale(.97); } 100% { transform: scale(1); } }

/* multiple choice: pills or cards; selected gets a blue ring */
.dvc-choices { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.dvc-choices.is-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }
.dvc-choice { all: unset; box-sizing: border-box; cursor: pointer; min-width: 64px; padding: 10px 20px; border-radius: 9999px; text-align: center; font: 600 16px var(--dv-font); color: var(--dvc-ink); background: var(--dvc-card); border: 2px solid var(--dvc-line); box-shadow: 0 4px 0 0 var(--dvc-line); margin-bottom: 4px; transition: border-color .12s, background .12s, transform .06s; }
.dvc-choices.is-cards .dvc-choice { border-radius: 16px; padding: 18px 14px; min-height: 64px; display: grid; place-items: center; }
.dvc-choice:hover:not(:disabled) { background: color-mix(in srgb, var(--dvc-ink) 3%, var(--dvc-card)); }
.dvc-choice:active:not(:disabled) { transform: translateY(4px); box-shadow: none; }
.dvc-choice[aria-pressed="true"] { border-color: var(--dvc-select); box-shadow: 0 4px 0 0 var(--dvc-select); background: color-mix(in srgb, var(--dvc-select) 8%, var(--dvc-card)); }
.dvc-choice.is-right { border-color: var(--dvc-green); box-shadow: 0 4px 0 0 var(--dvc-green-lip); background: var(--dvc-correct-bg); color: var(--dvc-correct-ink); }
.dvc-choice.is-wrong { border-color: var(--dvc-red); box-shadow: 0 4px 0 0 #c43939; background: var(--dvc-wrong-bg); color: var(--dvc-wrong-ink); animation: dvc-shake .35s; }
.dvc-choice:disabled { cursor: default; }
.dvc-choice:focus-visible { outline: 3px solid var(--dvc-select); outline-offset: 2px; }
@keyframes dvc-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

/* feedback sheet */
.dvc-feedback { display: flex; align-items: center; gap: 16px; padding: 18px 22px; border-radius: 20px; animation: dvc-rise .25s ease-out; }
.dvc-feedback.is-right { background: var(--dvc-correct-bg); color: var(--dvc-correct-ink); }
.dvc-feedback.is-wrong { background: var(--dvc-wrong-bg); color: var(--dvc-wrong-ink); }
.dvc-feedback-icon { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 20px; font-weight: 800; border: 2px solid currentColor; }
.dvc-feedback-body { flex: 1; min-width: 0; }
.dvc-feedback-title { font-weight: 800; font-size: 13px; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 2px; }
.dvc-feedback-text { font-size: 16px; line-height: 1.45; }
@keyframes dvc-rise { 0% { transform: translateY(12px); opacity: 0; } 100% { transform: none; opacity: 1; } }

/* predict */
.dvc-predict { display: grid; gap: 14px; }
.dvc-predict-q { font-size: 17px; font-weight: 600; text-align: center; }

/* segmented progress */
.dvc-progress { display: flex; gap: 4px; flex: 1; }
.dvc-progress span { flex: 1; height: 8px; border-radius: 9999px; background: #e5e5e5; overflow: hidden; position: relative; }
.dvc-progress span::after { content: ""; position: absolute; inset: 0; width: var(--fill, 0%); background: var(--dvc-green); border-radius: inherit; transition: width .4s cubic-bezier(.3, 1.3, .5, 1); }
:root[data-theme="dark"] .dvc-progress span { background: #333; }

.dvc-link { all: unset; cursor: pointer; color: var(--dvc-select); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .dvc, .dvc * { animation: none !important; transition: none !important; } }
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
