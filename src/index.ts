/**
 * dsviz — interactive, animated SVG teaching diagrams.
 *
 *   state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ renderer
 *
 * Core (primitives, renderer, player) and the data-structure layouts are
 * exported at the top level. The other families are namespaces, because
 * several of them have a `segment` or `circle` and the namespace says which:
 *
 *   import { plot, prob, geom, sched, mem, uml, sys, git, layout } from 'dsviz';
 *   plot.fn(p, Math.sin)   geom.angleMark(A, B, C, …)   sched.simulate(procs, 'rr')
 */
export * from './vec';
export * from './easing';
export * from './themes';
export * from './scene';
export * from './path';
export * from './mathtext';
export * from './handle';
export * from './fx';
export * from './describe';
export * from './styles';
export * from './render';
export * from './camera';
export * from './connector';
export * from './static';
export * from './player';
export * from './ds';

export * as ds from './ds';
export * as plot from './plot';
export * as prob from './prob';
export * as geom from './geom';
export * as sched from './sched';
export * as mem from './mem';
export * as uml from './uml';
export * as sys from './sys';
export * as git from './git';
export * as layout from './layout';
