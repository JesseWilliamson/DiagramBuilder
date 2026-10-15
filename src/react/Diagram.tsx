import { useEffect, useRef } from 'react';
import { View, ViewEvent, createView } from '../render';
import { Scene } from '../scene';
import type { Easing } from '../easing';

export interface DiagramProps {
  scene: Scene;
  /**
   * 'natural' (default): drawn at 1 scene unit = 1px (× `scale`), centred, and
   * shrunk only when the container is narrower. Every diagram gets the same text
   * size and line weight. 'fill': stretch to the container (width 100%, `height`).
   */
  size?: 'natural' | 'fill';
  /** Pixels per scene unit in natural mode. Default 1. */
  scale?: number;
  /** CSS height in 'fill' mode. Default 240. */
  height?: number | string;
  /**
   * The camera. A fixed [x, y, w, h] never moves: use it for plots, anything
   * draggable, and step-through diagrams (`fitViewBox(allFrames)`). 'auto'
   * (default) grows to fit and otherwise stays still; see `camera`.
   */
  viewBox?: 'auto' | [number, number, number, number];
  /** How an 'auto' camera follows the scene: 'grow' (default) or 'fit'. */
  camera?: 'grow' | 'fit';
  padding?: number;
  /** Animation length in ms (default 420). */
  duration?: number;
  /** Easing curve (default easeOutSoft). Try easeInQuad for falling things. */
  ease?: Easing;
  onClick?: (e: ViewEvent) => void;
  onDragStart?: (e: ViewEvent) => void;
  onDrag?: (e: ViewEvent) => void;
  onDragEnd?: (e: ViewEvent) => void;
  /**
   * 'tactile': chunky shapes on a solid lip that lift on hover and sink when
   * pressed. 'flat': the plain textbook look. Default: inherit from the
   * nearest `data-dv-look` attribute (flat if there is none).
   */
  look?: 'tactile' | 'flat';
  className?: string;
  /** Accessible description of what the diagram shows. */
  label?: string;
}

/**
 * React wrapper around createView().
 *
 * The idea: React owns *when* to render (props changed), the view owns *how*
 * (keyed diff + tweening directly on DOM nodes, outside React's reconciler).
 * Two consequences worth knowing:
 *  - We never put SVG children in JSX; the view manages them, so React can't fight it.
 *  - Event handlers are read through a ref, so passing a fresh inline `onDrag`
 *    every render doesn't tear down and rebuild the view's listeners.
 */
export function Diagram({ scene, size = 'natural', scale, height = 240, viewBox = 'auto', camera, padding, duration, ease, onClick, onDragStart, onDrag, onDragEnd, look, className, label }: DiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef<View | null>(null);
  const dragging = useRef<null | 'pointer' | 'key'>(null);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const handlers = useRef({ onClick, onDragStart, onDrag, onDragEnd });
  handlers.current = { onClick, onDragStart, onDrag, onDragEnd };

  // Create / destroy the view. `viewBox`, `padding`, `duration` are creation options.
  useEffect(() => {
    const view = createView(svgRef.current!, { viewBox, camera, padding, duration, ease, size, scale });
    viewRef.current = view;
    const offs = [
      view.on('click', (e) => handlers.current.onClick?.(e)),
      view.on('dragstart', (e) => ((dragging.current = e.keyboard ? 'key' : 'pointer'), handlers.current.onDragStart?.(e))),
      view.on('drag', (e) => handlers.current.onDrag?.(e)),
      view.on('dragend', (e) => ((dragging.current = null), handlers.current.onDragEnd?.(e))),
    ];
    view.render(sceneRef.current);
    return () => {
      offs.forEach((off) => off());
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padding, duration, ease, size, scale, camera]);

  // Camera changes don't need a new view.
  useEffect(() => {
    viewRef.current?.setViewBox(viewBox);
    // a fixed camera is a new array each render; compare by value
  }, [Array.isArray(viewBox) ? viewBox.join(',') : viewBox]);

  // Every scene change: render. While the user drags, skip tweening AND freeze
  // the camera, so the thing under the cursor stays glued to it.
  useEffect(() => {
    // (A pointer drag follows the finger with no tween; an arrow-key press is a
    // discrete jump, so it gets a short one.)
    const d = dragging.current;
    viewRef.current?.render(scene, d ? { duration: d === 'key' ? 120 : 0, camera: false } : undefined);
  }, [scene]);

  const style = size === 'natural'
    ? { display: 'block', maxWidth: '100%', height: 'auto', margin: '0 auto', overflow: 'visible' }
    : { width: '100%', height, display: 'block' };
  return <svg ref={svgRef} className={className} style={style} role="img" aria-label={label} data-dv-look={look} />;
}
