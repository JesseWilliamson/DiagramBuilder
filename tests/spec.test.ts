import { describe, expect, it } from 'vitest';
import { describeSpec, DIAGRAM_TYPES, fromSpec, validateSpec } from '@figurae/spec';
import type { DiagramSpec } from '@figurae/spec';

/** One small valid spec per type. */
const valid: Record<DiagramSpec['type'], DiagramSpec> = {
  sequence: {
    type: 'sequence',
    title: 'Login',
    participants: [{ id: 'user', label: 'User', kind: 'actor' }, { id: 'api', label: 'API' }, { id: 'db', label: 'DB' }],
    messages: [
      { from: 'user', to: 'api', label: 'POST /login' },
      { from: 'api', to: 'db', label: 'find user' },
      { from: 'db', to: 'api', label: 'row', kind: 'return' },
      { from: 'api', to: 'user', label: '200 + token', kind: 'return', tone: 'success' },
      { from: 'api', to: 'user', label: '401', kind: 'return', tone: 'danger' },
    ],
    fragments: [{ kind: 'alt', from: 3, to: 4, sections: [{ label: 'password ok', from: 3, to: 3 }, { label: 'else', from: 4, to: 4 }] }],
    notes: [{ over: 'api', text: 'bcrypt compare', at: 3 }],
  },
  class: {
    type: 'class',
    classes: [{ id: 'Shape', abstract: true, methods: ['+ area(): number'] }, { id: 'Circle', attributes: ['- r: number'] }],
    relations: [{ from: 'Circle', to: 'Shape', kind: 'inherits' }],
  },
  state: {
    type: 'state',
    states: [{ id: 'start', kind: 'initial' }, { id: 'idle' }, { id: 'running' }, { id: 'end', kind: 'final' }],
    transitions: [{ from: 'start', to: 'idle' }, { from: 'idle', to: 'running', label: 'start' }, { from: 'running', to: 'idle', label: 'pause' }, { from: 'running', to: 'end', label: 'finish' }],
    current: 'running',
  },
  architecture: {
    type: 'architecture',
    components: [{ id: 'web', kind: 'client', label: 'Browser' }, { id: 'api', kind: 'service', label: 'API' }, { id: 'db', kind: 'db', label: 'Postgres' }],
    links: [{ from: 'web', to: 'api', label: 'HTTPS' }, { from: 'api', to: 'db' }],
    zones: [{ id: 'vpc', label: 'VPC', around: ['api', 'db'] }],
  },
  graph: {
    type: 'graph',
    nodes: [{ id: 'parse', kind: 'changed' }, { id: 'compile', kind: 'downstream' }, { id: 'parse.test', kind: 'test' }],
    edges: [{ from: 'parse', to: 'compile' }, { from: 'parse', to: 'parse.test' }],
    directed: true,
  },
  git: {
    type: 'git',
    commits: [{ hash: 'm', parents: ['c', 'f'], label: 'Merge feature' }, { hash: 'c', parents: ['b'] }, { hash: 'f', parents: ['b'] }, { hash: 'b', parents: ['a0'] }],
    refs: [{ name: 'main', hash: 'm', kind: 'branch' }],
    highlight: ['m'],
  },
  array: { type: 'array', values: [1, 3, 5, 7, 9], tones: { '2': 'active' }, pointers: [{ label: 'lo', at: 0 }, { label: 'hi', at: 4 }], window: [0, 4] },
  table: { type: 'table', rows: [[0, 1], [1, 1]], columns: ['a', 'b'], rowLabels: ['x', 'y'], tones: [{ row: 1, col: 1, tone: 'active' }] },
};

const errorsOf = (x: unknown) => validateSpec(x).errors;
const at = (x: unknown, path: string) => errorsOf(x).find((e) => e.path === path)?.message;

describe('validateSpec: every type, valid', () => {
  it.each(DIAGRAM_TYPES)('%s', (type) => {
    const r = validateSpec(valid[type]);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.spec).toBe(valid[type]);
  });
});

describe('validateSpec: the spec itself', () => {
  it('rejects non-objects and unknown types, with a suggestion', () => {
    expect(errorsOf('hello')[0]).toEqual({ path: '', message: 'expected a diagram spec object, got the string "hello"' });
    expect(at({ nodes: [] }, 'type')).toMatch(/^is required: one of "sequence", "class"/);
    expect(at({ type: 'seqeunce' }, 'type')).toMatch(/did you mean "sequence"\?/);
  });
  it('flags unknown fields, with a "did you mean" when one is close', () => {
    const spec = { ...valid.sequence, messages: [{ from: 'user', to: 'api', lable: 'x', label: 'y' }] };
    expect(at(spec, 'messages[0].lable')).toBe('unknown field (did you mean "label"?)');
    expect(at({ ...valid.array, colour: 'red' }, 'colour')).toMatch(/^unknown field; allowed: "type", "title", "values"/);
  });
  it('caps list sizes', () => {
    expect(at({ type: 'array', values: Array(201).fill(1) }, 'values')).toBe('has 201 items; at most 200');
  });
});

