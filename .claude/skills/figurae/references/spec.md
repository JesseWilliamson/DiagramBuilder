# DiagramSpec: diagrams as JSON

A `DiagramSpec` is a JSON object with a `type` and the fields for that type. Everything else is
optional. `title` (any type) goes into the alt text only.

```ts
const r = validateSpec(json);          // never throws
if (!r.ok) report(r.errors);           // [{ path: 'messages[3].to', message: 'unknown participant "dbb" (did you mean "db"?)' }]
else render(fromSpec(r.spec), describeSpec(r.spec));
```

## Rules that apply to every type

- **Unknown fields are errors.** Spell field names exactly as below. A near miss gets a hint
  (`unknown field (did you mean "label"?)`).
- **Ids are unique per list** and every reference (`from`, `to`, `over`, `around`, `hash`, `current`,
  `highlight`) must name one. Ids are case-sensitive strings.
- **Indices are 0-based** (messages, array cells, table rows/columns); **code lines are 1-based**.
- **Tones** come from: `default`, `active` (yellow: the current thing), `accent` (blue), `success`
  (green), `danger` (red), `visited` (purple), `orange`, `muted` (grey). (`ghost`, a dashed outline,
  exists in the library but not in specs.)
- **x and y** come together or not at all. Leave both out to have the layout place the node.
- **Limits:** at most 200 items in any list, 400 characters in any string (code: 20000 characters).

## sequence

| field | type | |
|---|---|---|
| `participants` | `{ id, label?, kind?: 'object' \| 'actor' }[]` | required, ≥ 1; label defaults to id |
| `messages` | `{ from, to, label, kind?: 'call' \| 'return' \| 'async', tone? }[]` | required; `label` may be `""` |
| `fragments` | `{ kind, label?, from, to, over?: [a, b], sections?: { label, from, to }[] }[]` | `kind` is any word: `loop`, `alt`, `opt`, `par`… |
| `notes` | `{ over: id \| [a, b], text, at, tone? }[]` | the note gets its own row just before message `at` (`at` = messages.length for the end); `\n` breaks lines |
| `numbered` | boolean | "1. login()" |
| `activations` | boolean | default true: bars from calls and returns |

`return` (sent by p) closes the most recent call still open on p; `async` doesn't wait and opens no
activation bar. A message with `from === to` is a self-call and needs no return. `alt` branches go in
`sections`; each later section draws a dashed divider and its guard, and starts from the call stack as
it was when the alt began (so both branches can return to the same caller). On an `alt`, `label` is
the first guard if set, else `sections[0].label`. Fragments may nest. A spec is drawn static: no step
highlight, and lifelines spaced to fit the longest message label.

```json
{ "type": "sequence", "title": "Login",
  "participants": [{ "id": "user", "label": "User", "kind": "actor" }, { "id": "api", "label": "API" }, { "id": "db", "label": "DB" }],
  "messages": [
    { "from": "user", "to": "api", "label": "POST /login" },
    { "from": "api", "to": "db", "label": "find user" },
    { "from": "db", "to": "api", "label": "row", "kind": "return" },
    { "from": "api", "to": "user", "label": "200 + token", "kind": "return", "tone": "success" },
    { "from": "api", "to": "user", "label": "401", "kind": "return", "tone": "danger" }
  ],
  "fragments": [{ "kind": "alt", "from": 3, "to": 4,
    "sections": [{ "label": "password ok", "from": 3, "to": 3 }, { "label": "else", "from": 4, "to": 4 }] }],
  "notes": [{ "over": "api", "text": "bcrypt compare", "at": 3 }] }
```

## class

| field | type | |
|---|---|---|
| `classes` | `{ id, name?, stereotype?, abstract?, attributes?: string[], methods?: string[], x?, y?, tone? }[]` | required; `name` defaults to id; members like `"- radius: number"`, `"+ area(): number"` |
| `relations` | `{ from, to, kind, label?, fromLabel?, toLabel? }[]` | `kind`: `inherits`, `implements`, `composition`, `aggregation`, `association`, `dependency` |

`inherits`/`implements` point from the subclass to the parent (parents are laid out above).
`composition`/`aggregation` go from the owner (diamond end) to the part.

```json
{ "type": "class",
  "classes": [{ "id": "Shape", "abstract": true, "methods": ["+ area(): number"] }, { "id": "Circle", "attributes": ["- r: number"] }],
  "relations": [{ "from": "Circle", "to": "Shape", "kind": "inherits" }] }
```

## state

| field | type | |
|---|---|---|
| `states` | `{ id, label?, kind?: 'state' \| 'initial' \| 'final' \| 'choice', x?, y?, tone? }[]` | required |
| `transitions` | `{ from, to, label? }[]` | required; label like `"pay [ok] / sendReceipt"` |
| `current` | state id | highlighted |
| `direction` | `'down' \| 'right'` | layout direction |

```json
{ "type": "state",
  "states": [{ "id": "start", "kind": "initial" }, { "id": "idle" }, { "id": "running" }, { "id": "end", "kind": "final" }],
  "transitions": [{ "from": "start", "to": "idle" }, { "from": "idle", "to": "running", "label": "start" },
                  { "from": "running", "to": "idle", "label": "pause" }, { "from": "running", "to": "end", "label": "finish" }],
  "current": "running" }
```

## architecture

| field | type | |
|---|---|---|
| `components` | `{ id, kind, label?, sub?, x?, y?, tone? }[]` | required; `kind`: `client`, `user`, `lb`, `gateway`, `service`, `cache`, `db`, `queue`, `cdn`, `storage`, `file`; `sub` is a small caption ("Postgres", "x3") |
| `links` | `{ from, to, label?, dashed?, both?, tone? }[]` | `both`: arrowheads at both ends |
| `zones` | `{ id, label, around: id[], tone? }[]` | dashed boundaries; list outer zones before inner ones |
| `direction` | `'right' \| 'down'` | default right |

