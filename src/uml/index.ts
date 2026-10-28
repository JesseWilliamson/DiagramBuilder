/**
 * dsviz/uml — UML and ER diagrams, each a pure function from your data to a scene.
 *
 *   behaviour:  sequence, stateMachine, activity, useCase
 *   structure:  classDiagram, component, deployment, er
 *
 * Boxes carry stable ids, so a box that keeps its id moves instead of redrawing. Boxes without x/y are
 * placed by dsviz/layout.
 */
export * from './classDiagram';
export * from './sequence';
export * from './stateMachine';
export * from './deployment';
export * from './er';
export * from './figure';
export * from './useCase';
export * from './activity';
export * from './component';
