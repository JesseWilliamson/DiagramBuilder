import { ReactNode } from 'react';

const Code = ({ children }: { children: string }) => <pre className="code">{children.trim()}</pre>;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="guide-section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

const toc = [
  ['start', 'First diagram'],
  ['packages', 'Packages'],
  ['scenes', 'Scenes and ids'],
  ['layouts', 'Layouts and anchors'],
  ['style', 'Tones, roles and theming'],
  ['motion', 'Animation'],
  ['interaction', 'Interaction'],
  ['player', 'Stepping through algorithms'],
  ['camera', 'The camera'],
  ['math', 'Maths labels'],
  ['sizing', 'Sizing'],
  ['design', 'Architecture and layout'],
  ['uml', 'UML diagrams'],
  ['git', 'Git history'],
  ['vanilla', 'Without React'],
  ['exercises', 'Exercises'],
];

export function Guide() {
  return (
    <div className="doc-layout">
      <nav className="doc-toc" aria-label="On this page">
        {toc.map(([id, label]) => <a key={id} href={`#/guide`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }}>{label}</a>)}
      </nav>
      <div className="doc-main">
        <h1>Guide</h1>
        <p className="lede">dsviz draws interactive, animated SVG diagrams for teaching computer science: data structures and algorithms, UML, software architecture, git history, plots, probability, geometry, scheduling and memory. It is three layers: a headless core (primitives, renderer, camera, player), one package per family of diagrams (pure functions from your state to a scene), and copyable example components. The core has no dependencies; <code>@dsviz/react</code> is a thin wrapper.</p>

        <Section id="start" title="First diagram">
          <Code>{`npm install @dsviz/core @dsviz/ds @dsviz/react   # react >= 18 as a peer dependency`}</Code>
          <p>A diagram is a function from your state to a scene. Render it with <code>&lt;Diagram&gt;</code>; when the state changes, render again.</p>
          <Code>{`
import { useState } from 'react';
import { combine } from '@dsviz/core';
import { array, pointer } from '@dsviz/ds';
import { Diagram, Slider } from '@dsviz/react';

export function Example() {
  const [i, setI] = useState(2);
  const arr = array([3, 8, 12, 17, 21], { tones: { [i]: 'active' } });
  return (
    <>
      <Diagram scene={combine(arr, pointer({ id: 'i', at: arr.top(i), label: 'i' }))} />
      <Slider label="i" value={i} onChange={setI} min={0} max={4} />
    </>
  );
}`}</Code>
          <p>Every example on the <a href="#/examples">examples page</a> is a component like this, and you can edit it there.</p>
        </Section>

        <Section id="packages" title="Packages">
          <p>Each family is its own package and exports its functions flat, with no namespaces: <code>{"import { fn } from '@dsviz/plot'"}</code>. A family depends on <code>@dsviz/core</code> (and <code>@dsviz/layout</code> if it places boxes for you) and on nothing else, so an app installs only what it draws.</p>
          <ul>
            <li><code>@dsviz/core</code>: <code>rect circle text arrow path</code>, <code>combine</code>, <code>connector</code>, <code>createView</code>, <code>toSVG</code>, <code>fitViewBox</code>, <code>createPlayer</code>, <code>handle</code></li>
            <li><code>@dsviz/layout</code>: <code>layered</code> (DAGs) and <code>tidy</code> (trees); positions only.</li>
            <li><code>@dsviz/ds</code>: <code>array pointer linkedList binaryTree tree graph grid stack queue hashMap</code>.</li>
            <li><code>@dsviz/plot</code>, <code>@dsviz/prob</code>, <code>@dsviz/geom</code>: maths on a plane, probability, geometry.</li>
            <li><code>@dsviz/os</code>: CPU scheduling (<code>simulate</code>, <code>gantt</code>) and memory (<code>stackHeap</code>, <code>memory</code>).</li>
            <li><code>@dsviz/arch</code>: architecture diagrams. <code>@dsviz/git</code>: commit graphs.</li>
            <li><code>@dsviz/uml</code>: eleven UML and ER diagrams (below).</li>
            <li><code>@dsviz/react</code>: <code>&lt;Diagram&gt;</code>, <code>usePlayer</code>, controls.</li>
          </ul>
          <p>Two packages sometimes use one name (<code>graph</code> in ds and git, <code>segment</code> in plot and geom): alias on import, <code>{"import { graph as gitGraph } from '@dsviz/git'"}</code>.</p>
        </Section>

        <Section id="scenes" title="Scenes and ids">
          <p>A <code>Scene</code> is <code>{'{ nodes: SceneNode[] }'}</code>: a flat list of plain objects. There are five primitives: <code>rect</code> and <code>circle</code> (centred on x, y), <code>text</code>, <code>arrow</code> (with optional <code>bend</code> and head) and <code>path</code> (polyline, polygon or smooth curve). Array order is paint order.</p>
          <p>Every node has an <code>id</code>. When you render a new scene the renderer matches nodes by id: a node that kept its id <em>tweens</em> from wherever it is on screen to its new props, a new id fades in, a missing id fades out. That one rule is all the animation. It's the same idea as React's <code>key</code>.</p>
          <p><code>combine(...parts)</code> flattens layouts, nodes and (nested) arrays into one scene and skips falsy parts, so <code>{"show && pointer(...)"}</code> works. <code>translate(part, dx, dy)</code> moves a part; <code>namespace(part, 'left')</code> prefixes its ids so two copies can't collide.</p>
        </Section>

        <Section id="layouts" title="Layouts and anchors">
          <p>Layouts turn data into nodes and return the scene plus <em>anchors</em>: functions that tell you where things are, so other parts can attach without coordinate maths.</p>
          <Code>{`
const arr = array(nums, { cell: 36 });
pointer({ id: 'mid', at: arr.top(mid), label: 'mid' });   // arrow onto cell mid
arr.window(lo, hi);                                         // a band behind cells lo..hi

const p = plane({ x: [-4, 4], y: [-3, 3], width: 440, height: 300 });
fn(p, Math.sin);                                       // world units, y up
p.toWorld(e.x, e.y);                                        // drag position → maths coordinates`}</Code>
          <p>The families are the packages above: data structures (<code>array, pointer, linkedList, binaryTree, tree, graph, grid, stack, queue, hashMap</code> in <code>@dsviz/ds</code>), then <code>@dsviz/plot</code>, <code>prob</code>, <code>geom</code>, <code>os</code>, <code>arch</code>, <code>uml</code> and <code>git</code>. See the <a href="#/api">API</a> for the full list.</p>
          <p>Ids inside a layout come from your data. <code>array</code> keys cells by index unless you pass <code>keys</code>; give each element a stable key and a swap becomes two tiles sliding past each other instead of two numbers changing in place.</p>
        </Section>

        <Section id="style" title="Tones, roles and theming">
          <p>Layouts never pick colours. Each node can carry a <code>tone</code> (<code>active, accent, success, danger, visited, orange, muted, ghost</code>) and a <code>role</code> (<code>value, index, caption, math, curve, grid, axis, area, region, bar, guide</code>…). They become CSS classes, and one stylesheet decides how each looks. Colour changes are CSS transitions; only geometry is tweened in JS.</p>
          <p>Everything is a CSS variable on <code>.dv-root</code> (diagrams) and <code>.dvc</code> (controls). Override on any ancestor:</p>
          <Code>{`
.my-app .dv-root, .my-app .dvc {
  --dv-active-fill: #ffd166;   /* the yellow highlight */
  --dv-curve: #0b84f3;         /* plot curves */
  --dv-font: "Inter", sans-serif;
}`}</Code>
          <p>Some layouts take a <code>kind</code> instead of a colour: a graph node with <code>kind: 'changed'</code> gets <code>role: 'node-changed'</code>. The stylesheet colours <code>changed</code>, <code>upstream</code>, <code>downstream</code> and <code>test</code>; any other kind is yours to style with <code>.dv-role-node-&lt;kind&gt;</code>. A tone on the same node still wins.</p>
          <p>Dark mode switches on <code>[data-theme="dark"]</code> or <code>.dark</code> on any ancestor, or follows the OS when neither is set.</p>
          <h3>Coloured outlines</h3>
          <p>Solid shapes (array cells, tree and graph nodes, UML boxes, system components) are outlined in a darker shade of their own colour rather than black, so a coloured tile reads as one object. Lines, arrows, curves and plots stay crisp ink, which keeps the connections visually separate from the things they connect. Change the colours with <code>--dv-outline</code> (untoned shapes) and <code>--dv-&lt;tone&gt;-outline</code>.</p>
        </Section>

        <Section id="motion" title="Animation">
          <p>Tweens start from what's on screen right now, not from the last target, so interrupting an animation (clicking Next twice quickly) never snaps. <code>&lt;Diagram duration ease&gt;</code> sets the feel; while a drag is in progress renders are instant so the shape stays under the pointer.</p>
          <p>Nodes can say where they come from and go to: <code>enter: {'{ y: parentY }'}</code> makes a tree node grow out of its parent, <code>exit: {'{ x: -40 }'}</code> slides a dequeued cell out to the left. Paths with different point counts are resampled by arc length before tweening, so a curve can morph into another.</p>
          <p>Text can't be interpolated ("lo = 3" is not half way to "lo = 5"), so a text node that keeps its id but changes its words <em>crossfades</em>: a ghost of the old words fades out where they were while the new ones fade in. Turn it off with <code>crossfade: false</code> on the view or the <code>&lt;Diagram&gt;</code>.</p>
          <p>If the viewer prefers reduced motion, every render is instant.</p>
        </Section>

        <Section id="interaction" title="Interaction">
          <p><code>&lt;Diagram onClick onDrag&gt;</code> report the node (with its <code>data</code>) and the pointer position in scene coordinates. Mark nodes <code>interactive</code> for a pointer cursor, <code>draggable</code> to receive drags.</p>
          <p>For small things you drag, use <code>handle({'{ id, x, y }'})</code>: a visible dot plus a large invisible hit target (small targets are the main reason drag interactions feel bad). <code>point(p, x, y, {'{ id, draggable: true }'})</code> from plot and <code>polygon(points, {'{ draggable: true }'})</code> from geom use it for you, and <code>hint: true</code> pulses a ring until the first touch.</p>
          <p>Everything draggable is also reachable with Tab and movable with the arrow keys (Shift for bigger steps). The keys drive a virtual pointer and send the same <code>dragstart / drag / dragend</code> events, so your <code>onDrag</code> handler works unchanged. <code>e.keyboard</code> tells you which it was.</p>
        </Section>

        <Section id="player" title="Stepping through algorithms">
          <p>Write the algorithm as a generator that <code>yield</code>s a snapshot whenever something interesting happens. <code>usePlayer</code> runs it once, keeps every frame, and gives you play / pause / step / seek. Yield copies (<code>[...arr]</code>), never the array you keep mutating.</p>
          <Code>{`
function* search(a, target) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    yield { lo, hi, mid, line: 2 };
    if (a[mid] === target) return;
    if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
  }
}
const player = usePlayer(() => search(nums, target), [nums, target]);
<Transport player={player} />
<CodeTrace lines={code} active={player.frame.line} />`}</Code>
          <p><code>CodeTrace</code> is an HTML panel beside the diagram that highlights the current line of a step-through.</p>
        </Section>

        <Section id="camera" title="The camera">
          <p>The camera is the <code>viewBox</code>. Whatever moves on screen is what the reader takes to be the change, so the camera should almost never move. Pick by kind of diagram:</p>
          <ul>
            <li><b>Plots and anything draggable:</b> a fixed <code>viewBox</code> (<code>plane.viewBox()</code> for plots). The axes are the reference frame; if they moved, the point you're dragging would appear to move twice.</li>
            <li><b>Step-through algorithms:</b> fit every frame once, then hold still. The camera changes when the <i>problem</i> changes (a new input), never per step.</li>
            <li><b>Growing structures</b> (a tree you insert into): leave it on auto. The default <code>camera="grow"</code> grows when something would fall outside and shrinks only when the content fills less than half the frame, so small changes never nudge it.</li>
          </ul>
          <Code>{`
const draw = (f) => combine(array(nums, { tones: … }), pointer(…));   // pure: one frame → scene
const viewBox = useMemo(() => fitViewBox(player.frames.map(draw)), [player.frames]);
<Diagram scene={draw(player.frame)} viewBox={viewBox} />`}</Code>
          <p>While something is being dragged the camera is frozen whatever the mode, so the thing under the pointer stays under it.</p>
        </Section>

        <Section id="math" title="Maths labels">
          <p>Text with <code>role: 'math'</code> is typeset with textbook conventions: single-letter variables italic, numbers and brackets upright, function names upright (<code>sin</code>, <code>log</code>, <code>proj</code>), a real minus sign, medium spaces around <code>+ −</code> and thicker ones around <code>= ≤ ∈</code>. <code>^</code> and <code>_</code> make super- and subscripts, <code>{'{…}'}</code> groups and a few commands work (<code>{String.raw`\theta \cap \le \angle \text{…}`}</code>).</p>
          <Code>{`
text({ id: 'eq', x, y, text: 'a^2 + b^2 = c^2', role: 'math' })
vector(p, O, proj, { id: 'r', label: 'proj_v u' })      // labels on marks are maths already
<MathText tex="P(A \\mid B) =" /> {p.toFixed(3)}            // the same typesetting in HTML`}</Code>
          <p>Axis tick numbers use the maths font upright; identifiers from code (<code>lo</code>, <code>mid</code>, <code>curr</code>) stay monospace, because they are code, not maths.</p>
        </Section>

        <Section id="sizing" title="Sizing">
          <p>By default diagrams are drawn at their natural size: one scene unit is one CSS pixel, centred, and scaled down only when the container is narrower. That keeps text and line weights identical across every diagram. Pass <code>scale</code> to draw bigger, or <code>size="fill"</code> with a <code>height</code> to stretch to the container instead.</p>
        </Section>

        <Section id="design" title="Architecture and layout">
          <p><code>@dsviz/arch</code> draws system architecture (clients, load balancers, services, caches, databases, queues) and <code>@dsviz/uml</code> draws UML. Both are built on <code>connector()</code> from core, a line with a marker at either end. Each marker is a small shape with its own role (<code>end-solid</code>, <code>end-hollow</code>, <code>end-open</code>), and the line stops where the marker starts, so it never shows through a hollow triangle.</p>
          <Code>{`
import { combine } from '@dsviz/core';
import { architecture, packet } from '@dsviz/arch';

const a = architecture(components, links, { zones });
combine(a, packet({ id: 'req', ...a.along('lb', 'app', 1) }));  // same id → it glides`}</Code>
          <p>You place things (x, y), or leave x and y out: <code>graph(…, {"{ layout: 'layered' }"})</code>, <code>architecture</code> and every UML diagram that has boxes then use <code>layered</code> from <code>@dsviz/layout</code>, which puts each node one layer past everything that points at it, orders each layer to avoid crossings and bends long edges around the boxes in between. The layouts size boxes from their text and route the lines. Component colours come from the stylesheet by kind (<code>.dv-role-sys-db</code>), so a host app can restyle every database in one rule.</p>
        </Section>

        <Section id="uml" title="UML diagrams">
          <p><code>@dsviz/uml</code> has eleven diagram functions. Every one takes your data plus options, returns a scene, and returns <code>box(id)</code> or <code>frame(id)</code> so you can attach things to its boxes. Boxes without x and y are placed by <code>layered</code>. Ids come from your data, so a box that keeps its id moves instead of redrawing.</p>
          <ul>
            <li><code>sequence</code>: lifelines and call / return / async messages; activation bars from the call stack; <code>fragments</code> (loop, alt, opt), <code>notes</code>; <code>upTo</code> reveals one message per step.</li>
            <li><code>classDiagram</code>: classes with attributes and methods; inherits, implements, composition, aggregation, association, dependency.</li>
            <li><code>stateMachine</code>: states, initial / final / choice pseudostates, labelled transitions; <code>current</code> highlights the live state.</li>
            <li><code>useCase</code>: actors, ovals, a system boundary, and include / extend / generalization.</li>
            <li><code>activity</code>: actions, decisions and merges, fork and join bars, swimlanes; <code>current</code> and <code>taken</code> highlight a walk through the flow.</li>
            <li><code>component</code>: components with provided (lollipop) and required (socket) interfaces, ports and nesting.</li>
            <li><code>deployment</code>: nodes with a top and right face, artifacts inside them, communication and deploy links.</li>
            <li><code>er</code>: entity-relationship diagrams in crow's-foot notation, with primary and foreign keys and weak entities.</li>
          </ul>
          <Code>{`
import { classDiagram, sequence } from '@dsviz/uml';

classDiagram(
  [{ id: 'Square', name: 'Square', x: 0, y: 200 }, { id: 'Rect', name: 'Rectangle', x: 0, y: 0, attributes: ['# w: number'] }],
  [{ from: 'Square', to: 'Rect', kind: 'inherits' }],
);
sequence(people, messages, { upTo: player.frame });          // reveal one message per step`}</Code>
          <p>Sequence diagrams compute their activation bars from the calls and returns, the same stack a running program keeps (<code>activations: false</code> hides them). An <code>alt</code> with <code>sections</code> gets an <code>[else]</code> divider, and each message can carry a <code>tone</code>. The class and object diagrams share box sizes, and the sequence and communication diagrams share a message type, so a pair of views of one thing can morph into each other instead of cutting.</p>
        </Section>

        <Section id="git" title="Git history">
          <p><code>graph(commits, refs)</code> from <code>@dsviz/git</code> draws a commit graph from <code>{'{ hash, parents, label }'}</code>, newest first, the order <code>git log</code> prints. Lanes follow the first-parent rule: a commit's first parent inherits its column, so a branch runs straight down and a branch on top of another continues its line; a merge's other parents open or join lanes. Commits are keyed by hash, so a before / after pair animates: a merge adds one dot, a rebase replaces dots.</p>
          <Code>{`
graph(
  [{ hash: 'm', parents: ['c', 'f'], label: 'Merge feature' }, { hash: 'c', parents: ['b'] }, { hash: 'f', parents: ['b'] }, { hash: 'b', parents: [] }],
  [{ name: 'main', hash: 'm', kind: 'branch' }],
  { highlight: ['m'] },
);`}</Code>
        </Section>


        <Section id="vanilla" title="Without React">
          <Code>{`
import { createView, toSVG } from '@dsviz/core';
import { array } from '@dsviz/ds';

const view = createView(document.querySelector('svg'));
view.render(array([1, 2, 3]));            // animate in the DOM
view.on('click', (e) => console.log(e.node.data));

const svgString = toSVG(array([1, 2, 3])); // static SVG for SSR, tests, thumbnails
toSVG(scene, { theme: 'dark' });           // pinned palette + background, for a file on its own`}</Code>
          <p>The stylesheet is added to <code>&lt;head&gt;</code> the first time a view is created. If your app ships <code>DEFAULT_CSS</code> itself (or a Content-Security-Policy forbids injected styles), pass <code>injectStyles: false</code> to <code>createView</code> or <code>&lt;Diagram injectStyles={'{false}'}&gt;</code>.</p>
        </Section>

        <Section id="exercises" title="Exercises">
          <ol className="exercises">
            <li><b>Add a <code>warning</code> tone.</b> Pure CSS: find how tones become <code>--dv-c / --dv-cf / --dv-cs</code> in <code>packages/core/src/styles.ts</code>.</li>
            <li><b>A <code>heap()</code> layout.</b> Build the implicit tree (children of i are 2i+1 and 2i+2), reuse <code>binaryTree()</code>, and draw the array underneath with matching keys.</li>
            <li><b>Three-set Venn.</b> Generalise <code>vennRegions</code>: each of the 7 regions is bounded by arcs between pairwise intersection points.</li>
            <li><b>Reingold–Tilford.</b> <code>packages/layout/src/tidy.ts</code> does it (<code>tree()</code>, and <code>binaryTree</code> with <code>layout: 'tidy'</code>). Delete it and rebuild it from <code>tests/tidy.test.ts</code>; then try Walker's fix, which spreads small subtrees evenly between big ones.</li>
            <li><b>Text crossfade.</b> Done in <code>packages/core/src/render.ts</code> with a fading ghost copy. Try the other approach: keep two text elements per id and swap which one is live. What does each do when a label changes twice inside one animation?</li>
          </ol>
        </Section>
      </div>
    </div>
  );
}
