// Pointer arithmetic. `p + k` doesn't add k bytes: it adds k × sizeof(*p).
// Switch the element type and watch the same 24 bytes regroup.
import { useState } from 'react';
import { combine, mem, pointer } from 'dsviz';
import { Diagram, Segmented, Slider } from 'dsviz/react';

const BASE = 0x7ffc1000, BYTES = 24;
const types = {
  char: { size: 1, value: (i: number) => `'${String.fromCharCode(97 + i)}'` },
  int: { size: 4, value: (i: number) => String((i + 1) * 10) },
  double: { size: 8, value: (i: number) => (i + 1.5).toFixed(1) },
};
type T = keyof typeof types;

export default function Pointers() {
  const [type, setType] = useState<T>('int');
  const [k, setK] = useState(2);
  const { size, value } = types[type];
  const count = BYTES / size;
  const kk = Math.min(k, count); // k == count is "one past the end": a legal pointer you must not dereference

  const m = mem.memory({
    base: BASE, bytes: BYTES, byteWidth: 18, y: 40,
    // keyed by index: switching int → double resizes e0, e1, e2 and fades the rest
    groups: Array.from({ length: count }, (_, i) => ({ key: `e${i}`, offset: i * size, size, value: value(i), label: size >= 4 ? `a[${i}]` : undefined, tone: i === kk ? 'active' : undefined })),
  });
  const target = kk < count ? m.top(`e${kk}`) : m.byteTop(BYTES);
  const scene = combine(
    m,
    pointer({ id: 'p', at: m.byteTop(0), side: 'top', label: 'p', tone: 'accent', length: 14, gap: 16 }),
    kk > 0 && pointer({ id: 'pk', at: { x: target.x, y: target.y - (size >= 4 ? 14 : 0) }, side: 'top', label: `p + ${kk}`, tone: 'active', length: 14 }),
  );
  const addr = BASE + kk * size;

  return (
    <>
      <Diagram
        scene={scene}
        onClick={(e) => { const key = e.id.match(/:g:e(\d+)$/); if (key) setK(+key[1]); }}
      />
      <div className="row">
        <Segmented label="Type" value={type} onChange={(t) => { setType(t); setK((x) => Math.min(x, BYTES / types[t].size)); }} options={['char', 'int', 'double']} />
        <div className="grow"><Slider label="k" value={kk} onChange={setK} min={0} max={count} format={(v) => `p + ${v}`} /></div>
      </div>
      <p className="status formula">
        <code>{type} *p</code>: p + {kk} = 0x{BASE.toString(16)} + {kk} × {size} = <b className="tone-active">0x{addr.toString(16)}</b>
        {kk < count ? <>, and <code>*(p + {kk})</code> = <b>{value(kk)}</b></> : <>, one past the end: fine to compute, never dereference.</>}
      </p>
    </>
  );
}
