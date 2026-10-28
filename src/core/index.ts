/**
 * dsviz — the headless layer: scene primitives, renderer, camera, player.
 *
 *   state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ renderer
 *
 * The families (ds, plot, prob, geom, os, arch, uml, git) are separate packages
 * that depend on this one; each exports its layouts flat:
 *
 *   import { fn, plane } from '../plot';
 *   import { angleMark } from '../geom';
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
