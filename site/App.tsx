import { ReactNode, useEffect, useState } from 'react';
import { Hero } from './Hero';
import { LiveDemo } from './live/LiveDemo';
import { M } from './M';
import { demo } from './demos';

function Block({ id, title, children, name }: { id: string; title: string; children: ReactNode; name: string }) {
  return (
    <section className="block" id={id}>
      <h3>{title}</h3>
      <div className="prose">{children}</div>
      <LiveDemo {...demo(name)} />
    </section>
  );
}

function Part({ id, kicker, title, lede, children }: { id: string; kicker: string; title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <div className="part" id={id}>
      <div className="kicker">{kicker}</div>
      <h2 className="part-title">{title}</h2>
      <p className="part-lede">{lede}</p>
      {children}
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('dsviz-theme', theme); } catch { /* storage blocked */ }
  }, [theme]);
  return (
    <button className="icon-btn" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle light and dark">
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}

const nav = [
  ['#idea', 'How it works'],
  ['#algorithms', 'Algorithms'],
  ['#calculus', 'Functions'],
  ['#probability', 'Probability'],
  ['#geometry', 'Geometry'],
  ['#systems', 'Systems'],
  ['#shapes', 'Paths'],
  ['#react', 'In your app'],
  ['#api', 'API'],
  ['#exercises', 'Exercises'],
];

