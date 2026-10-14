import { CourseArt } from './Art';
import { Course } from './content';
import { loadDone } from './progress';

/** A course: header, then its lessons as a path of round 3D tiles. */
export function CoursePage({ course }: { course: Course }) {
  const done = loadDone();
  const next = course.lessons.find((l) => !done.has(`${course.id}/${l.id}`)) ?? course.lessons[0];
  return (
    <div className="course-page">
      <a className="back-link" href="#/courses">‹ All courses</a>
      <div className="course-head">
        <CourseArt id={course.id} tone={course.tone} size={96} />
        <div>
          <div className="eyebrow">{course.kicker}</div>
          <h1 className="serif course-title">{course.title}</h1>
          <p className="course-blurb">{course.blurb}</p>
          <a className="pill-btn dark big" href={`#/lesson/${course.id}/${next.id}`}>{done.size && next !== course.lessons[0] ? 'Continue' : 'Start'}</a>
        </div>
      </div>
      <ol className="lesson-path">
        {course.lessons.map((l, i) => {
          const isDone = done.has(`${course.id}/${l.id}`);
          const isNext = l === next;
          return (
            <li key={l.id} className={`lesson-node ${i % 2 ? 'right' : 'left'}`}>
              <a href={`#/lesson/${course.id}/${l.id}`} className={`node-tile tone-${course.tone} ${isDone ? 'is-done' : ''} ${isNext ? 'is-next' : ''}`} aria-label={l.title}>
                {isDone ? '✓' : i + 1}
              </a>
              <div className="node-text">
                <div className="node-title">{l.title}</div>
                <div className="node-blurb">{l.blurb}</div>
                <div className="node-meta">{l.steps.length} {l.steps.length === 1 ? 'step' : 'steps'}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
