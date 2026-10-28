import registry from '../registry/index.json';
import { demo } from './demos';
import { groups } from './examples';
import { LiveExample } from './LiveExample';

const featured = ['Pythagoras', 'BinarySearch', 'Riemann', 'Venn'];

export function Home() {
  return (
    <div className="home">
      <h1 className="home-title">dsviz</h1>
      <p className="home-lede">
        A TypeScript library for <b>interactive, animated diagrams</b> for teaching computer science: data structures and algorithms, UML and
        system architecture, git, plots, probability, geometry, scheduling and memory. You describe the picture as data; it draws it in SVG and animates every change.
      </p>
      <div className="featured">
        {featured.map((name) => {
          const { initial: C } = demo(name);
          return (
            <div className="feature-card" key={name}>
              <C />
            </div>
          );
        })}
      </div>
      <p className="home-more"><a href="#/examples">All examples, with code →</a></p>
      <h2>Usage</h2>
      <pre className="code">{`// 1. Primitives: shapes with ids, drawn by <Diagram>.
import { rect, combine } from 'dsviz';
import { Diagram } from 'dsviz/react';
<Diagram scene={combine(rect({ id: 'a', x: 0, y: 0, w: 40, h: 40 }))} />

// 2. A family function: state in, scene out.
import { array, pointer } from 'dsviz/ds';
const arr = array([3, 8, 12, 17], { tones: { 2: 'active' } });
combine(arr, pointer({ id: 'i', at: arr.top(2), label: 'i' }))

// 3. A whole component, copied into your app to edit.
npx dsviz add binary-search`}</pre>
      <p>Layers 1 and 2 are libraries (<code>npm install dsviz dsviz/ds dsviz/react</code>). Layer 3 is source code: the CLI copies the file and prints the <code>npm install</code> line it needs. <code>npx dsviz list</code> shows all {registry.length} components, the same ones as on the examples page.</p>
      <p>Read the <a href="#/guide">guide</a> for the ideas, or the <a href="#/api">API</a> for the full list.</p>
    </div>
  );
}

export function Examples() {
  return (
    <div className="examples-layout">
      <nav className="doc-toc" aria-label="Examples">
        {groups.map((g) => (
          <div key={g.id}>
            <div className="toc-group">{g.title}</div>
            {g.items.map((it) => (
              <a key={it.name} href="#/examples" onClick={(e) => { e.preventDefault(); document.getElementById(it.name)?.scrollIntoView({ behavior: 'smooth' }); }}>{it.title}</a>
            ))}
          </div>
        ))}
      </nav>
      <div className="examples-main">
        <h1>Examples</h1>
        <p className="lede">Each example is a small React component; the code beside it is its real source. Edit it and the diagram updates.</p>
        {groups.map((g) => (
          <section key={g.id} className="ex-group">
            <h2>{g.title}</h2>
            <p className="ex-intro">{g.intro}</p>
            {g.items.map((it) => <LiveExample key={it.name} {...it} />)}
          </section>
        ))}
      </div>
    </div>
  );
}
