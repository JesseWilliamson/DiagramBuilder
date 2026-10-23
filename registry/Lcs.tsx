// Filling a dynamic-programming table: the longest common subsequence of two strings.
// dp[i][j] = LCS length of the first i letters of A and the first j letters of B.
import { useMemo, useState } from 'react';
import { arrow, combine, fitViewBox, vnorm, vsub } from '@dsviz/core';
import { grid } from '@dsviz/ds';
import { Diagram, TextInput, Transport, usePlayer } from '@dsviz/react';

type Cell = [number, number];

function* lcs(A: string, B: string) {
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i && j ? null : 0))) as (number | null)[][];
  const copy = () => dp.map((r) => [...r]);
  yield { dp: copy(), cur: null as Cell | null, deps: [] as Cell[], path: [] as Cell[], msg: 'Row 0 and column 0: an empty prefix has LCS 0.' };
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      let deps: Cell[], msg: string;
      if (A[i - 1] === B[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]! + 1;
        deps = [[i - 1, j - 1]];
        msg = `${A[i - 1]} = ${B[j - 1]}: take the diagonal + 1.`;
      } else {
        const up = dp[i - 1][j]!, left = dp[i][j - 1]!;
        dp[i][j] = Math.max(up, left);
        deps = up >= left ? [[i - 1, j]] : [[i, j - 1]];
        msg = `${A[i - 1]} ≠ ${B[j - 1]}: max(up ${up}, left ${left}) = ${dp[i][j]}.`;
      }
      yield { dp: copy(), cur: [i, j] as Cell, deps, path: [], msg };
    }
  }
  // Traceback: follow the choices backwards from the corner.
  const path: Cell[] = [];
  let i = n, j = m, word = '';
  while (i > 0 && j > 0) {
    path.push([i, j]);
    if (A[i - 1] === B[j - 1]) { word = A[i - 1] + word; i--; j--; }
    else if (dp[i - 1][j]! >= dp[i][j - 1]!) i--;
    else j--;
    yield { dp: copy(), cur: path.at(-1)!, deps: [], path: [...path], msg: `Traceback… "${word}"` };
  }
  yield { dp: copy(), cur: null, deps: [], path, msg: `LCS = "${word}" (length ${dp[n][m]}).` };
}

type Frame = { dp: (number | null)[][]; cur: Cell | null; deps: Cell[]; path: Cell[] };

function draw(f: Frame, A: string, B: string) {
  const on = (list: Cell[], r: number, c: number) => list.some(([a, b]) => a === r && b === c);
  const g = grid(f.dp, {
    cell: 32,
    rowLabels: ['ε', ...A],
    colLabels: ['ε', ...B],
    format: (v) => (v === null ? '' : String(v)),
    tones: (r, c) => (f.cur?.[0] === r && f.cur?.[1] === c ? 'active' : on(f.path, r, c) ? 'success' : on(f.deps, r, c) ? 'accent' : undefined),
  });
  // Dependency arrows: from the cell we read toward the cell we're filling.
  const deps = f.deps.map(([r, c], k) => {
    const s = g.center(r, c), t = g.center(f.cur![0], f.cur![1]);
    const d = vnorm(vsub(t, s));
    return arrow({ id: `dep${k}`, x1: s.x + d.x * 8, y1: s.y + d.y * 8, x2: t.x - d.x * 12, y2: t.y - d.y * 12, tone: 'accent' });
  });
  return combine(g, deps);
}

export default function Lcs() {
  const [A, setA] = useState('ABCBDAB');
  const [B, setB] = useState('BDCABA');
  const player = usePlayer(() => lcs(A, B), [A, B], { interval: 260 });
  const f = player.frame!;
  // The camera changes when the PROBLEM changes (new strings), never per step.
  const viewBox = useMemo(() => fitViewBox(player.frames.map((fr) => draw(fr, A, B))), [player.frames]);
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 9) || 'A';

  return (
    <>
      <Diagram scene={draw(f, A, B)} viewBox={viewBox} />
      <p className="status">{f.msg}</p>
      <Transport player={player} />
      <div className="row">
        <TextInput label="A" value={A} onCommit={(v) => setA(clean(v))} />
        <TextInput label="B" value={B} onCommit={(v) => setB(clean(v))} />
      </div>
    </>
  );
}
