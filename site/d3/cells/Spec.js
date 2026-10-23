// Diagrams as JSON. Edit the JSON (or pick an example): it is checked by a small
// validator that says exactly what is wrong and where (try misspelling a field or
// a participant id), drawn with d3, and described in words (the alt text).
//
//     JSON text --parse--> validate --ok--> draw (d3) + describe (alt text)
//                                   \--errors--> list: path + reason
//
// Three ideas in one cell:
//  1. Validation is DATA: a schema is built from tiny checker functions
//     (str, num, oneOf, list, obj...) that all report errors as { path, message },
//     so "messages[3].to: unknown participant "dbb" (did you mean "db"?)" falls out
//     of one recursive walk. No d3 here; this is the part a model's output must pass.
//  2. Drawing is d3 doing what it does best: one keyed data join per kind of thing
//     (participants, messages, nodes, edges, cells, commits). The key is the id from
//     the JSON, so when you edit the text, things that still exist glide to their
//     new place and new ones fade in, instead of the picture being redrawn.
//  3. Layout: d3 has scales, d3-hierarchy (trees) and d3-force, but no layered DAG
//     layout (that is the separate d3-dag library). `layered` below is a small
//     hand-written one (rank by longest path, order by neighbours' average): used by
//     the architecture, graph and state diagrams. d3.link(curveBumpY) draws git edges.
//
// Supported here: sequence, architecture, graph, git, state, array and code (the
// types the dsviz example shows). Simplified vs dsviz: no sequence activations or
// fragments, no x/y overrides, no class/table types.

// ───────────────────────── 1. the validator ─────────────────────────

const TONES = ['default', 'active', 'accent', 'success', 'danger', 'visited', 'orange', 'muted'];
const KINDS = ['client', 'user', 'lb', 'gateway', 'service', 'cache', 'db', 'queue', 'cdn', 'storage', 'file'];

const typeName = (v) => (v === null ? 'null' : Array.isArray(v) ? 'an array' : typeof v === 'object' ? 'an object' : typeof v === 'string' ? `the string ${JSON.stringify(v.length > 30 ? v.slice(0, 30) + '…' : v)}` : `${typeof v} ${String(v)}`);
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const join = (path, k) => (typeof k === 'number' ? `${path}[${k}]` : path ? `${path}.${k}` : k);
const quoted = (xs, max = 12) => (xs.length > max ? [...xs.slice(0, max).map((x) => `"${x}"`), '…'] : xs.map((x) => `"${x}"`)).join(', ');

// "did you mean": the closest option by edit distance, but only when the slip is small
function distance(a, b) {
  const d = d3.range(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const t = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = t;
    }
  }
  return d[b.length];
}
function closest(word, options) {
  const best = d3.least(options, (o) => distance(word.toLowerCase(), o.toLowerCase()));
  if (best === undefined) return undefined;
  const allowed = word.length <= 2 ? 0 : word.length <= 5 ? 2 : Math.ceil(word.length / 3);
  return distance(word.toLowerCase(), best.toLowerCase()) <= allowed ? best : undefined;
}

// A checker factory: every combinator closes over one list of errors.
// A check is (value, path) => void; it pushes to `errs` instead of throwing, so one
// run reports every problem (up to 50), not just the first.
function checker() {
  const errs = [];
  const fail = (path, message) => { if (errs.length < 50) errs.push({ path, message }); };
  const c = { errs, fail };
  c.str = ({ empty = false } = {}) => (v, p) => {
    if (typeof v !== 'string') return fail(p, `expected a string, got ${typeName(v)}`);
    if (!empty && !v.trim()) fail(p, 'must not be empty');
  };
  c.num = ({ int = false } = {}) => (v, p) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return fail(p, `expected a number, got ${typeName(v)}`);
    if (int && !Number.isInteger(v)) fail(p, `expected a whole number, got ${v}`);
  };
  c.bool = () => (v, p) => { if (typeof v !== 'boolean') fail(p, `expected true or false, got ${typeName(v)}`); };
  c.oneOf = (values) => (v, p) => {
    if (typeof v === 'string' && values.includes(v)) return;
    const hint = typeof v === 'string' ? closest(v, values) : undefined;
    fail(p, `must be one of ${quoted(values)}; got ${typeName(v)}${hint ? ` (did you mean "${hint}"?)` : ''}`);
  };
  c.list = (item, { min = 0 } = {}) => (v, p) => {
    if (!Array.isArray(v)) return fail(p, `expected a list, got ${typeName(v)}`);
    if (v.length < min) fail(p, `needs at least ${min} item${min > 1 ? 's' : ''}`);
    v.forEach((x, i) => item(x, join(p, i)));
  };
  c.pair = (item) => (v, p) => {
    if (!Array.isArray(v) || v.length !== 2) return fail(p, `expected a pair [a, b], got ${typeName(v)}`);
    v.forEach((x, i) => item(x, join(p, i)));
  };
  c.record = (item) => (v, p) => {
    if (!isObj(v)) return fail(p, `expected an object, got ${typeName(v)}`);
    Object.entries(v).forEach(([k, x]) => item(x, join(p, k)));
  };
  c.either = (a, b, what) => (v, p) => {
    const before = errs.length;
    a(v, p);
    if (errs.length === before) return;
    errs.splice(before);
    b(v, p);
    if (errs.length === before) return;
    errs.splice(before);
    fail(p, `expected ${what}, got ${typeName(v)}`);
  };
  // an object: every field must be in `shape` (unknown ones are errors, with a hint), `required` ones must exist
  c.obj = (shape, required = []) => (v, p) => {
    if (!isObj(v)) return fail(p, `expected an object, got ${typeName(v)}`);
    for (const k of required) if (v[k] === undefined) fail(join(p, k), 'is required');
    for (const k of Object.keys(v)) {
      if (!(k in shape)) {
        const hint = closest(k, Object.keys(shape));
        fail(join(p, k), `unknown field${hint ? ` (did you mean "${hint}"?)` : `; allowed: ${quoted(Object.keys(shape))}`}`);
      } else if (v[k] !== undefined) shape[k](v[k], join(p, k));
    }
  };
  // cross-references: the part a JSON schema cannot express
  c.ids = (items, field, path) => {
    const seen = new Map();
    if (Array.isArray(items)) items.forEach((it, i) => {
      const v = isObj(it) ? it[field] : undefined;
      if (typeof v !== 'string') return;
      if (seen.has(v)) fail(join(join(path, i), field), `duplicate ${field} "${v}" (also ${join(path, seen.get(v))})`);
      else seen.set(v, i);
    });
    return seen;
  };
  c.ref = (v, p, known, what) => {
    if (typeof v !== 'string' || known.has(v)) return;
    const hint = closest(v, [...known.keys()]);
    fail(p, `unknown ${what} "${v}"${hint ? ` (did you mean "${hint}"?)` : known.size ? `; the ${what}s are ${quoted([...known.keys()])}` : ''}`);
  };
  c.index = (v, p, n, what, inclusiveEnd = false) => {
    if (typeof v !== 'number' || !Number.isInteger(v)) return;
    const max = inclusiveEnd ? n : n - 1;
    if (v < 0 || v > max) fail(p, `${what} ${v} is out of range; there ${n === 1 ? 'is' : 'are'} ${n} (valid: 0..${max})`);
  };
  return c;
}

const each = (v, f) => Array.isArray(v) && v.forEach((x, i) => isObj(x) && f(x, i));

