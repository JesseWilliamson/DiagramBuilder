const rows: Array<[string, string] | string> = [
  '@dsviz/core',
  ['rect · circle · text · arrow · path', 'Primitives. Rects and circles are centred on x, y. Common props: id, tone, role, opacity, dashed, enter, exit, draggable, interactive, data.'],
  ['combine(...parts) · translate · namespace', 'Flatten nested parts into one scene (falsy parts skipped); shift a part; prefix its ids.'],
  ['bounds(part) · nodeBounds(node)', 'Axis-aligned bounds (text is estimated).'],
  ['handle({ id, x, y, r, hit, hint })', 'A draggable dot with a big invisible hit target; hint pulses a ring.'],
  ['burst({ id, x, y })', 'A ring of particles that fly out from (x, y) as they enter.'],
  ['createView(svg, opts)', 'The keyed renderer: render(scene, { duration }), on(event), toWorld, setViewBox, destroy. A text node whose words change crossfades (crossfade: false to turn off); injectStyles: false leaves <head> alone.'],
  ['toSVG(scene, { theme, background, embedStyles, padding, width })', "A standalone SVG string, no DOM needed. theme: 'light' | 'dark' pins that palette on the <svg> and paints its surface behind."],
  ['createPlayer(frames, opts)', 'Step / play / seek through generator snapshots.'],
  ['V2 · vadd · vsub · vscale · vlen · vnorm · vperp · vlerp', 'Plain { x, y } vector helpers.'],
  ['fitViewBox(parts, pad) · nextCamera(current, content, mode)', "The fixed camera for a step-through (the union of every frame's bounds), and the 'grow' auto-camera rule: grow on overflow, shrink only below half fill."],
  ['estimateTextWidth(s, size) · circleEdge · style(part, patch)', 'Text width is estimated (0.6 em a character), never measured; where a ray leaves a circle; override tone, role, opacity or dashed on every node of a part.'],
  ['DEFAULT_CSS · THEME_VARS · injectStyles(doc)', 'The stylesheet as a string, the light and dark variable blocks, and the function that adds it to <head> (createView calls it for you).'],
  ['linear · easeOutCubic · easeInOutCubic · easeOutBack · easeOutSoft · easeInQuad', 'Easing functions for <Diagram ease>; easeOutSoft is the default.'],
  ['parseMath · mathWidth · mathTspans · pathData · resample', 'The TeX-lite parser behind role: math, and the path helpers behind smoothing and morphing between point counts.'],
  ['connector({ id, from, to, start, end, route, via, dashed, label, startLabel, endLabel })', "A line between boxes or points with end markers: 'arrow' · 'open' · 'triangle' · 'diamond' · 'diamond-filled'. route: 'straight' or 'elbow'. Returns points and along(t)."],
  ['rectEdge(frame, toward) · route · pointAlong', 'Where a ray leaves a box; the polyline a connector follows; a point by length along it.'],
  '@dsviz/react',
  ['<Diagram scene viewBox size scale duration ease onClick onDrag injectStyles crossfade label />', 'Renders a scene and tweens changes. Natural size by default. injectStyles={false} when the app ships the CSS itself.'],
  ['usePlayer(make, deps, { interval, start })', 'Generator frames as React state: frame, index, count, playing, next, prev, first, seek, toggle.'],
  ['useTicker(ms, active) · useBurst() · useScene(build, deps)', 'A counter for timed animation; particles + fire(x, y) for a scene; useMemo under a clearer name.'],
  ['Slider · Segmented · Select · Switch · NumberStepper · Button · TextInput', 'Small controls on Radix primitives, value / onChange props.'],
  ['MathText', 'The role: math typesetting in HTML: <MathText tex="a^2 + b^2" />.'],
  ['Transport · CodeTrace', 'Play / step / scrub for a player; source lines with the current one highlighted.'],
  '@dsviz/ds',
  ['array(values, opts)', 'Cells with index labels. Anchors: top/bottom/left/right/center(i), window(lo, hi). keys for identity.'],
  ['pointer({ id, at, label, side, level })', 'A labelled arrow that slides when at changes.'],
  ['linkedList(nodes, opts) · listFromValues', 'Boxes from { key, value, next }; anchors top/bottom/center(key), slot(i).'],
  ['binaryTree(root, opts) · treeFromLevelOrder', "In-order layout of { key, left, right } (layout: 'tidy' for Reingold–Tilford); pos/top/bottom(key)."],
  ['tree(root, { layout, shape, gap, dy, tones })', "n-ary trees of { key, label, children }: tidy (Reingold–Tilford, default) or 'leaves' (one column per leaf). shape: 'rect' sizes boxes to their labels."],
  ['graph(nodes, edges, opts) · circularPositions · graphNodeSize', "Circles (or shape: 'rect', sized to the label) and edges; directed, weighted, curved antiparallel pairs. A node's kind becomes role node-<kind>: changed, upstream, downstream and test are styled. Nodes without x/y go on a circle, or in layers with layout: 'layered' (direction, rankGap, nodeGap, route: 'straight' | 'elbow')."],
  ['grid(rows, opts) · stack · queue', 'Tables with row/column headers (cellWidth / cellHeight for words); arrays with push/pop motion.'],
  ['ToneSpec · resolveTone · show', 'The tones option shared by the layouts: { 2: \'active\' } or (key, value) => tone. array, stack, queue and bars key it by index; hashMap and trees by key.'],
  ['hashMap(entries, opts)', 'A Map or [key, value] pairs as a key / value table in insertion order; bare keys draw a set. Rows are keyed by key, so inserts drop in and updates change in place. title, tones by key, keyAt / valueAt / left / right anchors.'],
  '@dsviz/plot',
  ['plane({ x, y, width, height })', 'World ↔ pixel mapping: sx, sy, toPx, toWorld, clamp, viewBox().'],
  ['axes · fn · point · segment · vector · label', 'Axes with grid and ticks; curves split at asymptotes and clipped; draggable points.'],
  ['tangent · area · riemann · integrate · derivative · niceTicks · clipToPlane', 'Tangent lines (returns slope), shaded areas, Riemann sums (returns sum).'],
  '@dsviz/prob',
  ['bars · sampleSpace · diePips', 'Distribution bars with baseline and reference line; outcome grids; die faces.'],
  ['probTree(root, opts)', 'Left-to-right tree with branch probabilities and leaf products.'],
  ['venn2(a, b, opts) · vennRegions · vennAreas · vennRegionAt', 'Two-set Venn with arc-built regions, their areas, and hit testing.'],
  '@dsviz/geom',
  ['polygon · segment · tickMarks · angleMark · circle · pointLabel', 'Figure parts in pixel coordinates; angle marks become squares at 90°.'],
  ['angleAt · toDegrees · dot · cross · lineIntersection · circleIntersections · footOfPerpendicular', 'Measurement and construction helpers.'],
  ['circumcircle · incircle · centroid · orthocenter · signedArea · arcPoints', 'Triangle centres and friends.'],
  '@dsviz/os',
  ['simulate(procs, policy, quantum)', 'fcfs, sjf, srtf, rr, priority → segments, per-tick queue, per-process stats.'],
  ['gantt(segments, opts)', 'Lanes, time axis, now cursor, arrival markers; bars keyed by process and segment. A segment may set its own lane, label and tone, which makes it a general timeline.'],
  ['stackHeap(frames, heap, opts)', 'Frames and heap objects with reference arrows.'],
  ['memory(opts) · hex', 'A byte strip with typed groups and hex addresses.'],
  '@dsviz/git',
  ['graph(commits, refs, { highlight, rowH, laneW, r, tones })', "Commit graph from { hash, parents, label, tone } newest first: lanes by first-parent inheritance (tips take the first free lane, merges open or join lanes), curved edges, ref pills by kind (branch · remote · tag · head), highlight dims the rest. Returns pos, lane, row, lanes, labelX."],
  ['gitLanes(commits)', 'The lane walk on its own: lane and row per commit, and the lane each parent edge travels down.'],
  '@dsviz/layout',
  ['layered(nodes, edges, { direction, rankGap, nodeGap, sweeps })', "Sugiyama-lite DAG layout: cycles broken by DFS, longest-path layers, barycentre ordering, pool-adjacent-violators placement. Returns pos, rank, layers, path(from, to), route(from, to, 'straight' | 'elbow'), box, crossings. Used by graph, architecture and the UML diagrams for nodes without x/y."],
  ['pack(want, sep)', 'The one-dimensional step inside layered: the closest ordered positions that keep minimum gaps.'],
  ['tidy(root, children, { width, gap, slot })', 'Reingold–Tilford placement for any tree shape: subtrees pushed together by their contours, parents centred. null children are empty slots.'],
  '@dsviz/uml',
  ['classDiagram(classes, relations, opts)', 'Class boxes (name / attributes / methods, «stereotype», abstract in italics) and the six relationships: inherits, implements, composition, aggregation, association, dependency. Options: collapsed, dim, interactive, draggable, route. RELATION_STYLE maps kind → line and markers.'],
  ['sequence(participants, messages, { upTo, numbered, gap, row, fragments })', 'Lifelines, call / return / async messages, self-calls; upTo reveals messages one at a time. activations(messages) derives the bars from the call stack. fragments box a run of messages: { kind: \'loop\' | \'alt\' | \'opt\' | …, label, from, to, over, sections } (sections add [else]-style dividers). notes: { over: id | [a, b], text, at } each take their own row. Per-message tone; activations: false hides the bars; highlight: false stops toning the current step.'],
  ['stateMachine(states, transitions, { current, fired, direction })', 'Rounded states, initial / final / choice pseudostates, labelled (and bendable) transitions, self-loops. States without x/y are placed by the layered layout.'],
  // er
  ['er(entities, relationships, { collapsed, interactive, draggable, dim, rankGap, nodeGap })', "Entity–relationship diagram in crow's-foot notation. Entities: name (in a shaded header band), attributes { name, type, key: 'primary' | 'foreign', nullable }, weak (double outline). Relationships: from, to, fromCard / toCard ('one' · 'many' · 'zero-one' · 'zero-many' · 'one-many', drawn as 12px markers at the box edge: a bar is one, a ring is zero, a crow's foot is many), label (beside the line), identifying (false = dashed). Entities without x/y are placed by the layered layout top to bottom, the one side above the many side; a relationship that skips a layer is routed round the boxes between. Returns box(id). cardinalityMarker draws one end; erPort is where a line meets a box."],
  // uml: deployment
  ['deployment(nodes, artifacts, links, { route, direction, interactive, draggable, rankGap, nodeGap })', "Nodes drawn as 3D boxes (a 10px top and right face, shaded by the stylesheet) with an 11px «stereotype» over a 13px name, sized from the inside out: artifacts (cards with a 12px mono name and the folded-page icon) in a small grid, then nested nodes (parent) in a row with a 12px inset. Links between nodes or artifacts: communication (a plain line, its «protocol» label lifted off the middle) · deploy (dashed open arrow). Top-level nodes are placed (x, y = centre of the front face) or laid out by layered, left to right or down. Returns box(id); DEPLOY and NODE_DEPTH hold the sizes, headHeight(node) the title band."],
  // uml: use case, activity, component
  ['useCase(actors, cases, relations, { system, interactive, draggable, dim, rankGap, nodeGap })', "Stick-figure actors (side: 'left' | 'right'), oval cases and a boundary ({ name }) round the cases. Relations: association (line) · include and extend (dashed open arrow with the «» label; include points from the base, extend back at its base) · generalization (hollow triangle). Cases without x/y go in layered columns (the actors take part in the layout, so one actor's cases sit together), else a grid; actors line up beside the cases they use. Returns frame(id), frames, boundary."],
  ['activity(nodes, flows, { swimlanes, direction, current, taken, interactive, draggable, rankGap, nodeGap })', "Nodes by kind: action (rounded card) · decision / merge (26px diamond) · fork / join (6px bar as wide as the flows it spans, plus 24) · start (filled dot) · end (ring and dot) · flowFinal (ring with an X). Flows leave the bottom centre and enter the top centre with right angles, routed round anything in the way; a sideways branch leaves a decision by its side point, and its guard sits beside that first segment, off the line, with a halo. Layered placement; with swimlanes (a 26px title band, faint dividers) each node's lane id fixes its position across the flow (columns when it runs down, rows when it runs right). current (id or set) and taken (flow indices) highlight a walk. Returns frame(id), frames, lanes."],
  ['component(components, connections, { direction, interactive, draggable, dim, route, rankGap, nodeGap })', "Components (13px name, the two-tab icon at the top-right, stereotype) with provides (a 16px stub and a ball) and requires (a stub and a half-circle socket) interfaces on the side facing their partner, spread so none touch; ports ({ id, name, side, at } or an exact x/y along the side) and nesting by parent (the frame's title at its top-left). Connections: assembly (the socket closes round the ball halfway between the boxes; the requirer's stub elbows to it) · dependency (dashed open arrow) · delegate (solid open arrow), between components or ports; name an interface on a delegate to point at its lollipop. Labels sit beside the lines. Placed left to right by the layered layout; a parent frames its laid-out children. Returns frame(id), frames; COMPONENT holds the sizes."],
  ['classSize · erSize · caseSize · activitySize · stateFrame · headSize · participantHead', 'The sizes and heads the layouts use, for hand-built boxes in the same style. Plus the style tables RELATION_STYLE, USE_CASE_STYLE and PACKAGE_RELATION.'],
  ['stickFigure({ id, x, y, name, tone }) · figureFrame', 'The actor figure on its own (used by useCase).'],
  '@dsviz/arch',
  ['architecture(components, links, opts)', "Components by kind: client · user · lb · gateway · service · cache · db · queue · cdn · storage · file (role sys-<kind>, coloured by the stylesheet). opts.zones draws dashed boundaries around groups ({ id, label, around, tone }), nested from the inside out. Returns frame(id) and along(from, to, t) for animating along links."],
  ['component(c) · zone({ id, label, box }) · packet({ id, x, y, tone, label })', 'One component on its own; a boundary around any box; a request dot that glides between renders when its id is kept.'],
];

export function Api() {
  return (
    <div className="doc-main api-page">
      <h1>API</h1>
      <p className="lede">Everything is exported flat from the <code>@dsviz/*</code> packages, named in each heading below. Layouts return a scene plus anchor helpers.</p>
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
