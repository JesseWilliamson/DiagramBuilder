import * as RSelect from '@radix-ui/react-select';
import * as RSlider from '@radix-ui/react-slider';
import * as RSwitch from '@radix-ui/react-switch';
import * as RToggle from '@radix-ui/react-toggle-group';
import { ReactNode, useId } from 'react';
import { injectControlStyles } from './controls-styles';

/*
 * Controls. Each is a thin skin over a Radix primitive, so keyboard handling,
 * focus, ARIA and pointer capture are the library's job, not ours. The skin is
 * plain CSS on the same --dv-* variables the SVG uses (controls-styles.ts), which
 * means the diagram and its controls always match, and getbetter can restyle both
 * from one place. In getbetter you can also swap any of these for the app's own
 * shadcn components: they all take simple value/onChange props.
 */

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

function Field({ label, readout, children, id }: { label?: string; readout?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="dvc dvc-field">
      {label && <label className="dvc-label" htmlFor={id}>{label}</label>}
      {children}
      {readout !== undefined && <span className="dvc-readout">{readout}</span>}
    </div>
  );
}

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
  return (
    <Field label={label} id={id} readout={format ? format(value) : undefined}>
      <RSlider.Root id={id} className={cx('dvc-slider', className)} value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)}>
        <RSlider.Track className="dvc-track">
          <RSlider.Range className="dvc-range" />
          {ticks?.map((t) => <span key={t} className="dvc-tick" style={{ left: `${((t - min) / (max - min)) * 100}%` }} />)}
        </RSlider.Track>
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
  index: number;
  count: number;
  playing: boolean;
  onFirst: () => void;
  onPrev: () => void;
  onToggle: () => void;
  onNext: () => void;
  onSeek: (i: number) => void;
}

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden><path d={d} fill="currentColor" /></svg>;

/** first / prev / play / next, a scrubber with a tick per step, and "Step i / n". Pairs with usePlayer: `<Transport {...p} />`-ish. */
export function Transport({ index, count, playing, onFirst, onPrev, onToggle, onNext, onSeek }: TransportProps) {
  injectControlStyles();
  const last = Math.max(0, count - 1);
  return (
    <div className="dvc dvc-transport">
      <button type="button" onClick={onFirst} disabled={index === 0} aria-label="First step"><Icon d="M3 3h2v10H3zM13 3v10L6 8z" /></button>
      <button type="button" onClick={onPrev} disabled={index === 0} aria-label="Previous step"><Icon d="M12 3v10L5 8z" /></button>
      <button type="button" onClick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>
        <Icon d={playing ? 'M4 3h3v10H4zM9 3h3v10H9z' : 'M4 3l9 5-9 5z'} />
      </button>
      <button type="button" onClick={onNext} disabled={index >= last} aria-label="Next step"><Icon d="M4 3v10l7-5zM11 3h2v10h-2z" /></button>
      <RSlider.Root className="dvc-slider dvc-scrub" value={[index]} min={0} max={last} step={1} onValueChange={([v]) => onSeek(v)}>
        <RSlider.Track className="dvc-track">
          <RSlider.Range className="dvc-range" />
          {Array.from({ length: count }, (_, i) => <span key={i} className="dvc-tick" style={{ left: `${last ? (i / last) * 100 : 0}%` }} />)}
        </RSlider.Track>
        <RSlider.Thumb className="dvc-thumb" aria-label="Step" />
      </RSlider.Root>
      <span className="dvc-readout">Step {index} / {last}</span>
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
