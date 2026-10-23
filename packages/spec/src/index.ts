/**
 * Diagrams as JSON: a `DiagramSpec` is plain data a program (or a language
 * model) can write, `validateSpec` checks it, `fromSpec` draws it and
 * `describeSpec` says in words what it shows.
 *
 *   untrusted JSON ──validateSpec──▶ { ok, errors[] }
 *                                      │ ok
 *                                      ▼
 *                  DiagramSpec ──fromSpec──▶ Scene ──▶ <Diagram> / toSVG
 *                              ──describeSpec──▶ "Sequence diagram, 3 participants…"
 *
 * Why a spec instead of letting a model write SVG or Mermaid? Because every
 * reference can be checked. A message to a participant that doesn't exist,
 * an edge to an unknown node, a typo in a field name: each is an error with a
 * path (`messages[3].to`) and a reason, so a caller can drop the diagram, show
 * why, or send the errors back to be fixed. Nothing invalid is drawn.
 *
 * The validator is hand-written (no schema library: the core has no
 * dependencies) and strict on purpose: an unknown field is an error, with a
 * "did you mean" when it is close to a real one, because a misspelt `lable`
 * silently ignored is a diagram with a label missing.
 *
 * Coordinates are optional everywhere: nodes without x/y are placed by the
 * layered layout (graph, architecture, class, state) or by the family's own
 * layout (sequence, git, array, table).
 */
import { Scene, Tone, combine, estimateTextWidth } from '@figurae/core';
import { array, graph as dsGraph, grid, pointer } from '@figurae/ds';
import { gitLanes, graph as gitGraph } from '@figurae/git';
import { classDiagram, sequence, stateMachine } from '@figurae/uml';
import type { RelationKind } from '@figurae/uml';
import { architecture } from '@figurae/arch';
import type { ComponentKind } from '@figurae/arch';

// ── the spec ─────────────────────────────────────────────────────────────────

/** Tones a spec may use (the stylesheet's palette). */
export const SPEC_TONES = ['default', 'active', 'accent', 'success', 'danger', 'visited', 'orange', 'muted'] as const;
export type SpecTone = (typeof SPEC_TONES)[number];

interface SpecBase {
  /** Used in the description (alt text); not drawn. */
  title?: string;
}

export interface SequenceSpec extends SpecBase {
  type: 'sequence';
  participants: { id: string; label?: string; kind?: 'object' | 'actor' }[];
  messages: { from: string; to: string; label: string; kind?: 'call' | 'return' | 'async'; tone?: SpecTone }[];
  fragments?: { kind: string; label?: string; from: number; to: number; over?: [string, string]; sections?: { label: string; from: number; to: number }[] }[];
  notes?: { over: string | [string, string]; text: string; at: number; tone?: SpecTone }[];
  numbered?: boolean;
  activations?: boolean;
}

export interface ClassSpec extends SpecBase {
  type: 'class';
  classes: { id: string; name?: string; stereotype?: string; abstract?: boolean; attributes?: string[]; methods?: string[]; x?: number; y?: number; tone?: SpecTone }[];
  relations?: { from: string; to: string; kind: RelationKind; label?: string; fromLabel?: string; toLabel?: string }[];
}

export interface StateSpec extends SpecBase {
  type: 'state';
  states: { id: string; label?: string; kind?: 'state' | 'initial' | 'final' | 'choice'; x?: number; y?: number; tone?: SpecTone }[];
  transitions: { from: string; to: string; label?: string }[];
  /** The state to highlight. */
  current?: string;
  direction?: 'down' | 'right';
}

export interface ArchitectureSpec extends SpecBase {
  type: 'architecture';
  components: { id: string; kind: ComponentKind; label?: string; sub?: string; x?: number; y?: number; tone?: SpecTone }[];
  links?: { from: string; to: string; label?: string; dashed?: boolean; both?: boolean; tone?: SpecTone }[];
  zones?: { id: string; label: string; around: string[]; tone?: SpecTone }[];
  direction?: 'down' | 'right';
}

export interface GraphSpec extends SpecBase {
  type: 'graph';
  nodes: { id: string; label?: string; kind?: string; tone?: SpecTone; x?: number; y?: number }[];
  edges?: { from: string; to: string; label?: string; tone?: SpecTone }[];
  directed?: boolean;
  /** Default 'layered'. */
  layout?: 'layered' | 'circle';
  direction?: 'down' | 'right';
  /** Default 'rect' (labels are usually words). */
  shape?: 'rect' | 'circle';
}