// one function per diagram type: its schema, then its cross-reference checks
const validators = {
  sequence(c, s) {
    const tone = c.oneOf(TONES);
    c.obj({
      type: () => {}, title: c.str(), numbered: c.bool(),
      participants: c.list(c.obj({ id: c.str(), label: c.str(), kind: c.oneOf(['object', 'actor']) }, ['id']), { min: 1 }),
      messages: c.list(c.obj({ from: c.str(), to: c.str(), label: c.str({ empty: true }), kind: c.oneOf(['call', 'return', 'async']), tone }, ['from', 'to', 'label'])),
      notes: c.list(c.obj({ over: c.either(c.str(), c.pair(c.str()), 'a participant id or a pair of them'), text: c.str(), at: c.num({ int: true }), tone }, ['over', 'text', 'at'])),
    }, ['participants', 'messages'])(s, '');
    const ids = c.ids(s.participants, 'id', 'participants');
    const n = Array.isArray(s.messages) ? s.messages.length : 0;
    each(s.messages, (m, i) => { c.ref(m.from, `messages[${i}].from`, ids, 'participant'); c.ref(m.to, `messages[${i}].to`, ids, 'participant'); });
    each(s.notes, (nt, i) => {
      if (typeof nt.over === 'string') c.ref(nt.over, `notes[${i}].over`, ids, 'participant');
      else if (Array.isArray(nt.over)) nt.over.forEach((o, k) => c.ref(o, `notes[${i}].over[${k}]`, ids, 'participant'));
      c.index(nt.at, `notes[${i}].at`, n, 'message', true);
    });
  },
  architecture(c, s) {
    const tone = c.oneOf(TONES);
    c.obj({
      type: () => {}, title: c.str(), direction: c.oneOf(['down', 'right']),
      components: c.list(c.obj({ id: c.str(), kind: c.oneOf(KINDS), label: c.str(), sub: c.str(), tone }, ['id', 'kind']), { min: 1 }),
      links: c.list(c.obj({ from: c.str(), to: c.str(), label: c.str(), dashed: c.bool(), both: c.bool(), tone }, ['from', 'to'])),
      zones: c.list(c.obj({ id: c.str(), label: c.str(), around: c.list(c.str(), { min: 1 }), tone }, ['id', 'label', 'around'])),
    }, ['components'])(s, '');
    const ids = c.ids(s.components, 'id', 'components');
    c.ids(s.zones, 'id', 'zones');
    each(s.links, (l, i) => { c.ref(l.from, `links[${i}].from`, ids, 'component'); c.ref(l.to, `links[${i}].to`, ids, 'component'); });
    each(s.zones, (z, i) => Array.isArray(z.around) && z.around.forEach((k, j) => c.ref(k, `zones[${i}].around[${j}]`, ids, 'component')));
  },
  graph(c, s) {
    const tone = c.oneOf(TONES);
    c.obj({
      type: () => {}, title: c.str(), directed: c.bool(), direction: c.oneOf(['down', 'right']),
      nodes: c.list(c.obj({ id: c.str(), label: c.str({ empty: true }), kind: c.str(), tone }, ['id']), { min: 1 }),
      edges: c.list(c.obj({ from: c.str(), to: c.str(), label: c.str(), tone }, ['from', 'to'])),
    }, ['nodes'])(s, '');
    const ids = c.ids(s.nodes, 'id', 'nodes');
    each(s.edges, (e, i) => { c.ref(e.from, `edges[${i}].from`, ids, 'node'); c.ref(e.to, `edges[${i}].to`, ids, 'node'); });
    each(s.nodes, (n, i) => typeof n.kind === 'string' && !/^[a-z][a-z0-9-]*$/.test(n.kind) && c.fail(`nodes[${i}].kind`, `must be a lowercase word (letters, digits, dashes), got "${n.kind}"`));
  },
  git(c, s) {
    const tone = c.oneOf(TONES);
    c.obj({
      type: () => {}, title: c.str(), highlight: c.list(c.str()),
      commits: c.list(c.obj({ hash: c.str(), parents: c.list(c.str()), label: c.str(), tone }, ['hash', 'parents']), { min: 1 }),
      refs: c.list(c.obj({ name: c.str(), hash: c.str(), kind: c.oneOf(['branch', 'remote', 'tag', 'head']) }, ['name', 'hash', 'kind'])),
    }, ['commits'])(s, '');
    const hashes = c.ids(s.commits, 'hash', 'commits');
    c.ids(s.refs, 'name', 'refs');
    // newest first: a listed parent must come AFTER its child (parents outside the list are fine: history is cut off)
    each(s.commits, (cm, i) => Array.isArray(cm.parents) && cm.parents.forEach((p, k) => {
      if (typeof p === 'string' && hashes.has(p) && hashes.get(p) <= i) c.fail(`commits[${i}].parents[${k}]`, `"${p}" is listed at commits[${hashes.get(p)}], not after this commit; list commits newest first (children before parents)`);
    }));
    each(s.refs, (r, i) => c.ref(r.hash, `refs[${i}].hash`, hashes, 'commit'));
    if (Array.isArray(s.highlight)) s.highlight.forEach((h, i) => c.ref(h, `highlight[${i}]`, hashes, 'commit'));
  },
  state(c, s) {
    const tone = c.oneOf(TONES);
    c.obj({
      type: () => {}, title: c.str(), current: c.str(), direction: c.oneOf(['down', 'right']),
      states: c.list(c.obj({ id: c.str(), label: c.str(), kind: c.oneOf(['state', 'initial', 'final', 'choice']), tone }, ['id']), { min: 1 }),
      transitions: c.list(c.obj({ from: c.str(), to: c.str(), label: c.str() }, ['from', 'to'])),
    }, ['states', 'transitions'])(s, '');
    const ids = c.ids(s.states, 'id', 'states');
    each(s.transitions, (t, i) => { c.ref(t.from, `transitions[${i}].from`, ids, 'state'); c.ref(t.to, `transitions[${i}].to`, ids, 'state'); });
    if (s.current !== undefined) c.ref(s.current, 'current', ids, 'state');
  },
  array(c, s) {
    const value = (v, p) => { if (v !== null && typeof v !== 'string' && typeof v !== 'number') c.fail(p, `expected a string, a number or null, got ${typeName(v)}`); };
    c.obj({
      type: () => {}, title: c.str(), values: c.list(value, { min: 1 }), tones: c.record(c.oneOf(TONES)),
      pointers: c.list(c.obj({ label: c.str(), at: c.num({ int: true }), side: c.oneOf(['top', 'bottom']) }, ['label', 'at'])),
      window: c.pair(c.num({ int: true })),
    }, ['values'])(s, '');
    const n = Array.isArray(s.values) ? s.values.length : 0;
    if (isObj(s.tones)) for (const k of Object.keys(s.tones)) {
      if (!/^\d+$/.test(k)) c.fail(`tones.${k}`, `keys are indices like "2", got "${k}"`);
      else c.index(Number(k), `tones.${k}`, n, 'index');
    }
    each(s.pointers, (p, i) => c.index(p.at, `pointers[${i}].at`, n, 'index'));
    if (Array.isArray(s.window)) {
      s.window.forEach((v, i) => c.index(v, `window[${i}]`, n, 'index'));
      if (typeof s.window[0] === 'number' && typeof s.window[1] === 'number' && s.window[1] < s.window[0]) c.fail('window', `must be [lo, hi] with lo ≤ hi, got [${s.window[0]}, ${s.window[1]}]`);
    }
  },
  code(c, s) {
    c.obj({
      type: () => {}, title: c.str(), numbers: c.bool(), start: c.num({ int: true }), language: c.str(),
      code: (v, p) => (typeof v === 'string' ? undefined : c.list(c.str({ empty: true }))(v, p)),
      highlight: c.list(c.pair(c.num({ int: true }))),
    }, ['code'])(s, '');
    const lines = codeLines(s).length, start = typeof s.start === 'number' ? s.start : 1;
    if (Array.isArray(s.highlight)) s.highlight.forEach((r, i) => {
      if (!Array.isArray(r) || typeof r[0] !== 'number' || typeof r[1] !== 'number') return;
      if (r[1] < r[0]) c.fail(`highlight[${i}]`, `must be [from, to] with from ≤ to, got [${r[0]}, ${r[1]}]`);
      r.forEach((v, k) => { if (v < start || v > start + lines - 1) c.fail(`highlight[${i}][${k}]`, `line ${v} is outside the code (lines ${start}..${start + lines - 1})`); });
    });
  },
};
const codeLines = (s) => (typeof s.code === 'string' ? s.code.replace(/\n$/, '').split('\n') : Array.isArray(s.code) ? s.code : []);

