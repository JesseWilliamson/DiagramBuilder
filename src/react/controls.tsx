import * as RSelect from '@radix-ui/react-select';
import * as RSlider from '@radix-ui/react-slider';
import * as RSwitch from '@radix-ui/react-switch';
import * as RToggle from '@radix-ui/react-toggle-group';
import { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { injectControlStyles } from './controls-styles';
import type { PlayerState } from './hooks';

/*
 * Controls. Each is a thin skin over a Radix primitive, so keyboard handling,
 * focus, ARIA and pointer capture are the library's job, not ours. The skin is
 * plain CSS on the same --dv-* variables the SVG uses (controls-styles.ts), which
 * means the diagram and its controls always match, and getbetter can restyle both
 * from one place. In getbetter you can also swap any of these for the app's own
 * shadcn components: they all take simple value/onChange props.
 */

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

/**
 * A readout whose width never changes. The slider track is flex: 1 next to it,
 * so if "9" → "10" made the readout wider, the track (and every notch on it)
 * would shift sideways the moment you started sliding. The trick: an invisible
 * copy of the widest text sits in the same grid cell as the real text, so the
 * box is always exactly as wide as the widest value will ever be.
 */
function Readout({ children, widest }: { children: ReactNode; widest?: string }) {
  return (
    <span className="dvc-readout">
      {widest && <span className="dvc-readout-sizer" aria-hidden>{widest}</span>}
      <span>{children}</span>
    </span>
  );
}

function Field({ label, readout, widest, children, id }: { label?: string; readout?: ReactNode; widest?: string; children: ReactNode; id?: string }) {
  return (
    <div className="dvc dvc-field">
      {label && <label className="dvc-label" htmlFor={id}>{label}</label>}
      {children}
      {readout !== undefined && <Readout widest={widest}>{readout}</Readout>}
    </div>
  );
}

/** Width of an element, kept up to date. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/**
 * Notches as dots inside the track. They live in a layer inset by half the
 * thumb's width on each side, because Radix keeps the thumb inside the track:
 * its centre at fraction p is r + p·(W − 2r), not p·W. Same formula here, so a
 * notch sits exactly under the thumb at its value. Too dense to read → none.
 */
function Ticks({ fractions, on, width }: { fractions: number[]; on: (i: number) => boolean; width: number }) {
  if (fractions.length < 2 || !width || width / (fractions.length - 1) < 10) return null;
  return (
    <span className="dvc-ticks" aria-hidden>
      {fractions.map((f, i) => <span key={i} className={cx('dvc-tick', on(i) && 'is-on')} style={{ left: `${f * 100}%` }} />)}
    </span>
  );
}

/** The longest string a formatter produces at the ends of its range (a good guess for the widest). */
const widestOf = (format: ((v: number) => ReactNode) | undefined, min: number, max: number, step: number) => {
  if (!format) return undefined;
  const xs = [min, max, min + step, max - step].map((v) => format(v)).filter((x): x is string | number => typeof x === 'string' || typeof x === 'number');
  return xs.map(String).sort((a, b) => b.length - a.length)[0];
};

export interface SliderProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  /** Right-hand readout, e.g. `n = 64`. */
  format?: (v: number) => ReactNode;
  /** Draw a tick at each of these values. */
  ticks?: number[];
  className?: string;
}

export function Slider({ value, onChange, min, max, step = 1, label, format, ticks, className }: SliderProps) {
  injectControlStyles();
  const id = useId();
  const [ref, width] = useWidth<HTMLSpanElement>();
  return (
    <Field label={label} id={id} readout={format ? format(value) : undefined} widest={widestOf(format, min, max, step)}>
      <RSlider.Root ref={ref} id={id} className={cx('dvc-slider', className)} value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)}>
        <RSlider.Track className="dvc-track">
          <RSlider.Range className="dvc-range" />
        </RSlider.Track>
        {ticks && <Ticks fractions={ticks.map((t) => (t - min) / (max - min))} on={(i) => ticks[i] <= value} width={width} />}
        <RSlider.Thumb className="dvc-thumb" aria-label={label ?? 'value'} />
      </RSlider.Root>
    </Field>
  );
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<T | { value: T; label: ReactNode }>;
  label?: string;
}

/** Use instead of a dropdown when there are 2–4 options: every choice stays visible, one click. */
export function Segmented<T extends string>({ value, onChange, options, label }: SegmentedProps<T>) {
  injectControlStyles();
  return (
    <Field label={label}>
      <RToggle.Root type="single" className="dvc-seg" value={value} onValueChange={(v) => v && onChange(v as T)} aria-label={label}>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          return <RToggle.Item key={v} value={v} className="dvc-seg-item">{typeof o === 'string' ? o : o.label}</RToggle.Item>;
        })}
      </RToggle.Root>
    </Field>
  );
}

export interface SelectProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: ReadonlyArray<T | { value: T; label: ReactNode }>;
  label?: string;
}