export interface GitSpec extends SpecBase {
  type: 'git';
  /** Newest first, as `git log` prints them. */
  commits: { hash: string; parents: string[]; label?: string; tone?: SpecTone }[];
  refs?: { name: string; hash: string; kind: 'branch' | 'remote' | 'tag' | 'head' }[];
  highlight?: string[];
}

export interface ArraySpec extends SpecBase {
  type: 'array';
  values: (string | number | null)[];
  /** Tone per index: { "2": "active" }. */
  tones?: Record<string, SpecTone>;
  pointers?: { label: string; at: number; side?: 'top' | 'bottom' }[];
  /** A highlighted band behind indices lo..hi (inclusive). */
  window?: [number, number];
}

export interface TableSpec extends SpecBase {
  type: 'table';
  rows: (string | number | null)[][];
  columns?: (string | number)[];
  rowLabels?: (string | number)[];
  tones?: { row: number; col: number; tone: SpecTone }[];
}

export type DiagramSpec = SequenceSpec | ClassSpec | StateSpec | ArchitectureSpec | GraphSpec | GitSpec | ArraySpec | TableSpec;
export type DiagramType = DiagramSpec['type'];
export const DIAGRAM_TYPES: readonly DiagramType[] = ['sequence', 'class', 'state', 'architecture', 'graph', 'git', 'array', 'table'];

export interface SpecError {
  /** Where: `messages[3].to`, or '' for the spec itself. */
  path: string;
  message: string;
}

export interface SpecResult {
  ok: boolean;
  errors: SpecError[];
  /** The spec, typed, when ok. */
  spec?: DiagramSpec;
}

/** Limits that keep a runaway generator from producing a diagram nobody can read. */
export const SPEC_LIMITS = { items: 200, text: 400 };

// ── checking ─────────────────────────────────────────────────────────────────

type Json = unknown;
type Obj = Record<string, Json>;
const isObj = (v: Json): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const typeName = (v: Json) => (v === null ? 'null' : Array.isArray(v) ? 'an array' : typeof v === 'object' ? 'an object' : typeof v === 'string' ? `the string ${JSON.stringify(v.length > 30 ? v.slice(0, 30) + '…' : v)}` : `${typeof v} ${String(v)}`);
const join = (path: string, k: string | number) => (typeof k === 'number' ? `${path}[${k}]` : path ? `${path}.${k}` : k);
const quoteList = (xs: readonly string[], max = 12) => (xs.length > max ? [...xs.slice(0, max).map((x) => `"${x}"`), '…'] : xs.map((x) => `"${x}"`)).join(', ');

