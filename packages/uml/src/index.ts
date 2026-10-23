/**
 * @figurae/uml — UML and ER diagrams, each a pure function from your data to a scene.
 *
 *   behaviour:  sequence, communication, stateMachine, activity, useCase
 *   structure:  classDiagram, objectDiagram, component, deployment, packageDiagram, er
 *
 * Boxes carry stable ids, so a box that keeps its id moves instead of redrawing. Boxes without x/y are
 * placed by @figurae/layout.
 */
export * from './classDiagram';
export * from './sequence';
export * from './stateMachine';
export * from './deployment';
export * from './objectDiagram';
export * from './packageDiagram';
export * from './communication';
export * from './er';
export * from './figure';
export * from './useCase';
export * from './activity';
export * from './component';
