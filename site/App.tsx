import { Home, CourseList } from './Home';
import { CoursePage } from './CoursePage';
import { Docs } from './Docs';
import { LessonPlayer } from './LessonPlayer';
import { Nav } from './Nav';
import { courses, findLesson } from './content';
import { useRoute } from './router';

export function App() {
  const route = useRoute();
  const [page, a, b] = route;

  if (page === 'lesson') {
    const found = findLesson(a, b);
    if (found) return <LessonPlayer course={found.course} lesson={found.lesson} />;
  }
  const course = page === 'course' ? courses.find((c) => c.id === a) : undefined;
  return (
    <div className="site">
      <Nav page={page ?? 'home'} />
      <main className="site-main">
        {course ? (
          <CoursePage course={course} />
        ) : page === 'docs' ? (
          <Docs />
        ) : page === 'courses' ? (
          <section className="section courses-page">
            <h1 className="serif section-title">Courses</h1>
            <p className="section-sub">Each lesson is a handful of screens: one idea, one diagram, one question.</p>
            <CourseList />
          </section>
        ) : (
          <Home />
        )}
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <span className="footer-mark">dsviz</span>
          <span>Interactive diagrams for learning by doing. Built with dsviz, React and SVG.</span>
          <a href="#/docs">Docs</a>
        </div>
      </footer>
    </div>
  );
}