/** Edit distance, for "did you mean". */
function distance(a: string, b: string): number {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
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
const closest = (word: string, options: readonly string[]) => {
  const best = options.map((o) => [o, distance(word.toLowerCase(), o.toLowerCase())] as const).sort((x, y) => x[1] - y[1])[0];
  // short words are too easy to "match": only suggest when the slip is small next to the word
  const allowed = word.length <= 2 ? 0 : word.length <= 5 ? 2 : Math.ceil(word.length / 3);
  return best && best[1] <= allowed ? best[0] : undefined;
};

/** A field's checker: returns nothing; pushes errors. */
type Check = (v: Json, path: string) => void;

class Checker {
  errors: SpecError[] = [];
  fail(path: string, message: string) {
    if (this.errors.length < 50) this.errors.push({ path, message });
  }

  /** Check an object's fields. `shape` lists every allowed field; `required` those that must be there. */
  object(v: Json, path: string, shape: Record<string, Check>, required: readonly string[] = []): v is Obj {
    if (!isObj(v)) {
      this.fail(path, `expected an object, got ${typeName(v)}`);
      return false;
    }
    for (const k of required) if (v[k] === undefined) this.fail(join(path, k), 'is required');
    for (const k of Object.keys(v)) {
      if (!(k in shape)) {
        const hint = closest(k, Object.keys(shape));
        this.fail(join(path, k), `unknown field${hint ? ` (did you mean "${hint}"?)` : `; allowed: ${quoteList(Object.keys(shape))}`}`);
      } else if (v[k] !== undefined) shape[k](v[k], join(path, k));
    }
    return true;
  }

  str = (o: { empty?: boolean } = {}): Check => (v, path) => {
    if (typeof v !== 'string') return this.fail(path, `expected a string, got ${typeName(v)}`);
    if (!o.empty && !v.trim()) return this.fail(path, 'must not be empty');
    if (v.length > SPEC_LIMITS.text) this.fail(path, `is ${v.length} characters; at most ${SPEC_LIMITS.text}`);
  };
  num = (o: { int?: boolean; min?: number } = {}): Check => (v, path) => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return this.fail(path, `expected a number, got ${typeName(v)}`);
    if (o.int && !Number.isInteger(v)) return this.fail(path, `expected a whole number, got ${v}`);
    if (o.min !== undefined && v < o.min) this.fail(path, `must be at least ${o.min}, got ${v}`);
  };
  bool = (): Check => (v, path) => {
    if (typeof v !== 'boolean') this.fail(path, `expected true or false, got ${typeName(v)}`);
  };
  oneOf = (values: readonly string[]): Check => (v, path) => {
    if (typeof v !== 'string' || !values.includes(v)) {
      const hint = typeof v === 'string' ? closest(v, values) : undefined;
      this.fail(path, `must be one of ${quoteList(values)}; got ${typeName(v)}${hint ? ` (did you mean "${hint}"?)` : ''}`);
    }
  };
  tone = (): Check => this.oneOf(SPEC_TONES);
  list = (each: Check, o: { min?: number } = {}): Check => (v, path) => {
    if (!Array.isArray(v)) return this.fail(path, `expected a list, got ${typeName(v)}`);
    if (o.min && v.length < o.min) this.fail(path, `needs at least ${o.min} item${o.min > 1 ? 's' : ''}`);
    if (v.length > SPEC_LIMITS.items) return this.fail(path, `has ${v.length} items; at most ${SPEC_LIMITS.items}`);
    v.forEach((x, i) => each(x, join(path, i)));
  };
  /** Passes if either check passes; otherwise one error naming both shapes. */
  either = (a: Check, b: Check, what: string): Check => (v, path) => {
    const before = this.errors.length;
    a(v, path);
    if (this.errors.length === before) return;
    this.errors.splice(before);
    b(v, path);
    if (this.errors.length === before) return;
    this.errors.splice(before);
    this.fail(path, `expected ${what}, got ${typeName(v)}`);
  };
  pair = (each: Check): Check => (v, path) => {
    if (!Array.isArray(v) || v.length !== 2) return this.fail(path, `expected a pair [a, b], got ${typeName(v)}`);
    v.forEach((x, i) => each(x, join(path, i)));
  };
  record = (each: Check): Check => (v, path) => {
    if (!isObj(v)) return this.fail(path, `expected an object, got ${typeName(v)}`);
    for (const [k, x] of Object.entries(v)) each(x, join(path, k));
  };

  /** Ids in a list must be unique; returns the set. */
  ids(items: Json, field: string, path: string): Map<string, number> {
    const seen = new Map<string, number>();
    if (!Array.isArray(items)) return seen;
    items.forEach((it, i) => {
      const v = isObj(it) ? it[field] : undefined;
      if (typeof v !== 'string') return;
      if (seen.has(v)) this.fail(join(join(path, i), field), `duplicate ${field} "${v}" (also ${join(path, seen.get(v)!)})`);
      else seen.set(v, i);
    });
    return seen;
  }

  /** `v` must be one of the known ids. */
  ref(v: Json, path: string, known: Map<string, number>, what: string) {
    if (typeof v !== 'string' || known.has(v)) return;
    const hint = closest(v, [...known.keys()]);
    this.fail(path, `unknown ${what} "${v}"${hint ? ` (did you mean "${hint}"?)` : known.size ? `; the ${what.endsWith('s') ? `${what}es` : `${what}s`} are ${quoteList([...known.keys()])}` : ''}`);
  }

  /** An index into a list of length n. */
  index(v: Json, path: string, n: number, what: string, inclusiveEnd = false) {
    if (typeof v !== 'number' || !Number.isInteger(v)) return;
    const max = inclusiveEnd ? n : n - 1;
    if (v < 0 || v > max) this.fail(path, `${what} ${v} is out of range; there ${n === 1 ? 'is' : 'are'} ${n} (valid: 0..${max})`);
  }
}

const each = <T = Obj>(v: Json, f: (x: T, i: number) => void) => Array.isArray(v) && v.forEach((x, i) => isObj(x) && f(x as T, i));

