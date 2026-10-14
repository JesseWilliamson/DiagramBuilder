import { ReactNode } from 'react';
import { injectControlStyles } from './controls-styles';

/*
 * The lesson kit: the pieces of a Brilliant-style lesson screen around a
 * diagram. Each is dumb (props in, callbacks out) so an app can drive the flow
 * however it likes; the demo site's LessonPlayer is one example.
 */

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

export interface ChoiceOption<T extends string> {
  value: T;
  label?: ReactNode;
}

export interface MultipleChoiceProps<T extends string> {
  options: ReadonlyArray<T | ChoiceOption<T>>;
  value: T | null;
  onChange: (v: T) => void;
  /** After checking: which option is right (marks it green, the wrong pick red). */
  reveal?: T | null;
  /** 'pills' for short answers (numbers), 'cards' for longer ones. Default: pills. */
  layout?: 'pills' | 'cards';
  disabled?: boolean;
}

/** Pick one. Selected = blue ring; after `reveal`, right = green, wrong = red + a shake. */
export function MultipleChoice<T extends string>({ options, value, onChange, reveal, layout = 'pills', disabled }: MultipleChoiceProps<T>) {
  injectControlStyles();
  return (
    <div className={cx('dvc dvc-choices', layout === 'cards' && 'is-cards')} role="radiogroup">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : (o.label ?? o.value);
        const revealed = reveal != null;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-pressed={!revealed && value === v}
            className={cx('dvc-choice', revealed && v === reveal && value === v && 'is-right', revealed && value === v && v !== reveal && 'is-wrong')}
            onClick={() => onChange(v)}
            disabled={disabled}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export interface FeedbackProps {
  kind: 'right' | 'wrong';
  /** Small uppercase heading. Default "Correct!" / "Try once more". */
  title?: ReactNode;
  children?: ReactNode;
  /** The action on the right (usually a Continue / Try again button). */
  action?: ReactNode;
}

/** The green "Correct!" / pink "Try once more" sheet. */
export function Feedback({ kind, title, children, action }: FeedbackProps) {
  injectControlStyles();
  return (
    <div className={cx('dvc dvc-feedback', kind === 'right' ? 'is-right' : 'is-wrong')} role="status" aria-live="polite">
      <span className="dvc-feedback-icon" aria-hidden>{kind === 'right' ? '✓' : '↺'}</span>
      <div className="dvc-feedback-body">
        <div className="dvc-feedback-title">{title ?? (kind === 'right' ? 'Correct!' : 'Try once more')}</div>
        {children && <div className="dvc-feedback-text">{children}</div>}
      </div>
      {action}
    </div>
  );
}

/** The segmented green progress bar along the top of a lesson. `current` may be fractional. */
export function ProgressSegments({ count, current }: { count: number; current: number }) {
  injectControlStyles();
  return (
    <div className="dvc dvc-progress" role="progressbar" aria-valuemin={0} aria-valuemax={count} aria-valuenow={current}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ ['--fill' as string]: `${Math.max(0, Math.min(1, current - i)) * 100}%` }} />
      ))}
    </div>
  );
}
