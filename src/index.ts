/**
 * dsviz — interactive, animated SVG diagrams for data structures & algorithms.
 *
 *   state ──▶ layout functions ──▶ Scene (plain data, stable ids) ──▶ renderer
 *
 * The renderer is swappable: createView() animates in the DOM, toSVG() makes a
 * static string, and examples/react-motion.tsx shows framer-motion doing it.
 */
export * from './vec';
export * from './easing';
export * from './themes';
export * from './scene';
export * from './path';
export * from './describe';
export * from './styles';
export * from './render';
export * from './static';
export * from './player';
export * from './layouts/common';
export * from './layouts/array';
export * from './layouts/pointer';
export * from './layouts/linkedList';
export * from './layouts/tree';
export * from './layouts/graph';
export * from './layouts/grid';
export * from './layouts/stackQueue';