describe('validateSpec: every type, invalid', () => {
  it('sequence: unknown participants, bad kinds, fragments out of range', () => {
    const spec = {
      type: 'sequence',
      participants: [{ id: 'user' }, { id: 'api' }, { id: 'api' }],
      messages: [{ from: 'user', to: 'apii', label: 'x' }, { from: 'api', to: 'user', label: 'y', kind: 'reply' }, { from: 'api', to: 'user' }],
      fragments: [{ kind: 'loop', from: 1, to: 9 }, { kind: 'alt', from: 0, to: 1, sections: [{ label: 'a', from: 0, to: 0 }, { label: 'b', from: 2, to: 2 }] }],
      notes: [{ over: ['user', 'nobody'], text: 'n', at: 4 }],
    };
    expect(at(spec, 'participants[2].id')).toBe('duplicate id "api" (also participants[1])');
    expect(at(spec, 'messages[0].to')).toBe('unknown participant "apii" (did you mean "api"?)');
    expect(at(spec, 'messages[1].kind')).toBe('must be one of "call", "return", "async"; got the string "reply"');
    expect(at(spec, 'messages[2].label')).toBe('is required');
    expect(at(spec, 'fragments[0].to')).toBe('message 9 is out of range; there are 3 (valid: 0..2)');
    expect(at(spec, 'fragments[1].sections[1].from')).toBe('must be inside the fragment (0..1), got 2');
    expect(at(spec, 'notes[0].over[1]')).toMatch(/^unknown participant "nobody"/);
    expect(at(spec, 'notes[0].at')).toBe('message 4 is out of range; there are 3 (valid: 0..3)');
  });
  it('class: unknown relation kinds and classes', () => {
    const spec = { type: 'class', classes: [{ id: 'A' }, { id: 'B', attributes: 'x' }], relations: [{ from: 'A', to: 'C', kind: 'extends' }] };
    expect(at(spec, 'relations[0].to')).toBe('unknown class "C"; the classes are "A", "B"');
    expect(at(spec, 'relations[0].kind')).toMatch(/^must be one of "inherits", .*; got the string "extends"$/);
    expect(at(spec, 'classes[1].attributes')).toBe('expected a list, got the string "x"');
  });
  it('state: transitions and current must name states; x needs y', () => {
    const spec = { type: 'state', states: [{ id: 'a', x: 3 }, { id: 'b' }], transitions: [{ from: 'a', to: 'c' }], current: 'z' };
    expect(at(spec, 'transitions[0].to')).toMatch(/^unknown state "c"/);
    expect(at(spec, 'current')).toMatch(/^unknown state "z"/);
    expect(at(spec, 'states[0]')).toBe('give both x and y, or neither (to have it placed for you)');
  });
  it('architecture: component kinds, links and zones', () => {
    const spec = { type: 'architecture', components: [{ id: 'a', kind: 'database' }, { id: 'b', kind: 'service' }], links: [{ from: 'a', to: 'x' }], zones: [{ id: 'z', label: 'Z', around: ['b', 'q'] }] };
    expect(at(spec, 'components[0].kind')).toMatch(/^must be one of "client", .*; got the string "database"$/);
    expect(at(spec, 'links[0].to')).toMatch(/^unknown component "x"/);
    expect(at(spec, 'zones[0].around[1]')).toMatch(/^unknown component "q"/);
  });
  it('graph: edges must join nodes; kinds must be CSS-safe; tones from the palette', () => {
    const spec = { type: 'graph', nodes: [{ id: 'a', kind: 'Changed File', tone: 'pink' }], edges: [{ from: 'a', to: 'b' }] };
    expect(at(spec, 'edges[0].to')).toMatch(/^unknown node "b"/);
    expect(at(spec, 'nodes[0].kind')).toMatch(/^must be a lowercase word/);
    expect(at(spec, 'nodes[0].tone')).toMatch(/^must be one of "default", "active"/);
  });
  it('git: newest first, refs and highlights name commits', () => {
    const spec = { type: 'git', commits: [{ hash: 'a', parents: [] }, { hash: 'b', parents: ['a'] }], refs: [{ name: 'main', hash: 'zz', kind: 'branch' }], highlight: ['q'] };
    expect(at(spec, 'commits[1].parents[0]')).toBe('"a" is listed at commits[0], not after this commit; list commits newest first (children before parents)');
    expect(at(spec, 'refs[0].hash')).toMatch(/^unknown commit "zz"/);
    expect(at(spec, 'highlight[0]')).toMatch(/^unknown commit "q"/);
    expect(at({ type: 'git', commits: [{ hash: 'a' }] }, 'commits[0].parents')).toBe('is required');
  });
  it('array: indices in range, window ordered, values are scalars', () => {
    const spec = { type: 'array', values: [1, 2, { x: 1 }], tones: { '7': 'active', mid: 'active' }, pointers: [{ label: 'i', at: 3 }], window: [2, 1] };
    expect(at(spec, 'values[2]')).toBe('expected a string, a number or null, got an object');
    expect(at(spec, 'tones.7')).toBe('index 7 is out of range; there are 3 (valid: 0..2)');
    expect(at(spec, 'tones.mid')).toBe('keys are indices like "2", got "mid"');
    expect(at(spec, 'pointers[0].at')).toMatch(/^index 3 is out of range/);
    expect(at(spec, 'window')).toBe('must be [lo, hi] with lo ≤ hi, got [2, 1]');
  });
  it('table: labels fit, tones point at cells', () => {
    const spec = { type: 'table', rows: [[1, 2]], columns: ['a', 'b', 'c'], tones: [{ row: 0, col: 5, tone: 'active' }] };
    expect(at(spec, 'columns')).toBe('has 3 labels but the widest row has 2 cells');
    expect(at(spec, 'tones[0].col')).toMatch(/^column 5 is out of range/);
    expect(at({ type: 'table', rows: [] }, 'rows')).toBe('needs at least 1 item');
  });
});

