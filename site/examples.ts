/** The examples page, in order. `name` is the file in demos/. */
export interface Example {
  name: string;
  title: string;
  desc: string;
}
export interface Group {
  id: string;
  title: string;
  intro: string;
  items: Example[];
}

export const groups: Group[] = [
  {
    id: 'core',
    title: 'Core',
    intro: 'Primitives with stable ids. Change the state, render again, and everything that kept its id moves.',
    items: [
      { name: 'Scenes', title: 'Scenes and ids', desc: 'Shapes keyed by id. Shuffle moves them, Add fades one in, Remove fades one out. Colour is a CSS transition.' },
    ],
  },
  {
    id: 'ds',
    title: 'Data structures',
    intro: 'Arrays, pointers, maps, lists, trees, graphs and grids. Algorithms are generators; usePlayer turns their frames into a timeline.',
    items: [
      { name: 'BinarySearch', title: 'Binary search', desc: 'Generator frames, a code trace, and pointers that slide.' },
      { name: 'WhyFast', title: 'Halving', desc: 'Why binary search takes log₂ n steps.' },
      { name: 'BubbleSort', title: 'Keys decide what moves', desc: 'With keys, a swap slides two tiles past each other. Without, the numbers change in place.' },
      { name: 'HashMap', title: 'Hash map', desc: 'Two Sum with a map of values seen. Rows are keyed by the map key, so each entry drops in as its own row.' },
      { name: 'LinkedList', title: 'Reversing a linked list', desc: 'Each arrow is keyed by the node it leaves, so flipping a pointer swings it round.' },
      { name: 'Bst', title: 'Binary search tree', desc: 'Insert and search; new nodes grow out of their parent.' },
      { name: 'TidyTree', title: 'Tidy trees', desc: 'Reingold–Tilford for n-ary trees: subtrees pushed together until their outlines almost touch.' },
      { name: 'Graph', title: 'BFS and DFS', desc: 'Drag the nodes; click one to start from it.' },
      { name: 'Layered', title: 'Layered layout and node kinds', desc: 'A pipeline with no coordinates: layers follow the edges, long edges bend around boxes. Click a task to see its blast radius, coloured by node kind.' },
      { name: 'GraphColoring', title: 'Graph colouring', desc: 'Click to cycle colours; clashing edges turn red.' },
      { name: 'Lcs', title: 'Dynamic programming table', desc: 'Longest common subsequence, with dependency arrows and a traceback.' },
    ],
  },
  {
    id: 'plot',
    title: 'Plots',
    intro: 'plane (@figurae/plot) maps maths coordinates (y up) to pixels. Axes, curves, points, tangents, areas and Riemann sums all take the plane.',
    items: [
      { name: 'Tangent', title: 'Tangent lines', desc: 'Drag along the curve. Switching functions morphs the curve.' },
      { name: 'Riemann', title: 'Riemann sums', desc: 'Drag a and b, change n and the rule.' },
      { name: 'Vectors', title: 'Vectors', desc: 'Sum, difference and projection, with draggable tips.' },
    ],
  },
  {
    id: 'prob',
    title: 'Probability',
    intro: 'Sample spaces, distributions, trees and Venn diagrams.',
    items: [
      { name: 'Dice', title: 'Sample space', desc: 'Two dice. Click a cell or a bar to choose the event.' },
      { name: 'Venn', title: 'Venn diagram', desc: 'Regions built from arcs, so they can be shaded and measured. Drag the circles.' },
      { name: 'Bayes', title: 'Probability tree', desc: 'Multiply along the branches; Bayes compares the two + leaves.' },
      { name: 'Galton', title: 'Galton board', desc: 'Keyed balls falling one row per tick into binomial bins.' },
      { name: 'LargeNumbers', title: 'Law of large numbers', desc: 'Frequencies settle on 1/6 and the running mean on 3.5.' },
      { name: 'MontyHall', title: 'Monty Hall', desc: 'Play, then simulate a few hundred games.' },
    ],
  },
  {
    id: 'geom',
    title: 'Geometry',
    intro: 'Polygons, angle marks, tick marks and labelled points, plus intersection and centre helpers.',
    items: [
      { name: 'Pythagoras', title: 'Square in a square', desc: 'Drag the point on the top edge.' },
      { name: 'Triangle', title: 'Triangle centres', desc: 'Drag the vertices. The angle arc becomes a square at exactly 90°.' },
      { name: 'Inscribed', title: 'Inscribed angle', desc: 'Drag P around the circle; the angle stays half the arc.' },
    ],
  },
  {
    id: 'systems',
    title: 'Systems',
    intro: 'CPU scheduling and memory.',
    items: [
      { name: 'Scheduling', title: 'CPU scheduling', desc: 'simulate (@figurae/os) plus a Gantt chart keyed by process and segment.' },
      { name: 'PythonMemory', title: 'Names and objects', desc: 'Frames, heap objects and reference arrows.' },
      { name: 'Pointers', title: 'Pointer arithmetic', desc: 'The same bytes as char, int or double.' },
    ],
  },
  {
    id: 'design',
    title: 'Software design',
    intro: 'UML (classDiagram, sequence, stateMachine), system design (architecture, packet) and git history (graph from @figurae/git). Lines and their end markers come from connector().',
    items: [
      { name: 'UmlArrows', title: 'UML relationships', desc: 'The six arrows, each beside the code that creates it.' },
      { name: 'ClassDiagram', title: 'Class diagram', desc: 'Drag the classes; click one to see only its relationships.' },
      { name: 'Sequence', title: 'Sequence diagram', desc: 'A login, step by step. Activation bars follow the call stack.' },
      { name: 'Checkout', title: 'Alternatives and notes', desc: 'An alt fragment with an [else] branch, per-message tones for the failure path, a note in its own row, and activation bars you can turn off.' },
      { name: 'StateMachine', title: 'State machine', desc: 'An order lifecycle. Only legal events are enabled.' },
      { name: 'RequestFlow', title: 'A request through a web stack', desc: 'Hop by hop with latency: cache hit versus miss.' },
      { name: 'LoadBalancer', title: 'Load balancing', desc: 'Round robin, least connections and random, with a slow server. Click a server to take it down.' },
      { name: 'ConsistentHashing', title: 'Consistent hashing', desc: 'Add or remove a server and count the keys that move, ring versus hash % N.' },
      { name: 'TrustZones', title: 'Trust boundaries', desc: 'Zones around machines and a sandbox. Step a job across and see which files may cross.' },
      { name: 'GitGraph', title: 'Merge versus rebase', desc: 'graph from @figurae/git: lanes by first parent, curved edges, branch pills. Commits are keyed by hash, so the switch animates.' },
      { name: 'Polling', title: 'Polling in a loop', desc: 'A sequence diagram with a loop fragment that grows as the polls come back.' },
      // uml: deployment, object, package
      { name: 'Deployment', title: 'Deployment diagram', desc: 'Machines with nested runtimes and the files they host. Add a second server and a load balancer; the layout rearranges.' },
      { name: 'ObjectDiagram', title: 'Class view and object view', desc: 'The same ids drawn as classes or as live objects (name : Class, slots). Switch and the boxes morph.' },
      { name: 'PackageDiagram', title: 'Package diagram', desc: 'Nested packages and import / access / merge relations at any depth. Click one to see what it uses.' },
      // communication, er
      { name: 'Communication', title: 'Communication diagram', desc: 'The login again, as links and numbered messages (1, 1.1, 1.1.1), stepped in step with the sequence view.' },
      { name: 'Er', title: 'Entity–relationship', desc: "A shop schema in crow's-foot or Chen notation. Click an entity to see its relationships." },
      // uml: use case, activity, component
      { name: 'UseCase', title: 'Use case diagram', desc: 'A web shop: actors, ovals, «include» and «extend». Click an actor to see what they can do; toggle the system boundary.' },
      { name: 'Activity', title: 'Activity diagram', desc: 'An order across three swimlanes: decision, fork and join, flow final. Step through, or switch the stock off for the other branch.' },
      { name: 'Component', title: 'Component diagram', desc: 'Lollipops and sockets join into assemblies; a port delegates into a nested component. Click one to see its interfaces.' },
    ],
  },
];
