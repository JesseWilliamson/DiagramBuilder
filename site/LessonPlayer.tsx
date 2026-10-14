import { ComponentType, useEffect, useState } from 'react';
import { Button, Diagram, Feedback, MultipleChoice, ProgressSegments, useBurst } from 'dsviz/react';
import { CodeDrawer } from './CodeDrawer';
import { Course, Lesson } from './content';
import { demo } from './demos';
import { Boundary, useLive } from './live/useLive';
import { ThemeToggle } from './Nav';
import { markDone } from './progress';
import { go } from './router';

const Empty: ComponentType = () => null;

/**
 * One lesson, one screen at a time, Brilliant-style:
 *   prompt → interact → pick an answer → Check → feedback sheet → Continue.
 * Steps without a question just have Continue.
 */
export function LessonPlayer({ course, lesson }: { course: Course; lesson: Lesson }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [result, setResult] = useState<'right' | 'wrong' | null>(null);
  const [misses, setMisses] = useState(0);
  const [codeOpen, setCodeOpen] = useState(false);
  const finished = i >= lesson.steps.length;
  const step = lesson.steps[Math.min(i, lesson.steps.length - 1)];
  const d = step.demo ? demo(step.demo) : null;
  const live = useLive(d?.source ?? '', d?.initial ?? Empty);

  useEffect(() => { setI(0); }, [lesson]);
  useEffect(() => { setPick(null); setResult(null); setMisses(0); }, [i, lesson]);

  const q = step.question;
  const solved = !q || result === 'right' || misses >= 2;
  const check = () => {
    if (!q || !pick) return;
    const ok = pick === q.answer;
    setResult(ok ? 'right' : 'wrong');
    if (!ok) setMisses((m) => m + 1);
  };
  const next = () => {
    if (i + 1 >= lesson.steps.length) markDone(`${course.id}/${lesson.id}`);
    setI(i + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Enter = the primary action, like the real thing
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || codeOpen || (e.target as HTMLElement).closest('input, textarea, .cm-editor')) return;
      if (finished) return;
      if (solved && result !== 'wrong') next();
      else if (result === 'wrong') { setResult(null); setPick(null); }
      else check();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const progress = finished ? lesson.steps.length : i + (solved && (result === 'right' || !q) ? 1 : 0);
  const lessonIndex = course.lessons.indexOf(lesson);
  const nextLesson = course.lessons[lessonIndex + 1];

  return (
    <div className="player">
      <header className="player-top">
        <a className="nav-icon" href={`#/course/${course.id}`} aria-label="Back to course">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </a>
        <ProgressSegments count={lesson.steps.length} current={progress} />
        {d && !finished && (
          <button type="button" className={`nav-icon code-toggle ${codeOpen ? 'is-on' : ''}`} onClick={() => setCodeOpen(!codeOpen)} aria-label="Show the code" title="See and edit the code">
            {'</>'}
          </button>
        )}
        <ThemeToggle />
      </header>

      {finished ? (
        <Complete course={course} lesson={lesson} next={nextLesson ? `#/lesson/${course.id}/${nextLesson.id}` : `#/course/${course.id}`} nextLabel={nextLesson ? `Next: ${nextLesson.title}` : 'Back to course'} />
      ) : (
        <main className="player-body" key={`${lesson.id}/${i}`}>
          <div className="lesson-meta">{lesson.title}</div>
          <h1 className="step-title">{step.title}</h1>
          {step.body && <div className="step-body">{step.body}</div>}
          {d && (
            <div className="diagram-card">
              <Boundary key={live.runKey} onError={live.onRenderError}>
                <live.C />
              </Boundary>
            </div>
          )}
          {q && (
            <div className="question">
              <div className="question-ask">{q.ask}</div>
              <MultipleChoice
                options={q.options}
                value={pick}
                onChange={(v) => { if (result !== 'right') { setPick(v); setResult(null); } }}
                reveal={result === 'right' ? q.answer : result === 'wrong' ? '\u0000' : null}
                layout={q.layout}
                disabled={result === 'right'}
              />
            </div>
          )}
        </main>
      )}

      {!finished && (
        <footer className={`player-bottom ${result === 'right' || (misses >= 2 && result === 'wrong') ? 'is-right' : result === 'wrong' ? 'is-wrong' : ''}`}>
          <div className="player-bottom-inner">
            {result === 'right' && q ? (
              <Feedback kind="right" title={['Correct!', 'Nice!', 'Exactly!', 'You got it!'][i % 4]} action={<Button variant="primary" size="large" onClick={next}>Continue</Button>}>
                {q.explain}
              </Feedback>
            ) : result === 'wrong' && misses >= 2 && q ? (
              <Feedback kind="wrong" title={`The answer is ${q.answer}`} action={<Button variant="primary" size="large" onClick={next}>Continue</Button>}>
                {q.explain}
              </Feedback>
            ) : result === 'wrong' ? (
              <Feedback kind="wrong" action={<Button variant="primary" size="large" onClick={() => { setResult(null); setPick(null); }}>Try again</Button>}>
                Have another look at the diagram, then try again.
              </Feedback>
            ) : q ? (
              <div className="bottom-cta"><Button variant="primary" size="large" onClick={check} disabled={!pick}>Check</Button></div>
            ) : (
              <div className="bottom-cta"><Button variant="primary" size="large" onClick={next}>Continue</Button></div>
            )}
          </div>
        </footer>
      )}
      {d && <CodeDrawer open={codeOpen && !finished} onClose={() => setCodeOpen(false)} file={d.file} live={live} />}
    </div>
  );
}

function Complete({ course, lesson, next, nextLabel }: { course: Course; lesson: Lesson; next: string; nextLabel: string }) {
  const [particles, fire] = useBurst(900);
  useEffect(() => {
    const t = [0, 350, 700].map((ms, k) => window.setTimeout(() => fire([0, -70, 70][k], [0, 20, 20][k], { count: 22, radius: 90 }), ms));
    return () => t.forEach(clearTimeout);
  }, [fire]);
  const asked = lesson.steps.filter((s) => s.question).length;
  return (
    <main className="player-body complete">
      <Diagram scene={{ nodes: [{ kind: 'circle', id: 'medal', x: 0, y: 0, r: 46, tone: 'success' }, { kind: 'text', id: 'check', x: 0, y: 2, text: '✓', size: 44, role: 'value' }, ...particles] }} viewBox={[-160, -110, 320, 220]} height={220} />
      <h1 className="serif complete-title">Lesson complete!</h1>
      <p className="complete-sub">{lesson.title} · {lesson.steps.length} steps · {asked} {asked === 1 ? 'question' : 'questions'}</p>
      <div className="complete-actions">
        <a className="pill-btn green big" href={next}>{nextLabel}</a>
        <a className="pill-btn white big" href={`#/course/${course.id}`} onClick={() => go(`/course/${course.id}`)}>Course overview</a>
      </div>
    </main>
  );
}
