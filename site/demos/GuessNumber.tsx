// Play before you learn: I'm thinking of a number from 1 to 100. Drag the marker
// (or click the line) to aim, then guess. Can you always win in 7?
import { useState } from 'react';
import { combine, handle, path, rect, text } from 'dsviz';
import { Button, Challenge, Diagram, useBurst } from 'dsviz/react';

const W = 460;
const x = (n: number) => ((n - 1) / 99) * W; // number → pixel
const n = (px: number) => Math.max(1, Math.min(100, Math.round((px / W) * 99 + 1))); // pixel → number
const secretNumber = () => 1 + Math.floor(Math.random() * 100);

export default function GuessNumber() {
  const [secret, setSecret] = useState(secretNumber);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [aim, setAim] = useState(50);
  const [touched, setTouched] = useState(false);
  const [wins, setWins] = useState<{ count: number; middle: boolean }[]>([]);
  const [particles, fire] = useBurst();

  // The live range is everything not ruled out by a "too high" / "too low".
  const lo = Math.max(1, ...guesses.filter((g) => g < secret).map((g) => g + 1));
  const hi = Math.min(100, ...guesses.filter((g) => g > secret).map((g) => g - 1));
  const won = guesses.includes(secret);
  const last = guesses.at(-1);

  function guess() {
    if (won) return;
    const next = [...guesses, aim];
    setGuesses(next);
    if (aim === secret) {
      fire(x(aim), 6, { count: 18, radius: 54 });
      // did every guess split the live range in half?
      let l = 1, h = 100, middle = true;
      for (const g of next) {
        if (Math.abs(g - Math.floor((l + h) / 2)) > 1) middle = false;
        if (g < secret) l = g + 1; else if (g > secret) h = g - 1;
      }
      setWins((w) => [...w, { count: next.length, middle }]);
    }
  }
  function newGame() {
    setSecret(secretNumber());
    setGuesses([]);
    setAim(50);
  }

  const scene = combine(
    rect({ id: 'track', x: W / 2, y: 6, w: W + 12, h: 22, rx: 6, role: 'track', interactive: true }),
    // ruled-out ends, and the live window between them
    lo > 1 && rect({ id: 'out-lo', x: x(lo - 0.5) / 2, y: 6, w: x(lo - 0.5), h: 22, rx: 6, tone: 'muted', exit: { w: 0, x: 0 } }),
    hi < 100 && rect({ id: 'out-hi', x: (x(hi + 0.5) + W) / 2, y: 6, w: W - x(hi + 0.5), h: 22, rx: 6, tone: 'muted', exit: { w: 0, x: W } }),
    rect({ id: 'live', x: (x(lo - 0.45) + x(hi + 0.45)) / 2, y: 6, w: Math.max(4, x(hi + 0.45) - x(lo - 0.45)), h: 22, rx: 6, role: 'window', tone: won ? 'success' : undefined }),
    [1, 25, 50, 75, 100].map((v) => text({ id: `tick${v}`, x: x(v), y: 30, text: String(v), size: 10, role: 'index' })),
    // one pin per guess, keyed by guess number so earlier pins stay put
    guesses.map((g, i) => {
      const tone = g === secret ? 'success' : g > secret ? 'danger' : 'visited';
      return [
        path({ id: `pin${i}`, points: [[x(g), -5], [x(g), -26]], role: 'curve', tone, width: 2, enter: { opacity: 0 } }),
        text({ id: `pin${i}:t`, x: x(g), y: -36, text: String(g), size: 11, role: 'value', tone }),
      ];
    }),
    !won && handle({ id: 'aim', x: x(aim), y: 6, r: 7, hit: 18, hint: !touched, tone: 'active', data: 'aim' }),
    !won && text({ id: 'aim:t', x: x(aim), y: 50, text: String(aim), size: 13, role: 'value', tone: 'active' }),
    won && text({ id: 'win', x: x(secret), y: 50, text: `${secret}!`, size: 15, role: 'value', tone: 'success' }),
    particles,
  );

  const status = won
    ? `Got it in ${guesses.length} ${guesses.length === 1 ? 'guess' : 'guesses'}.`
    : last === undefined
      ? 'Aim with the marker, then press Guess.'
      : `${last} is too ${last > secret ? 'high' : 'low'}. It's somewhere in ${lo}–${hi} (${hi - lo + 1} left).`;

  return (
    <>
      <Diagram
        scene={scene}
        height={130}
        viewBox={[-14, -52, W + 28, 115]}
        onDrag={(e) => { setTouched(true); setAim(n(e.x)); }}
        onClick={(e) => { if (e.id === 'track') { setTouched(true); setAim(n(e.x)); } }}
      />
      <p className="status">{status}</p>
      <div className="row">
        <Button variant="primary" onClick={guess} disabled={won}>Guess {won ? '' : aim}</Button>
        <Button onClick={newGame}>New number</Button>
        <span className="stats">guesses <b>{guesses.length}</b> · wins <b>{wins.length}</b></span>
      </div>
      <Challenge
        goals={[
          { label: 'Find the number', done: wins.length > 0 },
          { label: 'Find one in 7 guesses or fewer', done: wins.some((w) => w.count <= 7) },
          { label: 'Win by always guessing the middle of the live range', done: wins.some((w) => w.middle) },
        ]}
      />
    </>
  );
}