export function App() {
  return (
    <>
      <nav className="top" aria-label="Sections">
        <div className="inner">
          <a className="brand" href="#top"><i aria-hidden />dsviz</a>
          <div className="links">{nav.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</div>
          <ThemeToggle />
        </div>
      </nav>
      <div className="wrap">
        <header className="hero" id="top">
          <div>
            <h1>Diagrams that <em>move</em> with the idea</h1>
            <p className="lede">
              dsviz turns state into an SVG scene and animates the difference. Algorithms, functions, probability, geometry,
              scheduling and memory, all from one small core you can read in an afternoon.
            </p>
            <div className="chips">
              <span className="chip">keyed tweening</span><span className="chip">drag anything</span><span className="chip">React or vanilla</span>
              <span className="chip">dark-first</span><span className="chip">every demo is editable</span>
            </div>
          </div>
          <Hero />
        </header>

        <Part id="idea" kicker="How it works" title="State in, scene out, the renderer animates the difference" lede={<>Every diagram on this page is a function from state to a <code>Scene</code>: a flat list of plain objects (rect, circle, text, arrow, path), each with a stable <code>id</code>.</>}>
          <Block id="pipeline" title="One rule does all the animation" name="Pipeline">
            <p>When the scene changes, the renderer matches nodes <em>by id</em>. Same id: it's the same thing, so tween it from where it is now to where it should be. New id: fade it in. Missing id: fade it out. That's React's <code>key</code>, applied to geometry.</p>
            <p>Every demo below is its code. Edit it on the left and it re-runs as you type (<code>Ctrl/⌘ + Enter</code> runs it now). The imports are real: <code>dsviz</code> and <code>dsviz/react</code>, exactly what an app would write.</p>
          </Block>
        </Part>

        <Part id="algorithms" kicker="Data structures & algorithms" title="Step through an algorithm, frame by frame" lede={<>Write the algorithm as a generator that <code>yield</code>s a snapshot whenever something interesting happens. <code>usePlayer</code> runs it once and keeps every frame, which is what makes back, scrub and replay possible.</>}>
          <Block id="bsearch" title="Binary search, with the code following along" name="BinarySearch">
            <p>Each frame carries <code>line</code>, so the code panel highlights what just ran. The snapshot-to-scene step is pure, so step 4 always looks the same however you got there. Try a target that isn't in the array.</p>
          </Block>
          <Block id="whyfast" title="Why it is fast" name="WhyFast">
            <p>Each step throws away half of what's left, so the interval goes <M>n</M>, <M>n/2</M>, <M>n/4</M>, … and the loop ends after about <M>{String.raw`\log_2 n`}</M> steps. The slider doubles <M>n</M> per notch: the binary search bar barely moves while the linear scan runs off the end.</p>
          </Block>
          <Block id="keys" title="Keys decide what moves" name="BubbleSort">
            <p>By default an array cell's id is its <em>index</em>, so a swap just changes two numbers in place. Give each element a stable key and a swap becomes two tiles sliding past each other. The index labels never move: an index belongs to a slot, a value belongs to an element.</p>
          </Block>
          <Block id="list" title="Reversing a linked list" name="LinkedList">
            <p><code>linkedList()</code> draws whatever the <code>next</code> pointers say, including the half-reversed state where the list is in two pieces. Each arrow's id is the node it leaves, so <code>curr.next = prev</code> swings it round.</p>
          </Block>
          <Block id="bst" title="Binary search trees" name="Bst">
            <p>The tree is your own immutable object; the layout places each node at its in-order position so the tree reads left to right in sorted order. New nodes grow out of their parent. No player here: plain <code>setTimeout</code> works too.</p>
          </Block>
          <Block id="graph" title="BFS and DFS on a graph you can drag" name="Graph">
            <p>Node positions are ordinary React state. While you drag, <code>&lt;Diagram&gt;</code> renders without tweening so the node stays glued to the pointer. The frontier underneath is keyed by push order, because DFS can push a node twice.</p>
          </Block>
          <Block id="dp" title="Filling a DP table" name="Lcs">
            <p>The longest common subsequence: <M>{'dp[i][j]'}</M> is the answer for the first <M>i</M> letters of A and the first <M>j</M> of B. Arrows show which cell each value came from; after the fill, the traceback spells out one LCS.</p>
          </Block>
        </Part>

        <Part id="calculus" kicker="plot/" title="Functions you can touch" lede={<>A <code>plot.plane</code> maps maths coordinates (y up) to pixels (y down). Everything else (axes, curves, points, tangents, areas, Riemann sums) takes the plane and works in world units.</>}>
          <Block id="tangent" title="The derivative is a slope you can drag" name="Tangent">
            <p>Drag the point. The tangent's slope is <M>{"f'(x)"}</M>. Turn on <b>show f′</b> and the slope becomes a height: the dashed curve is exactly the slope of the solid one, everywhere. Switch functions and the curve morphs, because every curve has the same number of samples.</p>
          </Block>
          <Block id="riemann" title="Area as a limit of rectangles" name="Riemann">
            <M display>{String.raw`\sum_{i=0}^{n-1} f(x_i^*)\,\Delta x \;\longrightarrow\; \int_a^b f(x)\,dx`}</M>
            <p>Drag <M>a</M> and <M>b</M>, change <M>n</M> and the sampling rule. Rectangles are keyed by index, so going from 6 to 7 resizes six of them and adds one. Left, right, mid and trapezoid pieces all have four corners, so switching rules morphs too.</p>
          </Block>
          <Block id="vectors" title="Vectors, sums and projections" name="Vectors">
            <p>The plane uses the same pixels-per-unit on both axes, so the angle you see is the real angle. <M>{String.raw`u \cdot v = |u||v|\cos\theta`}</M>: make <M>{String.raw`\theta = 90°`}</M> and watch the dot product and the projection vanish.</p>
          </Block>
        </Part>

        <Part id="probability" kicker="prob/" title="Probability you can see" lede="Sample spaces, distributions, trees and Venn diagrams. Probability is mostly counting and area, and these make the counting visible.">
          <Block id="dice" title="Two dice, 36 outcomes" name="Dice">
            <p>Each cell is one equally likely outcome. Pick an event and count its cells: that's the whole definition of <M>{String.raw`P(E) = |E| / |\Omega|`}</M>. The bars are the same counts grouped by sum.</p>
          </Block>
          <Block id="venn" title="Venn diagrams with real areas" name="Venn">
            <p>The three regions are computed from where the circles cross (each region is a closed path made of two arcs), so they can be shaded, clicked and measured. Drag the circles to change the overlap.</p>
          </Block>
          <Block id="bayes" title="Bayes' rule as a tree" name="Bayes">
            <M display>{String.raw`P(\text{sick}\mid +) = \frac{P(+\mid\text{sick})\,P(\text{sick})}{P(+)}`}</M>
            <p>Multiply along each path to get the leaves. Bayes' rule is then just: of the two <b>+</b> leaves, what fraction is the sick one?</p>
          </Block>
          <Block id="lln" title="The law of large numbers" name="LargeNumbers">
            <p>Turn on <b>auto</b>. The frequency bars wobble, then settle on the dashed <M>{'1/6'}</M> line, and the running average converges on <M>{'3.5'}</M>. The x-axis rescales as you roll; its ticks are keyed by value, so they slide instead of jumping.</p>
          </Block>
        </Part>

        <Part id="geometry" kicker="geom/" title="Geometry with handles" lede="Polygons, angle marks, tick marks and labelled points, plus the maths underneath: intersections, feet of perpendiculars, circumcircles and friends.">
          <Block id="triangle" title="A triangle explorer" name="Triangle">
            <p>Drag a vertex. Angle marks turn into a square at exactly 90° (arc and square have the same number of points, so they morph), and sides that become equal get tick marks. Points snap to a 5px grid so right angles are reachable by hand.</p>
          </Block>
          <Block id="inscribed" title="The inscribed angle theorem" name="Inscribed">
            <p>An inscribed angle is half the arc it stands on. Drag <M>P</M> around the circle: as long as it stays on the same side, the angle doesn't change.</p>
          </Block>
        </Part>

        <Part id="systems" kicker="sched/ · mem/" title="Systems: scheduling and memory" lede="The machine-level ideas that are hard to picture: who gets the CPU when, and where values actually live.">
          <Block id="sched" title="CPU scheduling" name="Scheduling">
            <p><code>sched.simulate</code> is a pure simulator: processes in, a timeline out. The Gantt chart keys each bar by process and segment number, so switching policy rearranges the bars instead of redrawing them.</p>
          </Block>
          <Block id="python-memory" title="Names point at objects" name="PythonMemory">
            <p>Python variables are names with arrows, not boxes holding values. <code>mem.stackHeap</code> draws frames and objects; each reference is an arrow keyed by the slot it leaves from.</p>
          </Block>
          <Block id="pointers" title="Pointer arithmetic" name="Pointers">
            <p>The same 24 bytes viewed as <code>char</code>s, <code>int</code>s or <code>double</code>s. Element groups are keyed by index, so changing the type stretches <code>a[0]</code>, <code>a[1]</code>… to their new sizes. Click a cell to point at it.</p>
          </Block>
        </Part>

        <Part id="shapes" kicker="path" title="One path, any shape" lede={<>The <code>path</code> primitive draws polylines, polygons and smooth curves. It powers the curves, regions and arcs above.</>}>
          <Block id="morph" title="Morphing between point counts" name="Morph">
            <p>To tween shape A (n points) into shape B (m points) you need a pairing. Walking along both by arc length gives one: "30% of the way round" in A goes to 30% of the way round in B. The old shape is resampled to m points, then each point tweens to its partner.</p>
          </Block>
        </Part>

        <Part id="react" kicker="In your app" title="Using dsviz from React" lede="The core is framework-free; dsviz/react is a thin layer on top. This is all a lesson page needs:">
          <pre className="code">{`import { array, combine, pointer } from 'dsviz';
import { Diagram, Transport, usePlayer } from 'dsviz/react';

function* search(a, target) { /* yield { lo, hi, mid } … */ }

export function BinarySearchFigure({ nums, target }) {
  const player = usePlayer(() => search(nums, target), [nums, target]);
  const { lo, hi, mid } = player.frame;
  const arr = array(nums, { tones: { [mid]: 'active' } });
  return (
    <>
      <Diagram scene={combine(arr.window(lo, hi), arr, pointer({ id: 'mid', at: arr.top(mid), label: 'mid' }))} />
      <Transport player={player} />
    </>
  );
}`}</pre>
          <div className="prose" style={{ marginTop: 14 }}>
            <p><b>Theming.</b> Every colour is a CSS variable on <code>.dv-root</code> (diagrams) and <code>.dvc</code> (controls): <code>--dv-accent</code>, <code>--dv-surface</code>, <code>--dv-stroke</code>… Override them on any ancestor. Light mode switches on <code>[data-theme="light"]</code> or <code>.light</code>.</p>
            <p><b>Controls.</b> <code>Slider</code>, <code>Segmented</code>, <code>Select</code>, <code>Switch</code>, <code>NumberStepper</code>, <code>Button</code>, <code>TextInput</code>, <code>Transport</code> and <code>CodeTrace</code> are thin skins over Radix primitives with plain value/onChange props, so they can be swapped for your app's shadcn components one by one.</p>
          </div>
        </Part>

        <Part id="api" kicker="Reference" title="API at a glance" lede="Each layout returns a Scene plus anchor helpers, so other parts can attach to it without coordinate maths.">
          <div className="api">
            <table>
              <thead><tr><th>Function</th><th>What it gives you</th></tr></thead>
              <tbody>
                <tr className="group"><td colSpan={2}>core</td></tr>
                <tr><td>rect · circle · text · arrow · path</td><td>Primitive nodes. Common props: <code>id, tone, role, enter, exit, draggable, interactive, data</code>.</td></tr>
                <tr><td>combine(...parts) · translate · namespace</td><td>Flatten (nested) parts into one Scene; shift; prefix ids so two copies can't collide.</td></tr>
                <tr><td>{'handle({ id, x, y })'}</td><td>A draggable dot with a large invisible hit target.</td></tr>
                <tr><td>createView(svg) · toSVG(scene)</td><td>The keyed renderer (vanilla JS), and a static SVG string for SSR or tests.</td></tr>
                <tr><td>createPlayer(frames)</td><td>Step / play / seek through generator snapshots.</td></tr>
                <tr className="group"><td colSpan={2}>dsviz/react</td></tr>
                <tr><td>&lt;Diagram scene viewBox onDrag onClick /&gt;</td><td>Renders a scene and tweens changes. Fixed <code>viewBox</code> for plots, auto-fit otherwise.</td></tr>
                <tr><td>usePlayer(make, deps) · useTicker(ms)</td><td>Generator frames as React state; a counter for timed animation.</td></tr>
                <tr className="group"><td colSpan={2}>data structures (top level, or ds.*)</td></tr>
                <tr><td>array · pointer · linkedList · binaryTree · graph · grid · stack · queue</td><td>Anchors like <code>arr.top(i)</code>, <code>list.slot(i)</code>, <code>tree.pos(key)</code>, <code>grid.center(r, c)</code>.</td></tr>
                <tr className="group"><td colSpan={2}>plot.*</td></tr>
                <tr><td>plane · axes · fn · point · segment · vector · tangent · area · riemann · label</td><td><code>plane.toPx / toWorld / viewBox()</code>; <code>fn</code> splits at discontinuities; <code>riemann</code> returns <code>sum</code>.</td></tr>
                <tr className="group"><td colSpan={2}>prob.*</td></tr>
                <tr><td>bars · sampleSpace · diePips · probTree · venn2</td><td>Plus <code>vennRegions</code>, <code>vennAreas</code>, <code>vennRegionAt</code> for the maths.</td></tr>
                <tr className="group"><td colSpan={2}>geom.*</td></tr>
                <tr><td>polygon · segment · tickMarks · angleMark · circle · pointLabel</td><td>Helpers: <code>angleAt, lineIntersection, circleIntersections, footOfPerpendicular, circumcircle, incircle, centroid, orthocenter, arcPoints</code>.</td></tr>
                <tr className="group"><td colSpan={2}>sched.* · mem.*</td></tr>
                <tr><td>simulate · gantt</td><td>FCFS, SJF, SRTF, round robin, priority; per-process waiting / turnaround / response.</td></tr>
                <tr><td>stackHeap · memory · hex</td><td>Frames + heap objects with reference arrows; a byte strip with typed groups and addresses.</td></tr>
              </tbody>
            </table>
          </div>
        </Part>

        <Part id="exercises" kicker="Make it yours" title="Exercises, roughly in order of difficulty" lede="Each of these is a small change to the library or a demo. Edit the demos right here to try ideas out first.">
          <ol className="exercises">
            <li><b>Add a <code>warning</code> tone.</b> Pure CSS: find how tones become <code>--dv-c / --dv-cf / --dv-cs</code> in <code>styles.ts</code>.</li>
            <li><b>Show f″ in the tangent demo.</b> A second dashed curve and a point; where f″ = 0 the tangent crosses the curve.</li>
            <li><b>A <code>heap()</code> layout.</b> Build the implicit tree (children of i are 2i+1, 2i+2), reuse <code>binaryTree()</code>, and draw the array underneath with matching keys.</li>
            <li><b>Three-set Venn.</b> Generalise <code>vennRegions</code>: each of the 7 regions is bounded by arcs between pairwise intersection points.</li>
            <li><b>A Galton board.</b> Balls as circles keyed by ball number, falling through pegs; <code>prob.bars</code> fills up underneath.</li>
            <li><b>Priority scheduling with aging.</b> Add a policy to <code>sched.simulate</code> where waiting raises priority, then show starvation going away.</li>
            <li><b>Text crossfade.</b> When a text node's string changes the renderer swaps it instantly. Make <code>render.ts</code> fade the old string out and the new one in.</li>
          </ol>
        </Part>

        <footer>dsviz is a teaching-sized library: read the source, it's short. Inspired by Brilliant's diagrams and <a href="https://diagramatics.photon-ray.xyz/" target="_blank" rel="noreferrer">Diagramatics</a>.</footer>
      </div>
    </>
  );
}