const validators: Record<DiagramType, (c: Checker, s: Obj) => void> = {
  sequence(c, s) {
    const participant = (v: Json, p: string) => c.object(v, p, { id: c.str(), label: c.str(), kind: c.oneOf(['object', 'actor']) }, ['id']);
    const message = (v: Json, p: string) =>
      c.object(v, p, { from: c.str(), to: c.str(), label: c.str({ empty: true }), kind: c.oneOf(['call', 'return', 'async']), tone: c.tone() }, ['from', 'to', 'label']);
    const section = (v: Json, p: string) => c.object(v, p, { label: c.str(), from: c.num({ int: true }), to: c.num({ int: true }) }, ['label', 'from', 'to']);
    const fragment = (v: Json, p: string) =>
      c.object(v, p, { kind: c.str(), label: c.str(), from: c.num({ int: true }), to: c.num({ int: true }), over: c.pair(c.str()), sections: c.list(section, { min: 1 }) }, ['kind', 'from', 'to']);
    const note = (v: Json, p: string) =>
      c.object(v, p, { over: c.either(c.str(), c.pair(c.str()), 'a participant id or a pair of them'), text: c.str(), at: c.num({ int: true }), tone: c.tone() }, ['over', 'text', 'at']);
    c.object(s, '', {
      type: () => {}, title: c.str(),
      participants: c.list(participant, { min: 1 }), messages: c.list(message), fragments: c.list(fragment), notes: c.list(note),
      numbered: c.bool(), activations: c.bool(),
    }, ['participants', 'messages']);
    const ids = c.ids(s.participants, 'id', 'participants');
    const n = Array.isArray(s.messages) ? s.messages.length : 0;
    each(s.messages, (m, i) => {
      c.ref(m.from, `messages[${i}].from`, ids, 'participant');
      c.ref(m.to, `messages[${i}].to`, ids, 'participant');
    });
    const range = (f: Obj, p: string) => {
      c.index(f.from, `${p}.from`, n, 'message');
      c.index(f.to, `${p}.to`, n, 'message');
      if (typeof f.from === 'number' && typeof f.to === 'number' && f.to < f.from) c.fail(`${p}.to`, `must not be before from (${f.from}), got ${f.to}`);
    };
    each(s.fragments, (f, i) => {
      const p = `fragments[${i}]`;
      range(f, p);
      if (Array.isArray(f.over)) f.over.forEach((o, k) => c.ref(o, `${p}.over[${k}]`, ids, 'participant'));
      each(f.sections, (sec, k) => {
        range(sec, `${p}.sections[${k}]`);
        if (typeof sec.from === 'number' && typeof f.from === 'number' && typeof f.to === 'number' && (sec.from < f.from || sec.from > f.to))
          c.fail(`${p}.sections[${k}].from`, `must be inside the fragment (${f.from}..${f.to}), got ${sec.from}`);
      });
    });
    each(s.notes, (nt, i) => {
      if (typeof nt.over === 'string') c.ref(nt.over, `notes[${i}].over`, ids, 'participant');
      else if (Array.isArray(nt.over)) nt.over.forEach((o, k) => c.ref(o, `notes[${i}].over[${k}]`, ids, 'participant'));
      c.index(nt.at, `notes[${i}].at`, n, 'message', true);
    });
  },

  class(c, s) {
    const strings = c.list(c.str());
    const cls = (v: Json, p: string) =>
      c.object(v, p, { id: c.str(), name: c.str(), stereotype: c.str(), abstract: c.bool(), attributes: strings, methods: strings, x: c.num(), y: c.num(), tone: c.tone() }, ['id']);
    const kinds: RelationKind[] = ['inherits', 'implements', 'composition', 'aggregation', 'association', 'dependency'];
    const rel = (v: Json, p: string) =>
      c.object(v, p, { from: c.str(), to: c.str(), kind: c.oneOf(kinds), label: c.str(), fromLabel: c.str(), toLabel: c.str() }, ['from', 'to', 'kind']);
    c.object(s, '', { type: () => {}, title: c.str(), classes: c.list(cls, { min: 1 }), relations: c.list(rel) }, ['classes']);
    const ids = c.ids(s.classes, 'id', 'classes');
    each(s.relations, (r, i) => (c.ref(r.from, `relations[${i}].from`, ids, 'class'), c.ref(r.to, `relations[${i}].to`, ids, 'class')));
    checkXY(c, s.classes, 'classes');
  },

  state(c, s) {
    const st = (v: Json, p: string) =>
      c.object(v, p, { id: c.str(), label: c.str(), kind: c.oneOf(['state', 'initial', 'final', 'choice']), x: c.num(), y: c.num(), tone: c.tone() }, ['id']);
    const tr = (v: Json, p: string) => c.object(v, p, { from: c.str(), to: c.str(), label: c.str() }, ['from', 'to']);
    c.object(s, '', { type: () => {}, title: c.str(), states: c.list(st, { min: 1 }), transitions: c.list(tr), current: c.str(), direction: c.oneOf(['down', 'right']) }, ['states', 'transitions']);
    const ids = c.ids(s.states, 'id', 'states');
    each(s.transitions, (t, i) => (c.ref(t.from, `transitions[${i}].from`, ids, 'state'), c.ref(t.to, `transitions[${i}].to`, ids, 'state')));
    if (s.current !== undefined) c.ref(s.current, 'current', ids, 'state');
    checkXY(c, s.states, 'states');
  },

  architecture(c, s) {
    const kinds: ComponentKind[] = ['client', 'user', 'lb', 'gateway', 'service', 'cache', 'db', 'queue', 'cdn', 'storage', 'file'];
    const comp = (v: Json, p: string) =>
      c.object(v, p, { id: c.str(), kind: c.oneOf(kinds), label: c.str(), sub: c.str(), x: c.num(), y: c.num(), tone: c.tone() }, ['id', 'kind']);
    const link = (v: Json, p: string) =>
      c.object(v, p, { from: c.str(), to: c.str(), label: c.str(), dashed: c.bool(), both: c.bool(), tone: c.tone() }, ['from', 'to']);
    const zone = (v: Json, p: string) => c.object(v, p, { id: c.str(), label: c.str(), around: c.list(c.str(), { min: 1 }), tone: c.tone() }, ['id', 'label', 'around']);
    c.object(s, '', { type: () => {}, title: c.str(), components: c.list(comp, { min: 1 }), links: c.list(link), zones: c.list(zone), direction: c.oneOf(['down', 'right']) }, ['components']);
    const ids = c.ids(s.components, 'id', 'components');
    c.ids(s.zones, 'id', 'zones');
    each(s.links, (l, i) => (c.ref(l.from, `links[${i}].from`, ids, 'component'), c.ref(l.to, `links[${i}].to`, ids, 'component')));
    each(s.zones, (z, i) => Array.isArray(z.around) && z.around.forEach((k, j) => c.ref(k, `zones[${i}].around[${j}]`, ids, 'component')));
    checkXY(c, s.components, 'components');
  },

  graph(c, s) {
    const node = (v: Json, p: string) =>
      c.object(v, p, { id: c.str(), label: c.str({ empty: true }), kind: c.str(), tone: c.tone(), x: c.num(), y: c.num() }, ['id']);
    const edge = (v: Json, p: string) => c.object(v, p, { from: c.str(), to: c.str(), label: c.str(), tone: c.tone() }, ['from', 'to']);
    c.object(s, '', {
      type: () => {}, title: c.str(), nodes: c.list(node, { min: 1 }), edges: c.list(edge), directed: c.bool(),
      layout: c.oneOf(['layered', 'circle']), direction: c.oneOf(['down', 'right']), shape: c.oneOf(['rect', 'circle']),
    }, ['nodes']);
    const ids = c.ids(s.nodes, 'id', 'nodes');
    each(s.edges, (e, i) => (c.ref(e.from, `edges[${i}].from`, ids, 'node'), c.ref(e.to, `edges[${i}].to`, ids, 'node')));
    each(s.nodes, (n, i) => typeof n.kind === 'string' && !/^[a-z][a-z0-9-]*$/.test(n.kind) && c.fail(`nodes[${i}].kind`, `must be a lowercase word (letters, digits, dashes) so it can name a CSS role, got "${n.kind}"`));
    checkXY(c, s.nodes, 'nodes');
  },

  git(c, s) {
    const commit = (v: Json, p: string) => c.object(v, p, { hash: c.str(), parents: c.list(c.str()), label: c.str(), tone: c.tone() }, ['hash', 'parents']);
    const ref = (v: Json, p: string) => c.object(v, p, { name: c.str(), hash: c.str(), kind: c.oneOf(['branch', 'remote', 'tag', 'head']) }, ['name', 'hash', 'kind']);
    c.object(s, '', { type: () => {}, title: c.str(), commits: c.list(commit, { min: 1 }), refs: c.list(ref), highlight: c.list(c.str()) }, ['commits']);
    const hashes = c.ids(s.commits, 'hash', 'commits');
    c.ids(s.refs, 'name', 'refs');
    // newest first: a listed parent must come AFTER its child (parents outside the list are fine: history is cut off)
    each(s.commits, (cm, i) =>
      Array.isArray(cm.parents) && cm.parents.forEach((p, k) => {
        if (typeof p === 'string' && hashes.has(p) && hashes.get(p)! <= i)
          c.fail(`commits[${i}].parents[${k}]`, `"${p}" is listed at commits[${hashes.get(p)}], not after this commit; list commits newest first (children before parents)`);
      }),
    );
    each(s.refs, (r, i) => c.ref(r.hash, `refs[${i}].hash`, hashes, 'commit'));
    if (Array.isArray(s.highlight)) s.highlight.forEach((h, i) => c.ref(h, `highlight[${i}]`, hashes, 'commit'));
  },

  array(c, s) {
    const value = (v: Json, p: string) => {
      if (v !== null && typeof v !== 'string' && typeof v !== 'number') c.fail(p, `expected a string, a number or null, got ${typeName(v)}`);
    };
    const ptr = (v: Json, p: string) => c.object(v, p, { label: c.str(), at: c.num({ int: true }), side: c.oneOf(['top', 'bottom']) }, ['label', 'at']);
    c.object(s, '', { type: () => {}, title: c.str(), values: c.list(value, { min: 1 }), tones: c.record(c.tone()), pointers: c.list(ptr), window: c.pair(c.num({ int: true })) }, ['values']);
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

  table(c, s) {
    const cell = (v: Json, p: string) => {
      if (v !== null && typeof v !== 'string' && typeof v !== 'number') c.fail(p, `expected a string, a number or null, got ${typeName(v)}`);
    };
    const label = (v: Json, p: string) => {
      if (typeof v !== 'string' && typeof v !== 'number') c.fail(p, `expected a string or a number, got ${typeName(v)}`);
    };
    const tone = (v: Json, p: string) => c.object(v, p, { row: c.num({ int: true }), col: c.num({ int: true }), tone: c.tone() }, ['row', 'col', 'tone']);
    c.object(s, '', { type: () => {}, title: c.str(), rows: c.list(c.list(cell, { min: 1 }), { min: 1 }), columns: c.list(label), rowLabels: c.list(label), tones: c.list(tone) }, ['rows']);
    const rows = Array.isArray(s.rows) ? s.rows : [];
    const width = Math.max(0, ...rows.map((r) => (Array.isArray(r) ? r.length : 0)));
    if (Array.isArray(s.columns) && s.columns.length > width) c.fail('columns', `has ${s.columns.length} labels but the widest row has ${width} cells`);
    if (Array.isArray(s.rowLabels) && s.rowLabels.length > rows.length) c.fail('rowLabels', `has ${s.rowLabels.length} labels but there are ${rows.length} rows`);
    each(s.tones, (t, i) => {
      c.index(t.row, `tones[${i}].row`, rows.length, 'row');
      const row = typeof t.row === 'number' ? rows[t.row] : undefined;
      if (Array.isArray(row)) c.index(t.col, `tones[${i}].col`, row.length, 'column');
    });
  },

};

/** x and y come together: one without the other is almost certainly a mistake. */
function checkXY(c: Checker, items: Json, path: string) {
  each(items, (it, i) => {
    if ((it.x === undefined) !== (it.y === undefined)) c.fail(`${path}[${i}]`, 'give both x and y, or neither (to have it placed for you)');
  });
}

/**
 * Check that `x` is a diagram spec figurae can draw. Never throws; every problem
 * is an error with a path and a message (at most 50 of them).
 */
export function validateSpec(x: unknown): SpecResult {
  const c = new Checker();
  if (!isObj(x)) {
    c.fail('', `expected a diagram spec object, got ${typeName(x)}`);
    return { ok: false, errors: c.errors };
  }
  if (typeof x.type !== 'string' || !(DIAGRAM_TYPES as readonly string[]).includes(x.type)) {
    const hint = typeof x.type === 'string' ? closest(x.type, DIAGRAM_TYPES) : undefined;
    c.fail('type', x.type === undefined ? `is required: one of ${quoteList(DIAGRAM_TYPES)}` : `must be one of ${quoteList(DIAGRAM_TYPES)}; got ${typeName(x.type)}${hint ? ` (did you mean "${hint}"?)` : ''}`);
    return { ok: false, errors: c.errors };
  }
  validators[x.type as DiagramType](c, x);
  return c.errors.length ? { ok: false, errors: c.errors } : { ok: true, errors: [], spec: x as unknown as DiagramSpec };
}

/** The errors as lines of text: `messages[3].to: unknown participant "dbb"…`. */
export const formatSpecErrors = (errors: readonly SpecError[]) => errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).join('\n');

