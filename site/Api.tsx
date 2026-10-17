const rows: Array<[string, string] | string> = [
  'Core',
  ['rect · circle · text · arrow · path', 'Primitives. Rects and circles are centred on x, y. Common props: id, tone, role, opacity, dashed, enter, exit, draggable, interactive, data.'],
  ['combine(...parts) · translate · namespace', 'Flatten nested parts into one scene (falsy parts skipped); shift a part; prefix its ids.'],
  ['bounds(part) · nodeBounds(node)', 'Axis-aligned bounds (text is estimated).'],
  ['handle({ id, x, y, r, hit, hint })', 'A draggable dot with a big invisible hit target; hint pulses a ring.'],
  ['burst({ id, x, y })', 'A ring of particles that fly out from (x, y) as they enter.'],
  ['createView(svg, opts)', 'The keyed renderer: render(scene, { duration }), on(event), toWorld, setViewBox, destroy.'],
  ['toSVG(scene)', 'A standalone SVG string, no DOM needed.'],
  ['createPlayer(frames, opts)', 'Step / play / seek through generator snapshots.'],
  ['V2 · vadd · vsub · vscale · vlen · vnorm · vperp · vlerp', 'Plain { x, y } vector helpers.'],
  'dsviz/react',
  ['<Diagram scene viewBox size scale duration ease onClick onDrag />', 'Renders a scene and tweens changes. Natural size by default.'],
  ['usePlayer(make, deps, { interval, start })', 'Generator frames as React state: frame, index, count, playing, next, prev, first, seek, toggle.'],
  ['useTicker(ms, active) · useBurst()', 'A counter for timed animation; particles + fire(x, y) for a scene.'],
  ['Slider · Segmented · Select · Switch · NumberStepper · Button · TextInput', 'Small controls on Radix primitives, value / onChange props.'],
  ['Transport · CodeTrace', 'Play / step / scrub for a player; source lines with the current one highlighted.'],
  'Data structures (top level, or ds.*)',
  ['array(values, opts)', 'Cells with index labels. Anchors: top/bottom/left/right/center(i), window(lo, hi). keys for identity.'],
  ['pointer({ id, at, label, side, level })', 'A labelled arrow that slides when at changes.'],
  ['linkedList(nodes, opts) · listFromValues', 'Boxes from { key, value, next }; anchors top/bottom/center(key), slot(i).'],
  ['binaryTree(root, opts) · treeFromLevelOrder', 'In-order layout of { key, left, right }; pos/top/bottom(key).'],
  ['graph(nodes, edges, opts) · circularPositions', 'Circles and edges; directed, weighted, curved antiparallel pairs.'],
  ['grid(rows, opts) · stack · queue', 'Tables with row/column headers (cellWidth / cellHeight for words); arrays with push/pop motion.'],
  ['hashMap(entries, opts)', 'A Map or [key, value] pairs as a key / value table in insertion order; bare keys draw a set. Rows are keyed by key, so inserts drop in and updates change in place. title, tones by key, keyAt / valueAt / left / right anchors.'],
  'plot.*',
  ['plane({ x, y, width, height })', 'World ↔ pixel mapping: sx, sy, toPx, toWorld, clamp, viewBox().'],
  ['axes · fn · point · segment · vector · label', 'Axes with grid and ticks; curves split at asymptotes and clipped; draggable points.'],
  ['tangent · area · riemann · integrate · derivative · niceTicks', 'Tangent lines (returns slope), shaded areas, Riemann sums (returns sum).'],
  'prob.*',
  ['bars · sampleSpace · diePips', 'Distribution bars with baseline and reference line; outcome grids; die faces.'],
  ['probTree(root, opts)', 'Left-to-right tree with branch probabilities and leaf products.'],
  ['venn2(a, b, opts) · vennRegions · vennAreas · vennRegionAt', 'Two-set Venn with arc-built regions, their areas, and hit testing.'],
  'geom.*',
  ['polygon · segment · tickMarks · angleMark · circle · pointLabel', 'Figure parts in pixel coordinates; angle marks become squares at 90°.'],
  ['angleAt · lineIntersection · circleIntersections · footOfPerpendicular', 'Measurement and construction helpers.'],
  ['circumcircle · incircle · centroid · orthocenter · signedArea · arcPoints', 'Triangle centres and friends.'],
  'sched.* · mem.*',
  ['simulate(procs, policy, quantum)', 'fcfs, sjf, srtf, rr, priority → segments, per-tick queue, per-process stats.'],
  ['gantt(segments, opts)', 'Lanes, time axis, now cursor, arrival markers; bars keyed by process and segment. A segment may set its own lane, label and tone, which makes it a general timeline.'],
  ['stackHeap(frames, heap, opts)', 'Frames and heap objects with reference arrows.'],
  ['memory(opts) · hex', 'A byte strip with typed groups and hex addresses.'],
  'Connectors (top level)',
  ['connector({ id, from, to, start, end, route, via, dashed, label, startLabel, endLabel })', "A line between boxes or points with end markers: 'arrow' · 'open' · 'triangle' · 'diamond' · 'diamond-filled'. route: 'straight' or 'elbow'. Returns points and along(t)."],
  ['rectEdge(frame, toward) · route · pointAlong', 'Where a ray leaves a box; the polyline a connector follows; a point by length along it.'],
  'uml.*',
  ['classDiagram(classes, relations, opts)', 'Class boxes (name / attributes / methods, «stereotype», abstract in italics) and the six relationships: inherits, implements, composition, aggregation, association, dependency. Options: collapsed, dim, interactive, draggable, route. RELATION_STYLE maps kind → line and markers.'],
  ['sequence(participants, messages, { upTo, numbered, gap, row, fragments })', 'Lifelines, call / return / async messages, self-calls; upTo reveals messages one at a time. activations(messages) derives the bars from the call stack. fragments box a run of messages: { kind: \'loop\' | \'alt\' | \'opt\' | …, label, from, to, over }.'],
  ['stateMachine(states, transitions, { current, fired })', 'Rounded states, initial / final / choice pseudostates, labelled (and bendable) transitions, self-loops.'],
  'sys.*',
  ['architecture(components, links, opts)', "Components by kind: client · user · lb · gateway · service · cache · db · queue · cdn · storage · file (role sys-<kind>, coloured by the stylesheet). opts.zones draws dashed boundaries around groups ({ id, label, around, tone }), nested from the inside out. Returns frame(id) and along(from, to, t) for animating along links."],
  ['component(c) · zone({ id, label, box }) · packet({ id, x, y, tone, label })', 'One component on its own; a boundary around any box; a request dot that glides between renders when its id is kept.'],
];

export function Api() {
  return (
    <div className="doc-main api-page">
      <h1>API</h1>
      <p className="lede">Everything is exported from <code>dsviz</code> and <code>dsviz/react</code>. Layouts return a scene plus anchor helpers.</p>
      <div className="api">
        <table>
          <tbody>
            {rows.map((r, i) =>
              typeof r === 'string' ? (
                <tr key={i} className="group"><td colSpan={2}>{r}</td></tr>
              ) : (
                <tr key={i}><td>{r[0]}</td><td>{r[1]}</td></tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
