// A number line you can aim at. The blue band is everything still possible;
// each guess is a pin. Drag the marker (or click the line), then Guess.
import { useState } from 'react';
import { combine, handle, path, rect, text } from 'dsviz';
import { Button, Diagram, useBurst } from 'dsviz/react';

const W = 420;
const x = (n: number) => ((n - 1) / 99) * W; // number → pixel
const n = (px: number) => Math.max(1, Math.min(100, Math.round((px / W) * 99 + 1))); // pixel → number
const pick = () => 1 + Math.floor(Math.random() * 100);

export default function GuessNumber() {
  const [secret, setSecret] = useState(pick);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [aim, setAim] = useState(50);
  const [touched, setTouched] = useState(false);
  const [particles, fire] = useBurst();

  // the live range: everything not ruled out by a "too low" or "too high"
  const lo = Math.max(1, ...guesses.filter((g) => g < secret).map((g) => g + 1));
  const hi = Math.min(100, ...guesses.filter((g) => g > secret).map((g) => g - 1));
  const won = guesses.includes(secret);
  const last = guesses.at(-1);

  const guess = () => {
    if (won) return;
    setGuesses([...guesses, aim]);
    if (aim === secret) fire(x(aim), -20, { count: 18, radius: 50 });
  };
  const aimAt = (px: number) => { setTouched(true); setAim(n(px)); };

  const scene = combine(
    rect({ id: 'hit', x: W / 2, y: 0, w: W + 20, h: 40, role: 'hit', interactive: true }), // click anywhere on the line
    rect({ id: 'live', x: (x(lo) + x(hi)) / 2, y: 0, w: Math.max(8, x(hi) - x(lo) + 8), h: 12, rx: 6, tone: won ? 'success' : 'accent' }),
    path({ id: 'axis', points: [[0, 0], [W, 0]], role: 'axis' }),
    Array.from({ length: 11 }, (_, k) => {
      const v = k === 0 ? 1 : k * 10;
      return [
        path({ id: `tick${v}`, points: [[x(v), -4], [x(v), 4]], role: 'tick' }),
        text({ id: `num${v}`, x: x(v), y: 18, text: String(v), size: 11, role: 'index' }),
      ];
    }),
    guesses.map((g, i) => {
      const tone = g === secret ? 'success' : g > secret ? 'danger' : 'visited';
      return [
        path({ id: `pin${i}`, points: [[x(g), -8], [x(g), -34]], role: 'curve', tone, width: 2 }),
        text({ id: `pin${i}:t`, x: x(g), y: -44, text: String(g), size: 13, role: 'value' }),
      ];
    }),
    !won && handle({ id: 'aim', x: x(aim), y: 0, r: 7, hint: !touched, tone: 'active' }),
    !won && text({ id: 'aim:t', x: x(aim), y: 38, text: String(aim), size: 14, role: 'value' }),
    particles,
  );

  const status = won
    ? `Found ${secret} in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`
    : last === undefined
      ? 'Aim, then guess. Can you always do it in 7?'
      : `${last} is too ${last > secret ? 'high' : 'low'}. It's in ${lo}–${hi}.`;

  return (
    <>
      <Diagram
        scene={scene}
        viewBox={[-16, -62, W + 32, 112]}
        onDrag={(e) => aimAt(e.x)}
        onClick={(e) => e.id === 'hit' && aimAt(e.x)}
      />
      <p className="status">{status}</p>
      <div className="row">
        <Button variant="primary" onClick={guess} disabled={won}>Guess {won ? '' : aim}</Button>
        <Button onClick={() => { setSecret(pick()); setGuesses([]); setAim(50); }}>New number</Button>
      </div>
    </>
  );
}