// ── drawing ──────────────────────────────────────────────────────────────────

export interface FromSpecOptions {
  /** Prefix for every node id (default: the diagram's type). Two diagrams in one view need different ids. */
  id?: string;
}

const t = (tone: SpecTone | undefined): Tone | undefined => (tone === 'default' ? undefined : tone);

/**
 * Draw a spec. It is validated first, and an invalid spec throws an Error
 * listing every problem (call validateSpec yourself to handle them gently).
 */
export function fromSpec(spec: DiagramSpec | unknown, o: FromSpecOptions = {}): Scene {
  const r = validateSpec(spec);
  if (!r.ok) throw new Error(`Invalid diagram spec:\n${formatSpecErrors(r.errors)}`);
  const s = r.spec!;
  const id = o.id ?? s.type;
  switch (s.type) {
    case 'sequence': {
      // A spec's author can't measure text, so the lifelines move apart until the longest
      // message label (with its number) fits between two of them.
      const longest = Math.max(0, ...s.messages.map((m, i) => estimateTextWidth(`${s.numbered ? `${i + 1}. ` : ''}${m.label}`, 12)));
      const gap = Math.max(150, Math.ceil(longest + 40));
      return sequence(
        s.participants.map((p) => ({ id: p.id, label: p.label ?? p.id, kind: p.kind })),
        s.messages.map((m) => ({ ...m, tone: t(m.tone) })),
        { id, gap, numbered: s.numbered, activations: s.activations, highlight: false, fragments: s.fragments, notes: s.notes?.map((n) => ({ ...n, tone: t(n.tone) })) },
      );
    }
    case 'class':
      return classDiagram(s.classes.map((c) => ({ ...c, name: c.name ?? c.id, tone: t(c.tone) })), s.relations ?? [], { id });
    case 'state': {
      // a pair of opposite transitions would sit on one line: bow both apart
      const pairs = new Set(s.transitions.map((x) => `${x.from}>${x.to}`));
      return stateMachine(
        s.states.map((x) => ({ ...x, tone: t(x.tone) })),
        s.transitions.map((x) => ({ ...x, bend: x.from !== x.to && pairs.has(`${x.to}>${x.from}`) ? 18 : undefined })),
        { id, current: s.current, direction: s.direction },
      );
    }
    case 'architecture':
      return architecture(
        s.components.map((c) => ({ ...c, label: c.label ?? c.id, tone: t(c.tone) })),
        (s.links ?? []).map((l) => ({ ...l, tone: t(l.tone) })),
        { id, zones: s.zones?.map((z) => ({ ...z, tone: t(z.tone) })), direction: s.direction },
      );
    case 'graph':
      return dsGraph(
        s.nodes.map((n) => ({ ...n, tone: t(n.tone) })),
        (s.edges ?? []).map((e) => ({ ...e, tone: t(e.tone) })),
        { id, directed: s.directed, layout: s.layout ?? 'layered', direction: s.direction, shape: s.shape ?? 'rect', route: 'elbow' },
      );
    case 'git':
      return gitGraph(s.commits.map((c) => ({ ...c, tone: t(c.tone) })), s.refs ?? [], { id, highlight: s.highlight });
    case 'array': {
      const a = array(s.values, { id, tones: Object.fromEntries(Object.entries(s.tones ?? {}).map(([k, v]) => [k, t(v)])) });
      const levels = new Map<string, number>();
      return combine(
        s.window && a.window(s.window[0], s.window[1], { id: `${id}:window` }),
        a,
        (s.pointers ?? []).map((p, i) => {
          const side = p.side ?? 'top';
          const key = `${side}:${p.at}`;
          const level = levels.get(key) ?? 0;
          levels.set(key, level + 1);
          return pointer({ id: `${id}:ptr:${i}`, at: side === 'top' ? a.top(p.at) : a.bottom(p.at), side, label: p.label, level });
        }),
      );
    }
    case 'table': {
      const tones = new Map((s.tones ?? []).map((x) => [`${x.row},${x.col}`, t(x.tone)]));
      const width = Math.max(...s.rows.map((r) => r.length));
      const longest = Math.max(...s.rows.flat().map((v) => String(v ?? '').length), ...(s.columns ?? []).map((v) => String(v).length));
      // cells of words are wider than they are tall
      const cellWidth = Math.max(40, Math.min(160, longest * 9 + 16));
      return grid(s.rows.map((r) => [...r, ...Array(width - r.length).fill(null)]), {
        id, cellWidth, cellHeight: 40, colLabels: s.columns, rowLabels: s.rowLabels, tones: (r, c) => tones.get(`${r},${c}`),
      });
    }
  }
}

