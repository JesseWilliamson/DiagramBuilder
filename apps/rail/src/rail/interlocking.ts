// The interlocking for a crossing loop, as data plus one rule.
//
// A route is a path from an entrance signal to an exit, needing certain points in
// a certain position and reserving certain track sections. The interlocking's
// whole job is a conflict check: a route can be set only if every section it
// needs is free of other routes and every set of points it needs either already
// lies the right way or is free to move. Real interlockings are written as
// exactly this kind of table (the "control tables"), then checked exhaustively.

export type Section = 'west' | 'p11' | 'main' | 'loop' | 'p12' | 'east';
export type Points = '11' | '12';
export type Lie = 'N' | 'R';

export type Route = { id: string; signal: string; name: string; sections: Section[]; points: Partial<Record<Points, Lie>> };

export const routes: Route[] = [
  { id: 'S1-main', signal: 'S1', name: 'S1 → main', sections: ['p11', 'main'], points: { '11': 'N' } },
  { id: 'S1-loop', signal: 'S1', name: 'S1 → loop', sections: ['p11', 'loop'], points: { '11': 'R' } },
  { id: 'S2-main', signal: 'S2', name: 'S2 → main', sections: ['p12', 'main'], points: { '12': 'N' } },
  { id: 'S2-loop', signal: 'S2', name: 'S2 → loop', sections: ['p12', 'loop'], points: { '12': 'R' } },
  { id: 'S3-east', signal: 'S3', name: 'S3 → east', sections: ['p12', 'east'], points: { '12': 'N' } },
  { id: 'S5-east', signal: 'S5', name: 'S5 → east', sections: ['p12', 'east'], points: { '12': 'R' } },
  { id: 'S4-west', signal: 'S4', name: 'S4 → west', sections: ['p11', 'west'], points: { '11': 'N' } },
  { id: 'S6-west', signal: 'S6', name: 'S6 → west', sections: ['p11', 'west'], points: { '11': 'R' } },
];
export const routeById = Object.fromEntries(routes.map((r) => [r.id, r]));

const sectionName: Record<Section, string> = { west: 'the single line west', p11: 'points 11', main: 'the main line', loop: 'the loop', p12: 'points 12', east: 'the single line east' };

/** Why `route` can't be set while `locked` routes hold their sections (null if it can). */
export function conflict(route: Route, locked: Route[]): string | null {
  for (const other of locked) {
    if (other.id === route.id) continue;
    const shared = route.sections.find((s) => other.sections.includes(s));
    if (shared) {
      const pts = (Object.keys(route.points) as Points[]).find((p) => other.points[p] && other.points[p] !== route.points[p]);
      return pts
        ? `${route.name} needs points ${pts} ${route.points[pts] === 'N' ? 'normal' : 'reverse'}, but ${other.name} has them locked ${other.points[pts] === 'N' ? 'normal' : 'reverse'}.`
        : `${route.name} needs ${sectionName[shared]}, which ${other.name} has locked.`;
    }
  }
  return null;
}

/** Where the points lie: wherever the last route through them left them. */
export function pointsLie(locked: Route[], last: Record<Points, Lie>): Record<Points, Lie> {
  const out = { ...last };
  for (const r of locked) Object.assign(out, r.points);
  return out;
}