```json
{ "type": "architecture",
  "components": [{ "id": "web", "kind": "client", "label": "Browser" }, { "id": "api", "kind": "service", "label": "API" },
                 { "id": "db", "kind": "db", "label": "Postgres" }],
  "links": [{ "from": "web", "to": "api", "label": "HTTPS" }, { "from": "api", "to": "db" }],
  "zones": [{ "id": "vpc", "label": "VPC", "around": ["api", "db"] }] }
```

## graph

| field | type | |
|---|---|---|
| `nodes` | `{ id, label?, kind?, tone?, x?, y? }[]` | required; `kind` is a lowercase word → CSS role `node-<kind>`; styled: `changed`, `upstream`, `downstream`, `test` |
| `edges` | `{ from, to, label?, tone? }[]` | |
| `directed` | boolean | arrowheads |
| `layout` | `'layered' \| 'circle'` | default `layered` |
| `direction` | `'down' \| 'right'` | default down |
| `shape` | `'rect' \| 'circle'` | default `rect` (sized to the label) |

```json
{ "type": "graph", "title": "Blast radius of parseConfig", "directed": true,
  "nodes": [{ "id": "parseConfig", "kind": "changed" }, { "id": "loadSettings", "kind": "downstream" },
            { "id": "readFile", "kind": "upstream" }, { "id": "config.test", "kind": "test" }],
  "edges": [{ "from": "readFile", "to": "parseConfig" }, { "from": "parseConfig", "to": "loadSettings" },
            { "from": "parseConfig", "to": "config.test" }] }
```

## git

| field | type | |
|---|---|---|
| `commits` | `{ hash, parents: string[], label?, tone? }[]` | required; **newest first**; first parent first; a parent not in the list is drawn as a stub |
| `refs` | `{ name, hash, kind: 'branch' \| 'remote' \| 'tag' \| 'head' }[]` | |
| `highlight` | hash[] | everything else dims |

```json
{ "type": "git",
  "commits": [{ "hash": "m", "parents": ["c", "f"], "label": "Merge feature" }, { "hash": "c", "parents": ["b"], "label": "Fix" },
              { "hash": "f", "parents": ["b"], "label": "Feature" }, { "hash": "b", "parents": [], "label": "Init" }],
  "refs": [{ "name": "main", "hash": "m", "kind": "branch" }], "highlight": ["m"] }
```

## array

| field | type | |
|---|---|---|
| `values` | `(string \| number \| null)[]` | required, ≥ 1 |
| `tones` | `{ "<index>": tone }` | keys are index strings: `{ "2": "active" }` |
| `pointers` | `{ label, at, side?: 'top' \| 'bottom' }[]` | pointers at one cell stack |
| `window` | `[lo, hi]` | band behind indices lo..hi |

```json
{ "type": "array", "values": [1, 3, 5, 7, 9], "tones": { "2": "active" },
  "pointers": [{ "label": "lo", "at": 0 }, { "label": "hi", "at": 4 }], "window": [0, 4] }
```

## table

| field | type | |
|---|---|---|
| `rows` | `(string \| number \| null)[][]` | required; short rows are padded |
| `columns` | `(string \| number)[]` | header labels |
| `rowLabels` | `(string \| number)[]` | |
| `tones` | `{ row, col, tone }[]` | |

```json
{ "type": "table", "columns": ["method", "path", "status"],
  "rows": [["GET", "/users", 200], ["DELETE", "/users/7", 404]], "tones": [{ "row": 1, "col": 2, "tone": "danger" }] }
```

## code

| field | type | |
|---|---|---|
| `code` | `string \| string[]` | required: one string with `\n`, or a list of lines |
| `highlight` | `[from, to][]` | 1-based inclusive line numbers (relative to `start`) |
| `numbers` | boolean | default true |
| `start` | number | first line's number, default 1 |
| `language` | string | for the alt text; not syntax-highlighted |

```json
{ "type": "code", "language": "python", "code": "def f(x):\n    return x * 2", "highlight": [[2, 2]] }
```

## Errors you will see

Each error is `{ path, message }`; the path names the exact field. Typical messages:

| message | fix |
|---|---|
| `type: must be one of "sequence", … ; got the string "seqeunce" (did you mean "sequence"?)` | spell the type |
| `messages[0].to: unknown participant "apii" (did you mean "api"?)` | use an id from `participants` |
| `participants[2].id: duplicate id "api" (also participants[1])` | make ids unique |
| `messages[2].label: is required` | add the field |
| `messages[1].kind: must be one of "call", "return", "async"; got the string "reply"` | use an allowed value |
| `messages[0].lable: unknown field (did you mean "label"?)` | rename the field |
| `fragments[0].to: message 9 is out of range; there are 3 (valid: 0..2)` | indices are 0-based |
| `fragments[1].sections[1].from: must be inside the fragment (0..1), got 2` | sections sit inside their fragment |
| `commits[1].parents[0]: "a" is listed at commits[0], not after this commit; list commits newest first` | reverse the order |
| `tones.mid: keys are indices like "2", got "mid"` | array tones are keyed by index |
| `highlight[0]: must be [from, to] with from ≤ to, got [3, 2]` | order the range |
| `states[0]: give both x and y, or neither` | drop the lone coordinate |
| `nodes[0].kind: must be a lowercase word …` | `kind` names a CSS role: `changed`, not `Changed File` |
| `values: has 201 items; at most 200` | split or summarise |

`describeSpec` output, for reference: `Sequence diagram "Login", 3 participants (User, API and DB),
5 messages: 1. User calls API: POST /login, 2. API calls DB: find user, …`.
