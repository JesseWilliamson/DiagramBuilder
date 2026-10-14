import { CourseArt } from './Art';
import { Hero } from './Hero';
import { courses } from './content';
import { loadDone } from './progress';

export function CourseList() {
  const done = loadDone();
  return (
    <div className="course-list">
      {courses.map((c) => {
        const finished = c.lessons.filter((l) => done.has(`${c.id}/${l.id}`)).length;
        return (
          <a key={c.id} className="course-row" href={`#/course/${c.id}`}>
            <CourseArt id={c.id} tone={c.tone} />
            <div className="course-row-text">
              <div className="eyebrow">{c.kicker} · {c.lessons.length} lessons</div>
              <div className="course-row-title">{c.title}{c.isNew && <span className="badge-new">NEW</span>}</div>
              <div className="course-row-blurb">{c.blurb}</div>
            </div>
            {finished > 0 && <div className="course-row-progress">{finished}/{c.lessons.length}</div>}
          </a>
        );
      })}
    </div>
  );
}

export function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h1 className="serif">Diagrams you learn by touching</h1>
          <p className="hero-sub">An SVG library for interactive, animated lessons: algorithms, calculus, probability, geometry and systems. Every diagram on this site is built with it.</p>
          <div className="hero-ctas">
            <a className="pill-btn green big" href="#/lesson/algorithms/binary-search">Try a lesson</a>
            <a className="pill-btn white big" href="#/docs">Read the docs</a>
          </div>
        </div>
        <Hero />
      </section>
      <section className="stats-row">
        <div className="stat-card"><div className="stat-num">21</div><div className="stat-label">interactive diagrams</div></div>
        <div className="stat-card"><div className="stat-num">6</div><div className="stat-label">diagram families</div></div>
        <div className="stat-card"><div className="stat-num">0</div><div className="stat-label">runtime dependencies in the core</div></div>
      </section>
      <section className="section">
        <h2 className="serif section-title">Learn by doing</h2>
        <p className="section-sub">Short lessons, one idea per screen. Drag, predict, check, and see it move.</p>
        <CourseList />
      </section>
    </>
  );
}
