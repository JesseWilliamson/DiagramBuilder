import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { burst } from '../fx';
import { SceneNode } from '../scene';
import { injectControlStyles } from './controls-styles';
import { Feedback, MultipleChoice } from './lesson';

/*
 * The "fun" layer. Brilliant's diagrams feel like toys because of three habits,
 * and each one here is a small reusable piece:
 *
 *   1. A GOAL to reach by playing:         <Challenge goals={[…]} />
 *   2. A PREDICTION before the answer:     <Predict question options answer>
 *   3. A REWARD when you get there:        useBurst() → particles in the diagram
 */

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/**
 * Celebrations inside a diagram. `fire(x, y)` adds a burst of particles at a
 * scene position; they clear themselves a moment later.
 *
 *   const [particles, fire] = useBurst();
 *   <Diagram scene={combine(stuff, particles)} />
 */
export function useBurst(lifetime = 650): [SceneNode[], (x: number, y: number, opts?: { count?: number; radius?: number }) => void] {
  const [nodes, setNodes] = useState<SceneNode[]>([]);
  const n = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const fire = useCallback((x: number, y: number, opts?: { count?: number; radius?: number }) => {
    const id = `burst${n.current++}`;
    const parts = burst({ id, x, y, ...opts });
    setNodes((cur) => [...cur, ...parts]);
    // removing them from the scene IS the fade-out
    timers.current.push(window.setTimeout(() => setNodes((cur) => cur.filter((p) => !p.id.startsWith(`${id}:`))), lifetime));
  }, [lifetime]);
  return [nodes, fire];
}

export interface Goal {
  label: ReactNode;
  /** Is the goal met right now? Once met, it stays ticked even if the state moves on. */
  done: boolean;
}

/**
 * A short checklist of things to try. Goals tick (with a little pop) the first
 * time they're met and stay ticked, so learners can keep exploring.
 * `onComplete` fires once when the last one ticks: a good moment for a burst.
 */
export function Challenge({ goals, title = 'Try it', onComplete, onGoal }: { goals: Goal[]; title?: ReactNode; onComplete?: () => void; onGoal?: (i: number) => void }) {
  injectControlStyles();
  const [met, setMet] = useState<boolean[]>(() => goals.map(() => false));
  const fired = useRef(false);
  useEffect(() => {
    const next = goals.map((g, i) => met[i] || g.done);
    if (next.some((v, i) => v !== met[i])) {
      next.forEach((v, i) => v && !met[i] && onGoal?.(i));
      setMet(next);
      if (!fired.current && next.every(Boolean)) {
        fired.current = true;
        onComplete?.();
      }
    }
  });
  const count = met.filter(Boolean).length;
  const all = count === goals.length;
  return (
    <div className={cx('dvc dvc-challenge', all && 'is-complete')}>
      <div className="dvc-challenge-head">
        <span>{all ? 'All done!' : title}</span>
        <span className="dvc-challenge-count">{count}/{goals.length}</span>
      </div>
      <ul>
        {goals.map((g, i) => (
          <li key={i} className={cx(met[i] && 'is-met')}>
            <span className="dvc-check" aria-hidden>{met[i] ? '✓' : ''}</span>
            <span>{g.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface PredictProps<T extends string> {
  question: ReactNode;
  options: readonly T[];
  answer: T;
  /** Shown after answering, right or wrong. */
  explain?: ReactNode;
  /** Hide `children` until an answer is chosen. Default false (explore any time). */
  gate?: boolean;
  children?: ReactNode;
}

/**
 * Ask first, show second. Committing to a guess, even a wrong one, makes the
 * diagram's answer stick far better than just being shown it.
 */
export function Predict<T extends string>({ question, options, answer, explain, gate, children }: PredictProps<T>) {
  injectControlStyles();
  const [pick, setPick] = useState<T | null>(null);
  return (
    <>
      <div className="dvc dvc-predict">
        <div className="dvc-predict-q">{question}</div>
        <MultipleChoice options={options} value={pick} onChange={setPick} reveal={pick ? answer : null} disabled={pick !== null} />
        {pick && (
          <Feedback kind={pick === answer ? 'right' : 'wrong'} title={pick === answer ? 'Correct!' : 'Not quite'} action={<button type="button" className="dvc-link" onClick={() => setPick(null)}>Reset</button>}>
            {explain}
          </Feedback>
        )}
      </div>
      {(!gate || pick) && children}
    </>
  );
}
