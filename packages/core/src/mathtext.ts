/**
 * TeX-lite: just enough maths typesetting for diagram labels, no KaTeX needed.
 *
 *   'a^2 + b^2 = c^2'   'f′(x)'   'P(A \cap B)'   'x_{i+1}'   '\theta = 90°'
 *
 * The conventions are the ones every maths textbook uses:
 *   - single-letter variables are italic          a  x  θ
 *   - numbers, operators, brackets are upright     2  +  =  (
 *   - named functions are upright words            sin  log  max
 *   - binary operators get a little space either side, and '-' becomes a real minus '−'
 *   - ^ and _ make super- and subscripts, {…} groups them
 *
 * parseMath() turns the string into spans; describe() turns spans into SVG
 * <tspan>s, and <MathText> in @dsviz/react turns the same spans into HTML.
 */
export interface MathSpan {
  text: string;
  italic: boolean;
  /** 1 = superscript, -1 = subscript. */
  shift?: 1 | -1;
}

const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'exp', 'max', 'min', 'lim', 'det', 'gcd', 'mod', 'proj', 'arg', 'Pr', 'E', 'Var']);
const COMMANDS: Record<string, string> = {
  theta: 'θ', alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', phi: 'φ', omega: 'ω',
  Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω', cap: '∩', cup: '∪', setminus: '−', triangle: '△', cdot: '·', times: '×', le: '≤', ge: '≥', ne: '≠',
  approx: '≈', to: '→', in: '∈', infty: '∞', pm: '±', angle: '∠', circ: '°', prime: '′', mid: '∣', ldots: '…', sqrt: '√', int: '∫', sum: '∑',
};
// TeX's spacing classes: binary operators get a medium space (4/18 em) either
// side, relations a thick one (5/18 em), which is why "a + b = c" reads as
// (a + b) = (c) at a glance.
const RELATIONS = new Set(['=', '<', '>', '≤', '≥', '≠', '≈', '→', '∈', '∣']);
const BINARY = new Set([...RELATIONS, '+', '−', '×', '·', '∩', '∪', '△', '±']);
const GREEK_UPRIGHT = /[ΔΣΩ∑∫√]/; // capital Greek and big operators stay upright
const MEDIUM = '\u205f'; // medium mathematical space, 4/18 em
const THICK = '\u2005'; // four-per-em space, close to TeX's 5/18 em

export function parseMath(src: string): MathSpan[] {
  const out: MathSpan[] = [];
  const push = (text: string, italic: boolean, shift?: 1 | -1) => {
    const last = out[out.length - 1];
    if (last && last.italic === italic && last.shift === shift) last.text += text;
    else out.push({ text, italic, ...(shift ? { shift } : {}) });
  };

  const walk = (s: string, shift?: 1 | -1) => {
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === ' ') { i++; continue; } // spacing is ours to decide
      if ((ch === '^' || ch === '_') && i + 1 < s.length) {
        const sh = ch === '^' ? 1 : -1;
        if (s[i + 1] === '{') {
          const end = matchBrace(s, i + 1);
          walk(s.slice(i + 2, end), sh);
          i = end + 1;
        } else {
          walk(s[i + 1], sh);
          i += 2;
        }
        continue;
      }
      if (ch === '\\') {
        const m = /^\\([A-Za-z]+)/.exec(s.slice(i));
        if (m) {
          if (m[1] === 'text' && s[i + 5] === '{') {
            const end = matchBrace(s, i + 5);
            push(s.slice(i + 6, end), false, shift);
            i = end + 1;
            continue;
          }
          const sym = COMMANDS[m[1]] ?? m[1];
          emitSymbol(sym, shift);
          i += m[0].length;
          continue;
        }
      }
      if (/[A-Za-z]/.test(ch)) {
        const word = /^[A-Za-z]+/.exec(s.slice(i))![0];
        if (FUNCTIONS.has(word)) push(word, false, shift);
        else push(word, true, shift); // "ab" is a·b: every letter italic
        i += word.length;
        continue;
      }
      emitSymbol(ch === '-' ? '−' : ch === '*' ? '·' : ch === "'" ? '′' : ch, shift);
      i++;
    }
  };

  function emitSymbol(sym: string, shift?: 1 | -1) {
    if (BINARY.has(sym) && !shift) {
      // unary minus at the start or after an operator / open bracket: no spaces
      const prev = out[out.length - 1]?.text.trimEnd().slice(-1);
      const unary = sym === '−' && (!prev || BINARY.has(prev) || '([{,'.includes(prev));
      const sp = RELATIONS.has(sym) ? THICK : MEDIUM;
      push(unary ? sym : `${sp}${sym}${sp}`, false, shift);
    } else if (/^[α-ωϑϕ]$/.test(sym)) push(sym, true, shift);
    else push(sym, !GREEK_UPRIGHT.test(sym) && /^\p{L}$/u.test(sym), shift);
  }

  walk(src);
  // an operator at either end has nothing to be spaced from ("P =" then a number in HTML)
  if (out.length) out[0].text = out[0].text.trimStart(), (out[out.length - 1].text = out[out.length - 1].text.trimEnd());
  return out.filter((s) => s.text);
}

function matchBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  return s.length;
}

/** Approximate width in px, for bounds (sub/superscripts are smaller). */
export function mathWidth(spans: MathSpan[], size: number): number {
  return spans.reduce((w, s) => w + [...s.text].length * size * (s.shift ? 0.36 : 0.5), 0);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * SVG markup for the spans, as <tspan>s. Super/subscripts move with `dy` in px
 * (not baseline-shift, which Firefox ignores), and the next span moves back.
 */
export function mathTspans(spans: MathSpan[], size: number): string {
  let out = '', level = 0;
  for (const s of spans) {
    const target = s.shift ? s.shift * size * 0.42 : 0;
    const dy = level - target; // y grows downward: up = negative dy
    level = target;
    const attrs = [s.italic ? 'font-style="italic"' : 'font-style="normal"'];
    if (s.shift) attrs.push(`font-size="${Math.round(size * 0.68 * 10) / 10}"`);
    if (Math.abs(dy) > 0.01) attrs.push(`dy="${Math.round(dy * 100) / 100}"`);
    out += `<tspan ${attrs.join(' ')}>${esc(s.text)}</tspan>`;
  }
  return out;
}
