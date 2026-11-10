// The rail course's models. These pin the numbers and rules the lesson text relies on,
// so a change to a model that would make a lesson wrong fails here first.
import { describe, expect, it } from 'vitest';
import { aspects, occupied } from '../apps/rail/src/rail/blocks';
import { plan } from '../apps/rail/src/rail/crossing';
import { conflict, routeById } from '../apps/rail/src/rail/interlocking';
import { act, done, start, type Action, type State } from '../apps/rail/src/rail/runaround';
import { judge } from '../apps/rail/src/figures/BlockingCheck';

describe('crossing plan (lesson 1)', () => {
  const total = (l: string, d: number) => Math.round(plan(l, d).dDelay + plan(l, d).uDelay);
  it('at 06:00 Bellbird beats Dunmore, narrowly, and Coolabah is too short', () => {
    expect(total('B', 0)).toBe(50);
    expect(total('D', 0)).toBe(58);
    expect(plan('C', 0).ok).toBe(false);
  });
  it('at 06:40 Dunmore wins, with only the up train waiting', () => {
    const p = plan('D', 40);
    expect(Math.round(p.uDelay)).toBe(18);
    expect(p.dDelay).toBe(0);
    expect(total('B', 40)).toBe(90);
  });
});

describe('automatic signals (lesson 2)', () => {
  const line = { signals: [0, 100, 200, 300], end: 400 };
  it('stop behind an occupied block, caution behind that, clear elsewhere', () => {
    const occ = occupied(line, [{ front: 250, length: 20 }], new Set());
    expect(aspects(occ)).toEqual(['clear', 'caution', 'stop', 'clear']);
  });
  it('a failed track circuit looks exactly like a train', () => {
    const failed = aspects(occupied(line, [], new Set([2])));
    const train = aspects(occupied(line, [{ front: 250, length: 20 }], new Set()));
    expect(failed).toEqual(train);
  });
});

describe('loop interlocking (lesson 3)', () => {
  const r = (id: string) => routeById[id];
  it('a cross (main one way, loop the other) is allowed', () => expect(conflict(r('S2-loop'), [r('S1-main')])).toBeNull());
  it('opposing routes into the main are refused', () => expect(conflict(r('S2-main'), [r('S1-main')])).toMatch(/main line/));
  it('points locked the other way are named', () => expect(conflict(r('S5-east'), [r('S3-east')])).toMatch(/points 12/));
});

describe('blocking check (protection lesson)', () => {
  it('refuses a train between the protecting signal and the worksite', () => expect(judge(420).kind).toBe('bad'));
  it('waits for a train between S12 and S14', () => expect(judge(300).kind).toBe('warn'));
  it('allows a train well back or right through', () => {
    expect(judge(150).kind).toBe('ok');
    expect(judge(700).kind).toBe('ok');
  });
});

describe('run-around (shunting)', () => {
  const run = (actions: Action[]) => actions.reduce<{ s: State; errors: string[] }>((acc, a) => {
    const r = act(acc.s, a);
    return { s: r.state, errors: r.error ? [...acc.errors, a] : acc.errors };
  }, { s: start, errors: [] });

  it('the safe order works with nothing refused', () => {
    const { s, errors } = run(['handbrakes', 'uncouple', 'west', 'p1', 'east', 'p2', 'east', 'p2', 'west', 'couple', 'release', 'test']);
    expect(errors).toEqual([]);
    expect(done(s)).toBe(true);
  });
  it('refuses uncoupling unsecured wagons, running through points, and testing with handbrakes on', () => {
    expect(act(start, 'uncouple').error).toMatch(/handbrakes/);
    const off = run(['handbrakes', 'uncouple', 'p1']).s; // points set for the loop, loco still on the main
    expect(act(off, 'west').error).toMatch(/points/i);
    const coupled = run(['handbrakes', 'uncouple', 'west', 'p1', 'east', 'p2', 'east', 'p2', 'west', 'couple']).s;
    expect(act(coupled, 'test').error).toMatch(/Release the handbrakes/);
  });
});