describe('fromSpec', () => {
  it.each(DIAGRAM_TYPES)('draws a %s', (type) => {
    const scene = fromSpec(valid[type]);
    expect(scene.nodes.length).toBeGreaterThan(0);
    // ids are prefixed with the type (or opts.id), so two diagrams can share a view
    expect(scene.nodes.every((n) => n.id.startsWith(`${type}`))).toBe(true);
    expect(new Set(scene.nodes.map((n) => n.id)).size).toBe(scene.nodes.length);
  });
  it('throws on an invalid spec, listing every problem', () => {
    expect(() => fromSpec({ type: 'graph', nodes: [{ id: 'a' }], edges: [{ from: 'a', to: 'b' }] })).toThrow(/edges\[0\]\.to: unknown node "b"/);
  });
  it('a custom id prefix', () => {
    expect(fromSpec(valid.array, { id: 'before' }).nodes[0].id.startsWith('before')).toBe(true);
  });
  it('sequence lifelines move apart to fit the longest message label', () => {
    const short = fromSpec(valid.sequence);
    const long = fromSpec({ ...valid.sequence, fragments: undefined, notes: undefined, messages: [{ from: 'api', to: 'db', label: 'recordFailedAttemptAndNotifySecurityTeam(email)' }] });
    const x = (sc: typeof short, k: string) => (sc.nodes.find((n) => n.id === `sequence:head:${k}:box`) as { x: number }).x;
    expect(x(short, 'db') - x(short, 'api')).toBe(150);
    expect(x(long, 'db') - x(long, 'api')).toBeGreaterThan(47 * 12 * 0.6);
  });
  it('opposite transitions are bowed apart so they do not overlap', () => {
    const s = fromSpec(valid.state);
    const there = s.nodes.find((n) => n.id === 'state:t:1:line'), back = s.nodes.find((n) => n.id === 'state:t:2:line');
    const mid = (n: typeof there) => (n?.kind === 'path' ? n.points[Math.floor(n.points.length / 2)] : [0, 0]);
    expect(Math.hypot(mid(there)[0] - mid(back)[0], mid(there)[1] - mid(back)[1])).toBeGreaterThan(10);
  });
});

describe('describeSpec', () => {
  it('says what each type shows', () => {
    expect(describeSpec(valid.sequence)).toBe(
      'Sequence diagram "Login", 3 participants (User, API and DB), 5 messages: 1. User calls API: POST /login, 2. API calls DB: find user, 3. DB replies to API: row, 4. API replies to User: 200 + token and 5. API replies to User: 401.',
    );
    expect(describeSpec(valid.class)).toBe('Class diagram, 2 classes (Shape and Circle), 1 relationship: Circle inherits from Shape.');
    expect(describeSpec(valid.state)).toBe('State diagram, 2 states (idle and running), 4 transitions: start → idle, idle → running on start, running → idle on pause and running → end on finish. Current state: running.');
    expect(describeSpec(valid.architecture)).toBe('Architecture diagram, 3 components: Browser (client), API (service) and Postgres (db). 2 links: Browser → API (HTTPS) and API → Postgres. Zones: VPC: API and Postgres.');
    expect(describeSpec(valid.graph)).toBe('Graph, 3 nodes, 2 directed edges: parse → compile and parse → parse.test. changed: parse; downstream: compile; test: parse.test.');
    expect(describeSpec(valid.git)).toBe('Git history, 4 commits on 2 lines, 1 merge. main at Merge feature. Highlighted: Merge feature.');
    expect(describeSpec(valid.array)).toBe('Array of 5 values: 1, 3, 5, 7 and 9. Highlighted: index 2 (active). Pointers: lo at 0 and hi at 4. Window: indices 0 to 4.');
    expect(describeSpec(valid.table)).toBe('Table, 2 rows × 2 columns. Columns: a and b. 1 highlighted cell.');
  });
  it('cuts long lists', () => {
    const d = describeSpec({ type: 'array', values: Array.from({ length: 30 }, (_, i) => i) });
    expect(d).toMatch(/and 14 more\.$/);
  });
});