export function Select<T extends string>({ value, onChange, options, label }: SelectProps<T>) {
  injectControlStyles();
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <Field label={label}>
      <RSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
        <RSelect.Trigger className="dvc-select" aria-label={label}>
          <RSelect.Value />
          <RSelect.Icon className="dvc-caret">▾</RSelect.Icon>
        </RSelect.Trigger>
        <RSelect.Portal>
          <RSelect.Content className="dvc dvc-menu" position="popper" sideOffset={4}>
            <RSelect.Viewport>
              {norm.map((o) => (
                <RSelect.Item key={o.value} value={o.value} className="dvc-menu-item">
                  <RSelect.ItemText>{o.label}</RSelect.ItemText>
                </RSelect.Item>
              ))}
            </RSelect.Viewport>
          </RSelect.Content>
        </RSelect.Portal>
      </RSelect.Root>
    </Field>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  injectControlStyles();
  const id = useId();
  return (
    <Field label={label} id={id}>
      <RSwitch.Root id={id} className="dvc-switch" checked={checked} onCheckedChange={onChange}>
        <RSwitch.Thumb className="dvc-switch-thumb" />
      </RSwitch.Root>
    </Field>
  );
}

export interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

/** − n + : for small integers where dragging a slider would be fiddly (a search target). */
export function NumberStepper({ value, onChange, min = -Infinity, max = Infinity, step = 1, label }: NumberStepperProps) {
  injectControlStyles();
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <Field label={label}>
      <div className="dvc dvc-stepper" role="group" aria-label={label}>
        <button type="button" onClick={() => set(value - step)} disabled={value <= min} aria-label="decrease">−</button>
        <output>{value}</output>
        <button type="button" onClick={() => set(value + step)} disabled={value >= max} aria-label="increase">+</button>
      </div>
    </Field>
  );
}

export interface TransportProps {
  /** What usePlayer() returns. */
  player: Pick<PlayerState<unknown>, 'index' | 'count' | 'playing' | 'first' | 'prev' | 'toggle' | 'next' | 'seek'>;
}

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden><path d={d} fill="currentColor" /></svg>;

/** first / prev / play / next, a scrubber with a tick per step, and "Step i / n". `<Transport player={usePlayer(...)} />` */
export function Transport({ player: p }: TransportProps) {
  injectControlStyles();
  const last = Math.max(0, p.count - 1);
  const [ref, width] = useWidth<HTMLSpanElement>();
  return (
    <div className="dvc dvc-transport">
      <button type="button" onClick={p.first} disabled={p.index === 0} aria-label="First step"><Icon d="M3 3h2v10H3zM13 3v10L6 8z" /></button>
      <button type="button" onClick={p.prev} disabled={p.index === 0} aria-label="Previous step"><Icon d="M12 3v10L5 8z" /></button>
      <button type="button" className="is-play" onClick={p.toggle} aria-label={p.playing ? 'Pause' : 'Play'}>
        <Icon d={p.playing ? 'M4 3h3v10H4zM9 3h3v10H9z' : 'M4 3l9 5-9 5z'} />
      </button>
      <button type="button" onClick={p.next} disabled={p.index >= last} aria-label="Next step"><Icon d="M4 3v10l7-5zM11 3h2v10h-2z" /></button>
      <RSlider.Root ref={ref} className="dvc-slider dvc-scrub" value={[p.index]} min={0} max={last} step={1} onValueChange={([v]) => p.seek(v)}>
        <RSlider.Track className="dvc-track">
          <RSlider.Range className="dvc-range" />
        </RSlider.Track>
        <Ticks fractions={Array.from({ length: p.count }, (_, i) => (last ? i / last : 0))} on={(i) => i <= p.index} width={width} />
        <RSlider.Thumb className="dvc-thumb" aria-label="Step" />
      </RSlider.Root>
      <Readout widest={`Step ${last} / ${last}`}>Step {p.index} / {last}</Readout>
    </div>
  );
}

/**
 * A panel of source lines with the active one(s) highlighted. Feed it `frame.line`
 * from a generator that yields `{ ..., line }`. Indentation is preserved.
 */
export function CodeTrace({ lines, active }: { lines: readonly string[]; active?: number | readonly number[] | null }) {
  injectControlStyles();
  const on = new Set(active == null ? [] : typeof active === 'number' ? [active] : active);
  return (
    <pre className="dvc dvc-code" aria-label="Algorithm steps">
      {lines.map((l, i) => (
        <div key={i} className={cx('dvc-code-line', on.has(i) && 'is-active')} aria-current={on.has(i) ? 'step' : undefined}>{l || ' '}</div>
      ))}
    </pre>
  );
}

export interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  /** primary = filled, ghost = outlined. */
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  title?: string;
}

export function Button({ children, onClick, variant = 'ghost', disabled, title }: ButtonProps) {
  injectControlStyles();
  return (
    <button type="button" className={cx('dvc dvc-btn', variant === 'primary' && 'is-primary')} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export interface TextInputProps {
  value: string;
  /** Called on Enter or blur (not every keystroke), so half-typed input doesn't re-run a diagram. */
  onCommit: (v: string) => void;
  label?: string;
  width?: number | string;
  placeholder?: string;
}

export function TextInput({ value, onCommit, label, width = '10ch', placeholder }: TextInputProps) {
  injectControlStyles();
  const id = useId();
  return (
    <Field label={label} id={id}>
      <input
        id={id}
        key={value /* reset the uncontrolled input when the value changes from outside */}
        className="dvc-input"
        defaultValue={value}
        placeholder={placeholder}
        spellCheck={false}
        style={{ width }}
        onKeyDown={(e) => e.key === 'Enter' && onCommit((e.target as HTMLInputElement).value)}
        onBlur={(e) => e.target.value !== value && onCommit(e.target.value)}
      />
    </Field>
  );
}
