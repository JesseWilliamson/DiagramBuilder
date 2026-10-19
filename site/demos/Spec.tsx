// Diagrams as JSON. A model (or any program) writes a DiagramSpec; validateSpec
// checks every reference and field and says exactly what is wrong and where;
// fromSpec draws it; describeSpec writes the alt text. Edit the JSON: break a
// participant id or misspell a field and the errors list says so.
import { useMemo, useState } from 'react';
import { describeSpec, fromSpec, validateSpec } from 'dsviz';
import type { DiagramSpec } from 'dsviz';
import { Diagram, Select } from 'dsviz/react';

const examples: Record<string, DiagramSpec> = {
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
  array: { type: 'array', values: [3, 8, 12, 17, 21, 30], tones: { '3': 'active' }, pointers: [{ label: 'lo', at: 2 }, { label: 'hi', at: 5 }], window: [2, 5] },
  code: { type: 'code', code: 'for (const x of xs) {\n  if (x > best) best = x;\n}\nreturn best;', highlight: [[2, 2]], language: 'js' },
};

export default function Spec() {
  const [type, setType] = useState('sequence');
  const [json, setJson] = useState(() => JSON.stringify(examples.sequence, null, 2));
  const pick = (t: string) => (setType(t), setJson(JSON.stringify(examples[t], null, 2)));
  const result = useMemo(() => {
    try {
      return validateSpec(JSON.parse(json));
    } catch (e) {
      return { ok: false, errors: [{ path: '', message: `not JSON: ${(e as Error).message}` }] };
    }
  }, [json]);
  const spec = result.ok ? (result as { spec: DiagramSpec }).spec : null;
  return (
    <>
      <Select label="Example" value={type} onChange={pick} options={Object.keys(examples).map((k) => ({ value: k, label: k }))} />
      <textarea className="spec-json" value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} rows={12} />
      {spec ? (
        <>
          <Diagram scene={fromSpec(spec)} camera="fit" label={describeSpec(spec)} />
          <p className="status"><b>Alt text:</b> {describeSpec(spec)}</p>
        </>
      ) : (
        <ul className="spec-errors">{result.errors.map((e, i) => <li key={i}><code>{e.path || '(spec)'}</code> {e.message}</li>)}</ul>
      )}
    </>
  );
}
