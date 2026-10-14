import type { ReactElement } from 'react';
import type { Course } from './content';

/**
 * Course icons: small flat compositions in the palette, two shades per shape
 * (a light face and a dark side) for a bit of depth, like Brilliant's course art.
 * Hand-drawn SVG, not dsviz scenes: they never animate.
 */
const shades: Record<Course['tone'], [string, string, string]> = {
  blue: ['#abbdff', '#456dff', '#213c9e'],
  purple: ['#d3b8ff', '#9d62ff', '#5a2ea3'],
  yellow: ['#fce49d', '#f7c325', '#926d00'],
  green: ['#9fe8b3', '#29cc57', '#007c23'],
  orange: ['#ffcc9c', '#ff8d23', '#a55307'],
  red: ['#ffb6b6', '#ff5d5d', '#9c2e2e'],
};

export function CourseArt({ id, tone, size = 72 }: { id: string; tone: Course['tone']; size?: number }) {
  const [light, mid, dark] = shades[tone];
  const art: Record<string, ReactElement> = {
    algorithms: (
      <>
        <rect x="8" y="40" width="14" height="24" rx="2" fill={light} />
        <rect x="26" y="28" width="14" height="36" rx="2" fill={mid} />
        <rect x="44" y="14" width="14" height="50" rx="2" fill={dark} />
        <circle cx="51" cy="10" r="5" fill={mid} />
      </>
    ),
    calculus: (
      <>
        <path d="M6 62 C 22 62, 26 14, 44 14 S 66 40, 66 40 L 66 62 Z" fill={light} />
        <path d="M6 62 C 22 62, 26 14, 44 14 S 66 40, 66 40" fill="none" stroke={mid} strokeWidth="5" strokeLinecap="round" />
        <rect x="18" y="38" width="9" height="24" fill={dark} opacity=".85" />
        <rect x="30" y="22" width="9" height="40" fill={dark} opacity=".85" />
      </>
    ),
    probability: (
      <>
        <rect x="10" y="22" width="34" height="34" rx="7" fill={mid} transform="rotate(-12 27 39)" />
        <rect x="30" y="14" width="34" height="34" rx="7" fill={light} />
        {[[40, 24], [54, 38], [47, 31]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.4" fill={dark} />)}
      </>
    ),
    geometry: (
      <>
        <circle cx="36" cy="38" r="26" fill={light} />
        <path d="M14 52 L 36 12 L 60 50 Z" fill={mid} />
        <path d="M36 12 L 60 50 L 36 44 Z" fill={dark} />
      </>
    ),
    systems: (
      <>
        <rect x="16" y="16" width="40" height="40" rx="6" fill={mid} />
        <rect x="26" y="26" width="20" height="20" rx="3" fill={dark} />
        {[22, 32, 42, 50].map((v) => <g key={v}><rect x={v - 2} y="6" width="4" height="10" rx="1" fill={light} /><rect x={v - 2} y="56" width="4" height="10" rx="1" fill={light} /></g>)}
      </>
    ),
    dsviz: (
      <>
        <rect x="6" y="30" width="26" height="26" rx="5" fill={light} />
        <circle cx="50" cy="22" r="14" fill={mid} />
        <path d="M30 40 L 44 30" stroke={dark} strokeWidth="4" strokeLinecap="round" />
        <path d="M38 64 L 52 42 L 66 64 Z" fill={dark} />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden>
      {art[id] ?? art.dsviz}
    </svg>
  );
}