// ── describing ───────────────────────────────────────────────────────────────

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "a, b and c", or the first few and "and N more". */
function listing(items: readonly string[], max = 8): string {
  if (items.length <= max) return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : (items[0] ?? '');
  return `${items.slice(0, max).join(', ')} and ${items.length - max} more`;
}
const named = (s: DiagramSpec, kind: string) => (s.title ? `${kind} "${s.title}"` : kind);

/**
 * Plain-language alt text: what kind of diagram, how big, and what it says.
 * Long lists are cut after the first few items. Assumes a valid spec.
 */
export function describeSpec(s: DiagramSpec): string {
  switch (s.type) {
    case 'sequence': {
      const name = new Map(s.participants.map((p) => [p.id, p.label ?? p.id]));
      const steps = s.messages.map((m, i) => {
        const verb = m.kind === 'return' ? 'replies to' : m.kind === 'async' ? 'notifies' : 'calls';
        return `${i + 1}. ${name.get(m.from)} ${m.from === m.to ? 'calls itself' : `${verb} ${name.get(m.to)}`}: ${m.label}`;
      });
      return `${named(s, 'Sequence diagram')}, ${plural(s.participants.length, 'participant')} (${listing([...name.values()])}), ${plural(s.messages.length, 'message')}${steps.length ? `: ${listing(steps, 10)}` : ''}.`;
    }
    case 'class': {
      const name = new Map(s.classes.map((c) => [c.id, c.name ?? c.id]));
      const verbs: Record<RelationKind, string> = { inherits: 'inherits from', implements: 'implements', composition: 'is composed of', aggregation: 'has', association: 'uses', dependency: 'depends on' };
      const rels = (s.relations ?? []).map((r) => `${name.get(r.from)} ${verbs[r.kind]} ${name.get(r.to)}`);
      return `${named(s, 'Class diagram')}, ${plural(s.classes.length, 'class', 'classes')} (${listing([...name.values()])})${rels.length ? `, ${plural(rels.length, 'relationship')}: ${listing(rels)}` : ''}.`;
    }
    case 'state': {
      const name = new Map(s.states.map((x) => [x.id, x.kind === 'initial' ? 'start' : x.kind === 'final' ? 'end' : (x.label ?? x.id)]));
      const tr = s.transitions.map((x) => `${name.get(x.from)} → ${name.get(x.to)}${x.label ? ` on ${x.label}` : ''}`);
      const real = s.states.filter((x) => !x.kind || x.kind === 'state').map((x) => x.label ?? x.id);
      return `${named(s, 'State diagram')}, ${plural(real.length, 'state')} (${listing(real)}), ${plural(tr.length, 'transition')}${tr.length ? `: ${listing(tr)}` : ''}${s.current ? `. Current state: ${name.get(s.current)}` : ''}.`;
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
      const arrow = s.directed ? '→' : '–';
      const edges = (s.edges ?? []).map((e) => `${name.get(e.from)} ${arrow} ${name.get(e.to)}${e.label ? ` (${e.label})` : ''}`);
      const kinds = new Map<string, string[]>();
      for (const n of s.nodes) if (n.kind) (kinds.get(n.kind) ?? kinds.set(n.kind, []).get(n.kind)!).push(name.get(n.id)!);
      const k = [...kinds].map(([kind, ns]) => `${kind}: ${listing(ns)}`);
      return `${named(s, 'Graph')}, ${plural(s.nodes.length, 'node')}, ${plural(edges.length, s.directed ? 'directed edge' : 'edge')}${edges.length ? `: ${listing(edges, 12)}` : ''}${k.length ? `. ${k.join('; ')}` : ''}.`;
    }
    case 'git': {
      const lanes = Math.max(1, ...gitLanes(s.commits).flatMap((p) => [p.lane + 1, ...p.edges.map((e) => e.lane + 1)]));
      const merges = s.commits.filter((c) => c.parents.length > 1).length;
      const refs = (s.refs ?? []).map((r) => `${r.name} at ${s.commits.find((c) => c.hash === r.hash)?.label ?? r.hash}`);
      const hl = s.highlight?.length ? `. Highlighted: ${listing(s.highlight.map((h) => s.commits.find((c) => c.hash === h)?.label ?? h))}` : '';
      return `${named(s, 'Git history')}, ${plural(s.commits.length, 'commit')} on ${plural(lanes, 'line')}${merges ? `, ${plural(merges, 'merge')}` : ''}${refs.length ? `. ${listing(refs)}` : ''}${hl}.`;
    }
    case 'array': {
      const vals = s.values.map((v) => (v === null ? 'empty' : String(v)));
      const tones = Object.entries(s.tones ?? {}).map(([i, tone]) => `index ${i} (${tone})`);
      const ptrs = (s.pointers ?? []).map((p) => `${p.label} at ${p.at}`);
      return `${named(s, 'Array')} of ${plural(vals.length, 'value')}: ${listing(vals, 16)}${tones.length ? `. Highlighted: ${listing(tones)}` : ''}${ptrs.length ? `. Pointers: ${listing(ptrs)}` : ''}${s.window ? `. Window: indices ${s.window[0]} to ${s.window[1]}` : ''}.`;
    }
    case 'table': {
      const cols = Math.max(...s.rows.map((r) => r.length));
      return `${named(s, 'Table')}, ${plural(s.rows.length, 'row')} × ${plural(cols, 'column')}${s.columns?.length ? `. Columns: ${listing(s.columns.map(String))}` : ''}${s.tones?.length ? `. ${plural(s.tones.length, 'highlighted cell')}` : ''}.`;
    }
  }
}

