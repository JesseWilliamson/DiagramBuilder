import { ReactNode } from 'react';
import { M } from './M';

function Part({ id, kicker, title, lede, children }: { id: string; kicker: string; title: string; lede: ReactNode; children: ReactNode }) {
  return (
    <section className="doc-part" id={id}>
      <div className="eyebrow">{kicker}</div>
      <h2 className="serif doc-title">{title}</h2>
      <p className="doc-lede">{lede}</p>
      {children}
    </section>
  );
}

/** Reference docs: how it works, using it from React, the API, exercises. */
export function Docs() {
  return (
    <div className="docs">
      <h1 className="serif docs-h1">dsviz docs</h1>
      <p className="docs-sub">A small SVG library for interactive, animated teaching diagrams. Framework-free core, thin React layer. Every lesson on this site is built from it; open <b>{'</>'}</b> in any lesson to see and edit the code.</p>
      <Part id="idea" kicker="How it works" title="State in, scene out" lede={<>Every diagram is a function from your state to a <code>Scene</code>: a flat list of plain objects (rect, circle, text, arrow, path), each with a stable <code>id</code>.</>}>
        <div className="prose">
          <p>When the scene changes, the renderer matches nodes <em>by id</em>. Same id: it's the same thing, so tween it from where it is now to where it should be. New id: fade it in. Missing id: fade it out. That's React's <code>key</code>, applied to geometry.</p>
          <p>Layouts never know about styling. They emit semantic parts (<code>role: 'value' | 'index' | 'curve' | 'grid'</code> …) plus a <code>tone</code>, and the stylesheet decides how each one looks. That's how the whole library got its Brilliant-style look from one CSS file: black 1.5px lines, flat fills, light grids, and a 3D lip under anything you can press.</p>
          <p>Paths with different point counts are resampled by arc length before tweening, which is how a <M>{'\\sin x'}</M> curve can morph into a parabola, or an angle arc into a right-angle square.</p>
        </div>
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
          <div className="prose">
            <p><b>Theming.</b> Every colour is a CSS variable on <code>.dv-root</code> (diagrams) and <code>.dvc</code> (controls): <code>--dv-accent</code>, <code>--dv-surface</code>, <code>--dv-stroke</code>… Override them on any ancestor. The default is light; dark mode switches on <code>[data-theme="dark"]</code> or <code>.dark</code>.</p>
            <p><b>Fun.</b> <code>{'<Challenge goals={[{ label, done }]} />'}</code> is a sticky checklist that celebrates each tick. <code>&lt;Predict question options answer&gt;</code> asks before it tells. <code>useBurst()</code> returns particles to drop into a scene plus a <code>fire(x, y)</code>. Draggable handles take <code>hint</code> to pulse until first touched, and interactive tiles sit on a small lip that rises on hover and sinks when pressed.</p>
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
                <tr><td>{'handle({ id, x, y, hint })'}</td><td>A draggable dot with a large invisible hit target; <code>hint</code> pulses a "drag me" ring.</td></tr>
                <tr><td>{'burst({ id, x, y })'}</td><td>A ring of particles that fly out from (x, y) when they enter.</td></tr>
                <tr><td>createView(svg) · toSVG(scene)</td><td>The keyed renderer (vanilla JS), and a static SVG string for SSR or tests.</td></tr>
                <tr><td>createPlayer(frames)</td><td>Step / play / seek through generator snapshots.</td></tr>
                <tr className="group"><td colSpan={2}>dsviz/react</td></tr>
                <tr><td>&lt;Diagram scene viewBox onDrag onClick /&gt;</td><td>Renders a scene and tweens changes. Fixed <code>viewBox</code> for plots, auto-fit otherwise.</td></tr>
                <tr><td>usePlayer(make, deps) · useTicker(ms)</td><td>Generator frames as React state; a counter for timed animation.</td></tr>
                <tr><td>Challenge · Predict · useBurst</td><td>Goals that tick and celebrate; predict-then-reveal; confetti made of scene nodes.</td></tr>
                <tr><td>MultipleChoice · Feedback · ProgressSegments</td><td>The lesson kit: answer pills/cards, the green "Correct!" / pink "Try once more" sheet, and the segmented progress bar.</td></tr>
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

        
    </div>
  );
}