function validate(x) {
  const c = checker();
  if (!isObj(x)) { c.fail('', `expected a diagram spec object, got ${typeName(x)}`); return { ok: false, errors: c.errs }; }
  const types = Object.keys(validators);
  if (typeof x.type !== 'string' || !types.includes(x.type)) {
    const hint = typeof x.type === 'string' ? closest(x.type, types) : undefined;
    c.fail('type', x.type === undefined ? `is required: one of ${quoted(types)}` : `must be one of ${quoted(types)}; got ${typeName(x.type)}${hint ? ` (did you mean "${hint}"?)` : ''}`);
    return { ok: false, errors: c.errs };
  }
  validators[x.type](c, x);
  return c.errs.length ? { ok: false, errors: c.errs } : { ok: true, errors: [], spec: x };
}

// ───────────────────────── 2. alt text ─────────────────────────

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
function listing(items, max = 8) {
  if (items.length <= max) return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? '');
  return `${items.slice(0, max).join(', ')} and ${items.length - max} more`;
}
const named = (s, kind) => (s.title ? `${kind} "${s.title}"` : kind);

function describe(s) {
  switch (s.type) {
    case 'sequence': {
      const name = new Map(s.participants.map((p) => [p.id, p.label ?? p.id]));
      const steps = s.messages.map((m, i) => {
        const verb = m.kind === 'return' ? 'replies to' : m.kind === 'async' ? 'notifies' : 'calls';
        return `${i + 1}. ${name.get(m.from)} ${m.from === m.to ? 'calls itself' : `${verb} ${name.get(m.to)}`}: ${m.label}`;
      });
      return `${named(s, 'Sequence diagram')}, ${plural(s.participants.length, 'participant')} (${listing([...name.values()])}), ${plural(s.messages.length, 'message')}${steps.length ? `: ${listing(steps, 10)}` : ''}.`;
    }
    case 'architecture': {
      const name = new Map(s.components.map((c) => [c.id, c.label ?? c.id]));
      const comps = s.components.map((c) => `${c.label ?? c.id} (${c.kind})`);
      const links = (s.links ?? []).map((l) => `${name.get(l.from)} ${l.both ? '↔' : '→'} ${name.get(l.to)}${l.label ? ` (${l.label})` : ''}`);
      const zones = (s.zones ?? []).map((z) => `${z.label}: ${listing(z.around.map((k) => name.get(k) ?? k))}`);
      return `${named(s, 'Architecture diagram')}, ${plural(comps.length, 'component')}: ${listing(comps)}${links.length ? `. ${plural(links.length, 'link')}: ${listing(links)}` : ''}${zones.length ? `. Zones: ${zones.join('; ')}` : ''}.`;
    }
    case 'graph': {
      const name = new Map(s.nodes.map((n) => [n.id, n.label || n.id]));
      const edges = (s.edges ?? []).map((e) => `${name.get(e.from)} ${s.directed ? '→' : '–'} ${name.get(e.to)}${e.label ? ` (${e.label})` : ''}`);
      // d3.group: nodes bucketed by their `kind`
      const kinds = [...d3.group(s.nodes.filter((n) => n.kind), (n) => n.kind)].map(([k, ns]) => `${k}: ${listing(ns.map((n) => name.get(n.id)))}`);
      return `${named(s, 'Graph')}, ${plural(s.nodes.length, 'node')}, ${plural(edges.length, s.directed ? 'directed edge' : 'edge')}${edges.length ? `: ${listing(edges, 12)}` : ''}${kinds.length ? `. ${kinds.join('; ')}` : ''}.`;
    }
    case 'git': {
      const { lanes } = gitLanes(s.commits);
      const merges = s.commits.filter((c) => c.parents.length > 1).length;
      const refs = (s.refs ?? []).map((r) => `${r.name} at ${s.commits.find((c) => c.hash === r.hash)?.label ?? r.hash}`);
      const hl = s.highlight?.length ? `. Highlighted: ${listing(s.highlight.map((h) => s.commits.find((c) => c.hash === h)?.label ?? h))}` : '';
      return `${named(s, 'Git history')}, ${plural(s.commits.length, 'commit')} on ${plural(lanes, 'line')}${merges ? `, ${plural(merges, 'merge')}` : ''}${refs.length ? `. ${listing(refs)}` : ''}${hl}.`;
    }
    case 'state': {
      const name = new Map(s.states.map((x) => [x.id, x.kind === 'initial' ? 'start' : x.kind === 'final' ? 'end' : (x.label ?? x.id)]));
      const tr = s.transitions.map((x) => `${name.get(x.from)} → ${name.get(x.to)}${x.label ? ` on ${x.label}` : ''}`);
      const real = s.states.filter((x) => !x.kind || x.kind === 'state').map((x) => x.label ?? x.id);
      return `${named(s, 'State diagram')}, ${plural(real.length, 'state')} (${listing(real)}), ${plural(tr.length, 'transition')}${tr.length ? `: ${listing(tr)}` : ''}${s.current ? `. Current state: ${name.get(s.current)}` : ''}.`;
    }
    case 'array': {
      const vals = s.values.map((v) => (v === null ? 'empty' : String(v)));
      const tones = Object.entries(s.tones ?? {}).map(([i, t]) => `index ${i} (${t})`);
      const ptrs = (s.pointers ?? []).map((p) => `${p.label} at ${p.at}`);
      return `${named(s, 'Array')} of ${plural(vals.length, 'value')}: ${listing(vals, 16)}${tones.length ? `. Highlighted: ${listing(tones)}` : ''}${ptrs.length ? `. Pointers: ${listing(ptrs)}` : ''}${s.window ? `. Window: indices ${s.window[0]} to ${s.window[1]}` : ''}.`;
    }
    case 'code': {
      const hl = (s.highlight ?? []).map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`));
      return `${named(s, s.language ? `${s.language} code` : 'Code')}, ${plural(codeLines(s).length, 'line')}${hl.length ? `, highlighted line${hl.length > 1 || hl[0].includes('–') ? 's' : ''} ${listing(hl)}` : ''}.`;
    }
  }
}

// ───────────────────────── 3. drawing ─────────────────────────

const examples = {
  sequence: {
    type: 'sequence',
    participants: [{ id: 'user', label: 'User', kind: 'actor' }, { id: 'web', label: 'Browser' }, { id: 'api', label: 'API' }],
    messages: [
      { from: 'user', to: 'web', label: 'sign in' },
      { from: 'web', to: 'api', label: 'POST /session' },
      { from: 'api', to: 'web', label: 'Set-Cookie', kind: 'return', tone: 'success' },
      { from: 'web', to: 'user', label: 'dashboard', kind: 'return' },
    ],
    notes: [{ over: 'api', text: 'checks the password hash', at: 2 }],
  },
  architecture: {
    type: 'architecture',
    components: [
      { id: 'web', kind: 'client', label: 'Browser' }, { id: 'cdn', kind: 'cdn', label: 'CDN' },
      { id: 'api', kind: 'service', label: 'API' }, { id: 'cache', kind: 'cache', label: 'Redis' }, { id: 'db', kind: 'db', label: 'Postgres' },
    ],
    links: [{ from: 'web', to: 'cdn' }, { from: 'cdn', to: 'api' }, { from: 'api', to: 'cache' }, { from: 'api', to: 'db' }],
    zones: [{ id: 'cloud', label: 'private network', around: ['api', 'cache', 'db'] }],
  },
  graph: {
    type: 'graph',
    title: 'Blast radius of parseConfig',
    nodes: [
      { id: 'parseConfig', kind: 'changed' }, { id: 'loadSettings', kind: 'downstream' }, { id: 'startServer', kind: 'downstream' },
      { id: 'readFile', kind: 'upstream' }, { id: 'config.test', kind: 'test' },
    ],
    edges: [{ from: 'readFile', to: 'parseConfig' }, { from: 'parseConfig', to: 'loadSettings' }, { from: 'loadSettings', to: 'startServer' }, { from: 'parseConfig', to: 'config.test' }],
    directed: true,
  },
  git: {
    type: 'git',
    commits: [
      { hash: 'e5', parents: ['d4'], label: 'Add retries' }, { hash: 'd4', parents: ['b2', 'c3'], label: "Merge 'login'" },
      { hash: 'c3', parents: ['b2'], label: 'Login form' }, { hash: 'b2', parents: ['a1'], label: 'Router' }, { hash: 'a1', parents: [], label: 'Init' },
    ],
    refs: [{ name: 'main', hash: 'e5', kind: 'branch' }, { name: 'v1.0', hash: 'd4', kind: 'tag' }],
  },
  state: {
    type: 'state',
    states: [{ id: 'start', kind: 'initial' }, { id: 'draft' }, { id: 'review' }, { id: 'merged' }, { id: 'end', kind: 'final' }],
    transitions: [{ from: 'start', to: 'draft' }, { from: 'draft', to: 'review', label: 'open PR' }, { from: 'review', to: 'draft', label: 'changes' }, { from: 'review', to: 'merged', label: 'approve' }, { from: 'merged', to: 'end' }],
    current: 'review',
  },
  array: { type: 'array', values: [3, 8, 12, 17, 21, 30], tones: { 3: 'active' }, pointers: [{ label: 'lo', at: 2 }, { label: 'hi', at: 5 }], window: [2, 5] },
  code: { type: 'code', code: 'for (const x of xs) {\n  if (x > best) best = x;\n}\nreturn best;', highlight: [[2, 2]], language: 'js' },
};

const fig = kit.figure(520, 200);
const { svg } = fig;
const mk = kit.markers(svg);
const layer = svg.append('g');
let animate = false; // false for the first draw of a diagram type, true for edits within it
const go = (sel) => (animate ? kit.tr(sel, 350) : sel.interrupt());

// text width without measuring (the DOM is not measurable everywhere this runs)
const tw = (s, size = 13, k = 0.58) => String(s).length * size * k;
const toneClass = (t) => (t && t !== 'default' ? `tone-${t}` : '');
const sub = (name) => layer.selectAll(`g.${name}`).data([0]).join('g').attr('class', name); // one <g> per layer, created once, in call order
const at = (x, y) => `translate(${x},${y})`;

// The keyed join every renderer uses. `cls` is both the element's selector and its base class;
// the key is the id from the JSON. New elements start invisible and fade in; gone ones fade out.
function keyed(parent, tag, cls, data, key, init) {
  return parent.selectAll(`${tag}.${cls}`).data(data, key).join(
    (enter) => enter.append(tag).attr('class', cls).style('opacity', animate ? 0 : 1).call(init ?? (() => {})),
    (update) => update,
    (exit) => (animate ? kit.tr(exit, 200).style('opacity', 0).remove() : exit.remove()),
  ).call((s) => go(s).style('opacity', 1));
}

// ── edges between boxes (used by architecture, graph, state) ──
// where the straight line from the centre of box `n` toward point `p` leaves the box
function edgePoint(n, p) {
  const dx = p[0] - n.x, dy = p[1] - n.y;
  if (!dx && !dy) return [n.x, n.y];
  const k = n.round ? (n.w / 2) / Math.hypot(dx, dy) : 1 / Math.max(Math.abs(dx) / (n.w / 2), Math.abs(dy) / (n.h / 2));
  return [n.x + dx * k, n.y + dy * k];
}
// a straight or bowed link from a to b; `bend` pushes the middle sideways (opposite pairs, so they don't overlap)
function link(a, b, bend = 0, elbow = null) {
  if (elbow === 'down' && b.y - b.h / 2 > a.y + a.h / 2 + 4) {
    const my = (a.y + a.h / 2 + b.y - b.h / 2) / 2;
    return { d: `M${a.x},${a.y + a.h / 2}V${my}H${b.x}V${b.y - b.h / 2}`, label: [(a.x + b.x) / 2, my], n: [1, 0] };
  }
  if (elbow === 'right' && b.x - b.w / 2 > a.x + a.w / 2 + 4) {
    const mx = (a.x + a.w / 2 + b.x - b.w / 2) / 2;
    return { d: `M${a.x + a.w / 2},${a.y}H${mx}V${b.y}H${b.x - b.w / 2}`, label: [mx, (a.y + b.y) / 2], n: [0, -1] };
  }
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const n = [(b.y - a.y) / len, -(b.x - a.x) / len]; // unit normal, to the left of a -> b
  if (!bend) {
    const p = edgePoint(a, [b.x, b.y]), q = edgePoint(b, [a.x, a.y]);
    return { d: `M${p}L${q}`, label: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], n };
  }
  const c = [(a.x + b.x) / 2 + n[0] * bend * 1.8, (a.y + b.y) / 2 + n[1] * bend * 1.8];
  const p = edgePoint(a, c), q = edgePoint(b, c);
  return { d: `M${p}Q${c} ${q}`, label: [0.25 * p[0] + 0.5 * c[0] + 0.25 * q[0], 0.25 * p[1] + 0.5 * c[1] + 0.25 * q[1]], n };
}

// ── layered layout: ranks by longest path, order by neighbours' average ──
// Returns Map id -> {x, y} (box centres) and the overall size.
function layered(ids, edges, size, dir = 'down', rankGap = 64, nodeGap = 30) {
  // 1. keep only edges that don't close a cycle (DFS back edges are dropped), so ranks exist
  const state = new Map(), fwd = [];
  const visit = (u) => {
    state.set(u, 1);
    for (const e of edges.filter((e) => e.from === u)) {
      if (state.get(e.to) === 1) continue;
      fwd.push(e);
      if (!state.get(e.to)) visit(e.to);
    }
    state.set(u, 2);
  };
  ids.forEach((id) => !state.get(id) && visit(id));
  // 2. rank = length of the longest path arriving at the node
  const rankOf = new Map();
  const rank = (id) => {
    if (!rankOf.has(id)) rankOf.set(id, d3.max(fwd.filter((e) => e.to === id), (e) => rank(e.from) + 1) ?? 0);
    return rankOf.get(id);
  };
  const layers = d3.range(d3.max(ids, rank) + 1).map((r) => ids.filter((id) => rankOf.get(id) === r));
  // 3. order inside each layer: sort by the mean position of neighbours in the layer before/after, twice
  const index = new Map();
  const reindex = () => layers.forEach((l) => l.forEach((id, i) => index.set(id, i)));
  reindex();
  const sweep = (r, neighbours) => {
    const bary = (id) => d3.mean(neighbours(id), (m) => index.get(m)) ?? index.get(id);
    layers[r].sort((a, b) => bary(a) - bary(b));
    reindex();
  };
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 1; r < layers.length; r++) sweep(r, (id) => fwd.filter((e) => e.to === id).map((e) => e.from));
    for (let r = layers.length - 2; r >= 0; r--) sweep(r, (id) => fwd.filter((e) => e.from === id).map((e) => e.to));
  }
  // 4. coordinates: `along` is the flow axis, `across` the other one
  const alongSize = (id) => (dir === 'down' ? size(id).h : size(id).w);
  const acrossSize = (id) => (dir === 'down' ? size(id).w : size(id).h);
  const across = new Map();
  layers.forEach((l) => {
    let c = 0;
    l.forEach((id) => { across.set(id, c + acrossSize(id) / 2); c += acrossSize(id) + nodeGap; });
  });
  // pull every node toward the mean of its neighbours (so a chain stays in a straight line), then
  // push apart whatever now overlaps. A forward pass pushes nodes right, a backward pass left;
  // the average of the two keeps the gaps and doesn't drift to one side.
  const settle = (layer, neighbours) => {
    const want = layer.map((id) => d3.mean(neighbours(id), (m) => across.get(m)) ?? across.get(id));
    const gapAt = (i) => (acrossSize(layer[i - 1]) + acrossSize(layer[i])) / 2 + nodeGap;
    const fw = [], bw = [];
    want.forEach((w, i) => { fw[i] = i ? Math.max(w, fw[i - 1] + gapAt(i)) : w; });
    for (let i = want.length - 1; i >= 0; i--) bw[i] = i < want.length - 1 ? Math.min(want[i], bw[i + 1] - gapAt(i + 1)) : want[i];
    layer.forEach((id, i) => across.set(id, (fw[i] + bw[i]) / 2));
  };
  const parents = (id) => fwd.filter((e) => e.to === id).map((e) => e.from);
  const children = (id) => fwd.filter((e) => e.from === id).map((e) => e.to);
  for (let pass = 0; pass < 3; pass++) {
    for (let r = 1; r < layers.length; r++) settle(layers[r], parents);
    for (let r = layers.length - 2; r >= 0; r--) settle(layers[r], children);
  }
  const lo = d3.min(ids, (id) => across.get(id) - acrossSize(id) / 2);
  const span = d3.max(ids, (id) => across.get(id) + acrossSize(id) / 2) - lo;
  const pos = new Map();
  let along = 0;
  layers.forEach((l) => {
    const thick = d3.max(l, alongSize);
    l.forEach((id) => {
      const a = along + thick / 2, c = across.get(id) - lo;
      pos.set(id, dir === 'down' ? { x: c, y: a } : { x: a, y: c });
    });
    along += thick + rankGap;
  });
  const total = along - rankGap;
  return { pos, w: dir === 'down' ? span : total, h: dir === 'down' ? total : span };
}

// a pill/box label: text centred in its group
const centred = (sel, size = 13) => sel.attr('text-anchor', 'middle').attr('dy', '0.35em').style('font-size', `${size}px`).style('font-weight', 600);

// ── sequence ──
function drawSequence(s) {
  const label = (m, i) => `${s.numbered ? `${i + 1}. ` : ''}${m.label}`;
  // a spec's author can't measure text, so lifelines move apart until the longest label fits
  const gap = Math.max(150, Math.ceil((d3.max(s.messages, (m, i) => tw(label(m, i), 12, 0.6)) ?? 0) + 40));
  const X = new Map(s.participants.map((p, i) => [p.id, 60 + i * gap]));
  // rows top to bottom: notes sit in the row before message `at`
  const rows = [];
  let y = 90;
  const notesAt = (i) => (s.notes ?? []).forEach((nt, k) => { if (nt.at === i) { rows.push({ id: `note${k}`, kind: 'note', y: y + 8, nt }); y += 42; } });
  s.messages.forEach((m, i) => { notesAt(i); rows.push({ id: `msg${i}`, kind: 'msg', y: y + 20, m, i }); y += 48; });
  notesAt(s.messages.length);
  const H = y + 4, W = 120 + (s.participants.length - 1) * gap;

  keyed(sub('parts'), 'g', 'part', s.participants, (p) => p.id, (g) => {
    g.attr('transform', (p) => at(X.get(p.id), 0));
    g.append('path').attr('class', 'line muted dashed life');
    g.append('rect').attr('class', 'solid box').attr('x', -52).attr('y', 20).attr('width', 104).attr('height', 34).attr('rx', 8);
    // an actor is a stick figure
    g.append('path').attr('class', 'line figure').attr('d', 'M0,14V30M-10,20H10M0,30L-8,42M0,30L8,42').attr('stroke-width', 1.5);
    g.append('circle').attr('class', 'line figure').attr('cy', 8).attr('r', 6).style('fill', 'var(--surface)');
    centred(g.append('text').attr('class', 'name'));
  }).each(function (p) {
    const g = d3.select(this), actor = p.kind === 'actor';
    g.select('.box').style('display', actor ? 'none' : null);
    g.selectAll('.figure').style('display', actor ? null : 'none');
    g.select('.name').attr('y', actor ? 57 : 37).text(p.label ?? p.id);
    g.select('.life').attr('d', `M0,${actor ? 66 : 54}V${H}`);
  }).call((g) => go(g).attr('transform', (p) => at(X.get(p.id), 0)));

  keyed(sub('rows'), 'g', 'row', rows, (r) => r.id, (g) => {
    g.attr('transform', (r) => at(0, r.y));
    g.append('path').attr('class', 'mline');
    g.append('text').attr('class', 'mono mlabel').attr('text-anchor', 'middle').style('font-size', '12px');
    g.append('rect').attr('class', 'band nrect').attr('rx', 3).style('stroke', 'var(--active-outline)').style('stroke-width', '1.5px');
    g.append('text').attr('class', 'nlabel').attr('text-anchor', 'middle').attr('dy', '0.35em').style('font-size', '12px');
  }).each(function (r) {
    const g = d3.select(this), isMsg = r.kind === 'msg';
    g.selectAll('.mline, .mlabel').style('display', isMsg ? null : 'none');
    g.selectAll('.nrect, .nlabel').style('display', isMsg ? 'none' : null);
    if (isMsg) {
      const { m, i } = r, x1 = X.get(m.from), x2 = X.get(m.to), self = m.from === m.to;
      g.select('.mline')
        .attr('class', `mline line ${toneClass(m.tone)} ${m.kind === 'return' ? 'dashed' : ''}`)
        .attr('marker-end', mk(m.kind === 'call' || !m.kind ? 'arrow' : 'open'))
        .call((p) => go(p).attr('d', self ? `M${x1},-6H${x1 + 36}V12H${x1 + 2}` : `M${x1},0H${x2}`));
      g.select('.mlabel').attr('class', `mono mlabel ${toneClass(m.tone)}`).attr('text-anchor', self ? 'start' : 'middle').text(label(m, i))
        .call((t) => go(t).attr('x', self ? x1 + 44 : (x1 + x2) / 2).attr('y', self ? 4 : -7));
    } else {
      const over = [].concat(r.nt.over).map((id) => X.get(id));
      const w = Math.max(tw(r.nt.text, 12) + 24, 90), cx = (Math.min(...over) + Math.max(...over)) / 2, span = Math.max(w, Math.max(...over) - Math.min(...over));
      g.select('.nrect').attr('x', cx - span / 2).attr('y', -14).attr('width', span).attr('height', 28);
      g.select('.nlabel').attr('x', cx).text(r.nt.text);
    }
  }).call((g) => go(g).attr('transform', (r) => at(0, r.y)));
  return [0, 0, W, H];
}

// ── architecture ──
// component kind -> box size, outline shape and colour. Shapes are paths drawn around (0, 0).
const rr = (w, h, r = 8, dy = 0) => `M${-w / 2 + r},${dy - h / 2}H${w / 2 - r}A${r},${r} 0 0 1 ${w / 2},${dy - h / 2 + r}V${dy + h / 2 - r}A${r},${r} 0 0 1 ${w / 2 - r},${dy + h / 2}H${-w / 2 + r}A${r},${r} 0 0 1 ${-w / 2},${dy + h / 2 - r}V${dy - h / 2 + r}A${r},${r} 0 0 1 ${-w / 2 + r},${dy - h / 2}Z`;
const SHAPES = {
  rect: (w, h) => rr(w, h),
  screen: (w, h) => `${rr(w, h - 12, 6, -6)}M0,${h / 2 - 12}V${h / 2 - 3}M-14,${h / 2 - 3}H14`, // a monitor: rounded screen + stand
  cylinder: (w, h) => `M${-w / 2},${-h / 2 + 9}A${w / 2},9 0 0 1 ${w / 2},${-h / 2 + 9}V${h / 2 - 9}A${w / 2},9 0 0 1 ${-w / 2},${h / 2 - 9}ZM${-w / 2},${-h / 2 + 9}A${w / 2},9 0 0 0 ${w / 2},${-h / 2 + 9}`,
  cloud: () => 'M-40,22A18,18 0 0 1 -44,-12A22,22 0 0 1 -6,-26A24,24 0 0 1 40,-14A18,18 0 0 1 40,22Z',
  person: () => 'M0,-30m-9,0a9,9 0 1 0 18,0a9,9 0 1 0 -18,0M-20,18C-20,-6 20,-6 20,18Z',
  file: (w, h) => `M${-w / 2},${-h / 2}H${w / 2 - 12}L${w / 2},${-h / 2 + 12}V${h / 2}H${-w / 2}Z`,
};
const COMPONENT = {
  client: { w: 120, h: 56, shape: 'screen' }, user: { w: 50, h: 76, shape: 'person', labelY: 38 },
  lb: { w: 120, h: 48, shape: 'rect', tone: 'accent' }, gateway: { w: 120, h: 48, shape: 'rect', tone: 'accent' },
  service: { w: 120, h: 48, shape: 'rect' }, cache: { w: 100, h: 48, shape: 'rect', tone: 'orange' },
  db: { w: 100, h: 64, shape: 'cylinder', tone: 'success' }, queue: { w: 120, h: 44, shape: 'rect', tone: 'visited' },
  cdn: { w: 100, h: 64, shape: 'cloud', tone: 'active' }, storage: { w: 100, h: 60, shape: 'cylinder', tone: 'active' },
  file: { w: 84, h: 56, shape: 'file', tone: 'muted' },
};

function drawArchitecture(s) {
  const spec = (c) => COMPONENT[c.kind];
  const byId = new Map(s.components.map((c) => [c.id, c]));
  const dir = s.direction ?? 'right';
  const L = layered(s.components.map((c) => c.id), (s.links ?? []), (id) => spec(byId.get(id)), dir, 72, 44);
  const box = (id) => ({ ...L.pos.get(id), w: spec(byId.get(id)).w, h: spec(byId.get(id)).h });

  // zones: a dashed box round its members, the bigger (outer) ones drawn first
  const pad = 18;
  const zones = (s.zones ?? []).map((z) => {
    const bs = z.around.map(box);
    return { ...z, x0: d3.min(bs, (b) => b.x - b.w / 2) - pad, y0: d3.min(bs, (b) => b.y - b.h / 2) - pad - 12, x1: d3.max(bs, (b) => b.x + b.w / 2) + pad, y1: d3.max(bs, (b) => b.y + b.h / 2) + pad };
  }).sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
  keyed(sub('zones'), 'g', 'zone', zones, (z) => z.id, (g) => {
    g.append('rect').attr('class', 'panel').attr('rx', 10).style('fill-opacity', 0.55).style('stroke', 'var(--faint)').style('stroke-dasharray', '5 4');
    g.append('text').attr('class', 'muted').style('font-size', '11px');
  }).each(function (z) {
    const g = d3.select(this);
    g.select('text').text(z.label).attr('x', z.x0 + 12).attr('y', z.y0 + 16);
    go(g.select('rect')).attr('x', z.x0).attr('y', z.y0).attr('width', z.x1 - z.x0).attr('height', z.y1 - z.y0);
  });

  const links = (s.links ?? []).map((l, i) => ({ ...l, id: `${l.from}>${l.to}#${i}` }));
  keyed(sub('links'), 'g', 'edge', links, (l) => l.id, (g) => {
    g.append('path').attr('class', 'line');
    g.append('text').attr('class', 'halo').attr('text-anchor', 'middle').attr('dy', '0.35em').style('font-size', '11px');
  }).each(function (l) {
    const g = d3.select(this), geo = link(box(l.from), box(l.to));
    g.select('path').attr('class', `line ${toneClass(l.tone)} ${l.dashed ? 'dashed' : ''}`)
      .attr('marker-end', mk('arrow')).attr('marker-start', l.both ? mk('arrow') : null).call((p) => go(p).attr('d', geo.d));
    g.select('text').text(l.label ?? '').call((t) => go(t).attr('x', geo.label[0]).attr('y', geo.label[1] - 8));
  });

  keyed(sub('nodes'), 'g', 'comp', s.components, (c) => c.id, (g) => {
    g.attr('transform', (c) => at(L.pos.get(c.id).x, L.pos.get(c.id).y));
    g.append('path').attr('class', 'solid');
    centred(g.append('text').attr('class', 'lbl'), 12.5);
    g.append('text').attr('class', 'muted sublbl').attr('text-anchor', 'middle').style('font-size', '10.5px');
  }).each(function (c) {
    const k = spec(c), g = d3.select(this);
    const t = c.tone && c.tone !== 'default' ? c.tone : k.tone;
    // sys colours are the pale version of the tone: mix the fill with the surface colour
    g.select('path').attr('class', `solid ${toneClass(t)}`).attr('d', SHAPES[k.shape](k.w, k.h))
      .style('fill', t && t !== 'muted' ? 'color-mix(in srgb, var(--cf) 45%, var(--surface))' : null);
    g.select('.lbl').text(c.label ?? c.id).attr('y', (k.labelY ?? 0) + (c.sub ? -7 : 0) + (k.shape === 'cylinder' ? 6 : 0));
    g.select('.sublbl').text(c.sub ?? '').attr('y', (k.labelY ?? 0) + 9);
  }).call((g) => go(g).attr('transform', (c) => at(L.pos.get(c.id).x, L.pos.get(c.id).y)));

  const xs = [0, L.w, ...zones.flatMap((z) => [z.x0, z.x1])], ys = [0, L.h, ...zones.flatMap((z) => [z.y0, z.y1])];
  return [d3.min(xs) - 10, d3.min(ys) - 10, d3.max(xs) - d3.min(xs) + 20, d3.max(ys) - d3.min(ys) + 20];
}

// ── graph ──
const KIND_TONE = { changed: 'active', upstream: 'accent', downstream: 'visited', test: 'success' };
function drawGraph(s) {
  const dir = s.direction ?? 'down';
  const sizes = new Map(s.nodes.map((n) => [n.id, { w: Math.max(64, tw(n.label ?? n.id, 13, 0.6) + 32), h: 34 }]));
  const L = layered(s.nodes.map((n) => n.id), s.edges ?? [], (id) => sizes.get(id), dir, 60, 28);
  const box = (id) => ({ ...L.pos.get(id), ...sizes.get(id) });
  const edges = (s.edges ?? []).map((e, i) => ({ ...e, id: `${e.from}>${e.to}#${i}` }));

  keyed(sub('edges'), 'g', 'edge', edges, (e) => e.id, (g) => {
    g.append('path');
    g.append('text').attr('class', 'halo').attr('text-anchor', 'middle').attr('dy', '0.35em').style('font-size', '11px');
  }).each(function (e) {
    const g = d3.select(this), a = box(e.from), b = box(e.to);
    // an edge that runs against the flow (it closes a cycle) bows out instead of cutting back through the layers
    const back = dir === 'down' ? b.y <= a.y : b.x <= a.x;
    const geo = back ? link(a, b, 40) : link(a, b, 0, dir);
    g.select('path').attr('class', `line ${toneClass(e.tone)}`).attr('marker-end', s.directed ? mk('arrow') : null).call((p) => go(p).attr('d', geo.d));
    g.select('text').text(e.label ?? '').call((t) => go(t).attr('x', geo.label[0] + 8).attr('y', geo.label[1]).attr('text-anchor', 'start'));
  });

  keyed(sub('nodes'), 'g', 'node', s.nodes, (n) => n.id, (g) => {
    g.attr('transform', (n) => at(L.pos.get(n.id).x, L.pos.get(n.id).y));
    g.append('rect').attr('class', 'solid').attr('rx', 8).attr('y', -17).attr('height', 34);
    centred(g.append('text'));
  }).each(function (n) {
    const g = d3.select(this), w = sizes.get(n.id).w;
    // what a node IS (its kind) picks the colour; an explicit tone overrides it
    const t = n.tone && n.tone !== 'default' ? n.tone : KIND_TONE[n.kind];
    g.select('rect').attr('class', `solid ${toneClass(t)}`).attr('x', -w / 2).attr('width', w);
    g.select('text').text(n.label ?? n.id);
  }).call((g) => go(g).attr('transform', (n) => at(L.pos.get(n.id).x, L.pos.get(n.id).y)));
  return [-10, -10, L.w + 20, L.h + 20];
}

// ── state machine ──
function drawState(s) {
  const dir = s.direction ?? 'down';
  const SZ = { initial: { w: 20, h: 20, round: true }, final: { w: 26, h: 26, round: true }, choice: { w: 30, h: 30 } };
  const sizes = new Map(s.states.map((x) => [x.id, SZ[x.kind] ?? { w: Math.max(72, tw(x.label ?? x.id, 13, 0.6) + 36), h: 34 }]));
  const L = layered(s.states.map((x) => x.id), s.transitions, (id) => sizes.get(id), dir, 76, 50);
  const box = (id) => ({ ...L.pos.get(id), ...sizes.get(id) });
  // a pair of opposite transitions would sit on one line: bow both apart
  const pairs = new Set(s.transitions.map((t) => `${t.from}>${t.to}`));
  const trs = s.transitions.map((t, i) => ({ ...t, id: `${t.from}>${t.to}#${i}`, bend: t.from !== t.to && pairs.has(`${t.to}>${t.from}`) ? 18 : 0 }));

  keyed(sub('edges'), 'g', 'edge', trs, (t) => t.id, (g) => {
    g.append('path').attr('class', 'line').attr('marker-end', mk('arrow'));
    g.append('text').attr('class', 'halo').style('font-size', '11.5px').attr('dy', '0.35em');
  }).each(function (t) {
    const g = d3.select(this), geo = link(box(t.from), box(t.to), t.bend);
    g.select('path').call((p) => go(p).attr('d', geo.d));
    // label beside the line, on the side the bow points to
    const sideX = geo.n[0];
    g.select('text').text(t.label ?? '').attr('text-anchor', Math.abs(sideX) < 0.3 ? 'middle' : sideX > 0 ? 'start' : 'end')
      .call((tx) => go(tx).attr('x', geo.label[0] + (Math.abs(sideX) < 0.3 ? 0 : sideX > 0 ? 8 : -8)).attr('y', geo.label[1] + (Math.abs(sideX) < 0.3 ? -10 : 0)));
  });

  keyed(sub('nodes'), 'g', 'node', s.states, (x) => x.id, (g) => {
    g.attr('transform', (x) => at(L.pos.get(x.id).x, L.pos.get(x.id).y));
    g.append('rect').attr('class', 'solid').attr('y', -17).attr('height', 34).attr('rx', 17);
    g.append('circle').attr('class', 'fill-ink inner');
    g.append('circle').attr('class', 'solid outer').style('fill', 'var(--surface)').style('stroke', 'var(--edge)');
    g.append('path').attr('class', 'solid diamond');
    centred(g.append('text'));
  }).each(function (x) {
    const g = d3.select(this), k = x.kind ?? 'state', w = sizes.get(x.id).w;
    const t = x.id === s.current ? 'active' : x.tone && x.tone !== 'default' ? x.tone : null;
    g.select('rect').style('display', k === 'state' ? null : 'none').attr('class', `solid ${toneClass(t)}`).attr('x', -w / 2).attr('width', w);
    g.select('.inner').style('display', k === 'initial' || k === 'final' ? null : 'none').attr('r', k === 'initial' ? 10 : 6);
    g.select('.outer').style('display', k === 'final' ? null : 'none').attr('r', 12).lower().style('fill', 'var(--surface)');
    g.select('.diamond').style('display', k === 'choice' ? null : 'none').attr('d', 'M0,-15L15,0L0,15L-15,0Z').attr('class', `solid diamond ${toneClass(t)}`);
    g.select('text').text(k === 'state' ? (x.label ?? x.id) : '');
  }).call((g) => go(g).attr('transform', (x) => at(L.pos.get(x.id).x, L.pos.get(x.id).y)));
  return [-30, -10, L.w + 60, L.h + 20];
}

// ── git ──
// Lanes by first-parent inheritance: a commit takes the lane that was waiting for it; its first
// parent inherits that lane, any other parent gets a lane of its own. `commits` are newest first.
function gitLanes(commits) {
  const waiting = []; // waiting[lane] = hash expected next in that lane
  const free = () => { const i = waiting.indexOf(null); return i < 0 ? waiting.push(null) - 1 : i; };
  const pos = new Map();
  commits.forEach((c, row) => {
    let lane = waiting.indexOf(c.hash);
    if (lane < 0) lane = free();
    waiting.forEach((h, i) => { if (h === c.hash && i !== lane) waiting[i] = null; }); // branches that end here
    waiting[lane] = c.parents[0] ?? null;
    c.parents.slice(1).forEach((p) => { if (!waiting.includes(p)) waiting[free()] = p; });
    pos.set(c.hash, { lane, row });
  });
  return { pos, lanes: Math.max(1, d3.max([...pos.values()], (p) => p.lane + 1)) };
}
const LANE_COLOURS = ['--accent', '--success', '--visited', '--orange', '--danger'];
function drawGit(s) {
  const { pos, lanes } = gitLanes(s.commits);
  const LX = (lane) => 12 + lane * 22, RY = (row) => 18 + row * 34;
  const textX = LX(lanes - 1) + 26;
  const colour = (lane) => `var(${LANE_COLOURS[lane % LANE_COLOURS.length]})`;
  const edges = s.commits.flatMap((c) => c.parents.map((p, k) => ({ id: `${c.hash}>${p}`, from: pos.get(c.hash), to: pos.get(p) ?? null, first: k === 0 })));
  const curve = d3.link(d3.curveBumpY); // an S-curve from source to target, vertical at both ends

  keyed(sub('edges'), 'path', 'gedge', edges, (e) => e.id).each(function (e) {
    const a = [LX(e.from.lane), RY(e.from.row)];
    // a parent that is not in the list: history is cut off, so a short stub
    const d = e.to ? curve({ source: a, target: [LX(e.to.lane), RY(e.to.row)] }) : `M${a}V${a[1] + 22}`;
    d3.select(this).attr('fill', 'none').attr('stroke-width', 2.5).attr('stroke-linecap', 'round')
      .attr('stroke', colour(Math.max(e.from.lane, e.to?.lane ?? 0))).call((p) => go(p).attr('d', d));
  });

  const hl = new Set(s.highlight ?? []);
  keyed(sub('commits'), 'g', 'commit', s.commits, (c) => c.hash, (g) => {
    g.append('circle').attr('r', 6);
    g.append('g').attr('class', 'refs');
    g.append('text').attr('class', 'msg').style('font-size', '13px');
  }).each(function (c) {
    const g = d3.select(this), p = pos.get(c.hash), merge = c.parents.length > 1;
    const lanec = c.tone && c.tone !== 'default' ? `var(--${c.tone})` : colour(p.lane);
    g.select('circle').attr('fill', merge ? 'var(--surface)' : lanec).attr('stroke', lanec).attr('stroke-width', merge || hl.has(c.hash) ? 2.5 : 0).attr('r', hl.has(c.hash) ? 7.5 : 6);
    // the labels: ref badges first, then the message
    const refs = (s.refs ?? []).filter((r) => r.hash === c.hash);
    const widths = refs.map((r) => tw(r.name, 11, 0.62) + 16);
    const starts = d3.cumsum([0, ...widths.map((w) => w + 6)]);
    g.select('.refs').selectAll('g.badge').data(refs, (r) => r.name).join((enter) => {
      const b = enter.append('g').attr('class', 'badge');
      b.append('rect').attr('rx', 9).attr('height', 18).attr('y', -9);
      b.append('text').attr('class', 'mono').attr('text-anchor', 'middle').attr('dy', '0.35em').style('font-size', '11px');
      return b;
    }).each(function (r, i) {
      const b = d3.select(this), kind = r.kind;
      const fill = { branch: 'var(--accent-fill)', head: 'var(--danger-fill)', remote: 'var(--visited-fill)', tag: 'var(--surface)' }[kind];
      b.attr('transform', at(textX + starts[i], 0));
      b.select('rect').attr('width', widths[i]).style('fill', fill).style('stroke', kind === 'tag' ? 'var(--faint)' : 'var(--edge)').style('stroke-width', '1px');
      b.select('text').attr('x', widths[i] / 2).text(r.name).style('fill', kind === 'tag' ? 'var(--muted)' : null);
    });
    g.select('.msg').text(c.label ?? '').attr('dy', '0.35em').attr('x', textX + (starts.at(-1) ?? 0));
    g.select('circle').attr('cx', LX(p.lane));
  }).call((g) => go(g).attr('transform', (c) => at(0, RY(pos.get(c.hash).row))));
  // width: the widest row = its badges + its message
  const w = textX + 6 + d3.max(s.commits, (c) => tw(c.label ?? '', 13) + d3.sum((s.refs ?? []).filter((r) => r.hash === c.hash), (r) => tw(r.name, 11, 0.62) + 22));
  return [-6, -6, w + 12, RY(s.commits.length - 1) + 40];
}

// ── array ──
function drawArray(s) {
  const CELL = 48, STEP = 54;
  const n = s.values.length;
  const ptrs = (s.pointers ?? []).map((p, i) => ({ ...p, id: `ptr${i}`, side: p.side ?? 'top' }));
  // pointers on the same cell stack in levels so their labels don't collide
  const level = new Map();
  ptrs.forEach((p) => { const key = `${p.side}:${p.at}`; p.level = level.get(key) ?? 0; level.set(key, p.level + 1); });
  const topLevels = d3.max(ptrs.filter((p) => p.side === 'top'), (p) => p.level + 1) ?? 0;
  const y0 = topLevels ? 14 + topLevels * 40 : 12;
  const cx = (i) => i * STEP + CELL / 2;

  const win = s.window ? [s.window] : [];
  keyed(sub('window'), 'rect', 'wband', win, () => 'w', (r) => r.attr('rx', 12).attr('height', CELL + 12).attr('y', y0 - 6).style('fill', 'var(--band)'))
    .call((r) => go(r).attr('x', (w) => w[0] * STEP - 6).attr('width', (w) => (w[1] - w[0] + 1) * STEP - 6 + 12).attr('y', y0 - 6));

  keyed(sub('cells'), 'g', 'cell', s.values.map((v, i) => ({ v, i })), (d) => d.i, (g) => {
    g.attr('transform', (d) => at(d.i * STEP, y0));
    g.append('rect').attr('class', 'solid').attr('width', CELL).attr('height', CELL).attr('rx', 8);
    g.append('text').attr('class', 'value cv').attr('x', CELL / 2).attr('y', CELL / 2).attr('text-anchor', 'middle').attr('dy', '0.35em').style('font-size', '18px').style('font-weight', 700);
    g.append('text').attr('class', 'muted ci').attr('x', CELL / 2).attr('y', CELL + 18).attr('text-anchor', 'middle').style('font-size', '12px');
  }).each(function (d) {
    const g = d3.select(this), t = s.tones?.[d.i];
    g.select('rect').attr('class', `solid ${toneClass(t)}`);
    g.select('.cv').text(d.v ?? '');
    g.select('.ci').text(d.i);
  }).call((g) => go(g).attr('transform', (d) => at(d.i * STEP, y0)));

  keyed(sub('pointers'), 'g', 'ptr', ptrs, (p) => p.id, (g) => {
    g.append('path').attr('class', 'line tone-accent').attr('marker-end', mk('arrow')).style('stroke-width', '1.75px');
    g.append('text').attr('class', 'mono halo tone-accent').attr('text-anchor', 'middle').style('font-size', '13px').style('font-weight', 700);
  }).each(function (p) {
    const g = d3.select(this), top = p.side === 'top';
    const yTip = top ? y0 - 4 - p.level * 40 : y0 + CELL + 30 + p.level * 40; // arrow tip
    const yTail = top ? yTip - 26 : yTip + 26;
    g.select('path').call((l) => go(l).attr('d', `M${cx(p.at)},${yTail}V${yTip}`));
    g.select('text').text(p.label).call((t) => go(t).attr('x', cx(p.at)).attr('y', top ? yTail - 10 : yTail + 12));
  });
  const bottom = d3.max(ptrs.filter((p) => p.side === 'bottom'), (p) => p.level + 1) ?? 0;
  return [-8, 0, n * STEP - 6 + 16, y0 + CELL + 28 + (bottom ? bottom * 40 + 22 : 0)];
}

// ── code ──
function drawCode(s) {
  const lines = codeLines(s), start = s.start ?? 1, numbers = s.numbers ?? true, LH = 24, PAD = 12;
  const gutter = numbers ? 36 : 0;
  const W = gutter + PAD * 2 + (d3.max(lines, (l) => l.length) ?? 1) * 7.9 + 10, H = lines.length * LH + PAD * 2 - 8;
  keyed(sub('panel'), 'rect', 'cpanel', [0], () => 'p', (r) => r.attr('class', 'cpanel panel').attr('rx', 8)).call((r) => go(r).attr('width', W).attr('height', H));
  const marked = (i) => (s.highlight ?? []).some(([a, b]) => start + i >= a && start + i <= b);
  keyed(sub('bands'), 'rect', 'cband', lines.map((l, i) => i).filter(marked), (i) => i, (r) => r.attr('class', 'cband band').attr('height', LH))
    .call((r) => go(r).attr('y', (i) => PAD - 6 + i * LH).attr('width', W));
  keyed(sub('lines'), 'g', 'cline', lines.map((text, i) => ({ text, i })), (d) => d.i, (g) => {
    g.append('text').attr('class', 'mono muted num').attr('text-anchor', 'end').style('font-weight', 400).style('font-size', '13px');
    g.append('text').attr('class', 'mono code').style('font-weight', 400).style('font-size', '13px').style('white-space', 'pre').attr('xml:space', 'preserve');
  }).each(function (d) {
    const g = d3.select(this);
    g.select('.num').style('display', numbers ? null : 'none').attr('x', PAD + gutter - 14).attr('y', PAD + 6 + d.i * LH + 4).text(start + d.i);
    g.select('.code').attr('x', PAD + gutter).attr('y', PAD + 6 + d.i * LH + 4).text(d.text);
  });
  return [0, 0, W, H];
}

const draw = { sequence: drawSequence, architecture: drawArchitecture, graph: drawGraph, state: drawState, git: drawGit, array: drawArray, code: drawCode };

// ───────────────────────── the page: controls, errors, alt text ─────────────────────────
let type = 'sequence', lastType = null;
const box = kit.el('textarea', {
  rows: 12, spellcheck: 'false', 'aria-label': 'Diagram JSON',
  style: 'width:100%;box-sizing:border-box;font:12.5px/1.5 var(--mono);color:var(--fg);background:var(--surface);border:1px solid var(--faint);border-radius:8px;padding:10px 12px;resize:vertical;tab-size:2',
});
const errorsList = kit.el('ul', { style: 'margin:0;padding-left:20px;font-size:13px;color:var(--danger);display:none' });
const altText = kit.el('p', { class: 'status' });
const picker = kit.select({
  label: 'Example', value: type, options: Object.keys(examples),
  onInput: (v) => { type = v; box.value = JSON.stringify(examples[v], null, 2); lastType = null; render(); },
});

function render() {
  let parsed, result;
  try {
    parsed = JSON.parse(box.value);
    result = validate(parsed);
  } catch (e) {
    result = { ok: false, errors: [{ path: '', message: `not JSON: ${e.message}` }] };
  }
  errorsList.style.display = result.ok ? 'none' : null;
  svg.style('display', result.ok ? null : 'none');
  altText.style.display = result.ok ? null : 'none';
  if (!result.ok) {
    errorsList.replaceChildren(...result.errors.map((e) => kit.el('li', {}, kit.el('code', { style: 'font:600 12.5px var(--mono)' }, e.path || '(spec)'), ' ', e.message)));
    return;
  }
  const spec = result.spec;
  // a different diagram type starts from scratch; edits within one type animate
  if (spec.type !== lastType) layer.selectAll('*').remove();
  animate = spec.type === lastType;
  lastType = spec.type;
  const [x, y, w, h] = draw[spec.type](spec);
  svg.attr('viewBox', [x - 6, y - 6, w + 12, h + 12]).attr('width', w + 12);
  const alt = describe(spec);
  svg.attr('role', 'img').attr('aria-label', alt);
  altText.replaceChildren(kit.el('b', {}, 'Alt text: '), alt);
}

box.addEventListener('input', render);
fig.el.prepend(box);
fig.el.prepend(kit.row(picker));
fig.add(errorsList);
fig.add(altText);
// move the drawing between the textarea and the alt text
fig.el.insertBefore(svg.node(), errorsList);
box.value = JSON.stringify(examples[type], null, 2);
render();
return fig.el;
