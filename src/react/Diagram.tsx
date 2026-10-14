import { useEffect, useRef } from 'react';
import { View, ViewEvent, createView } from '../render';
import { Scene } from '../scene';

export interface DiagramProps {
  scene: Scene;
  /**
   * CSS height of the <svg>; width is always 100%. Default 240.
   * With a fixed `viewBox` this is a MAX height: the svg keeps the viewBox's
   * aspect ratio, so on a narrow screen the diagram shrinks instead of floating
   * in empty space.
   */
  height?: number | string;
  /** 'auto' fits the camera to the scene; a fixed [x, y, w, h] keeps axes still. Default 'auto'. */
  viewBox?: 'auto' | [number, number, number, number];
  padding?: number;
  /** Animation length in ms (default 380). */
  duration?: number;
  onClick?: (e: ViewEvent) => void;
  onDragStart?: (e: ViewEvent) => void;
  onDrag?: (e: ViewEvent) => void;
  onDragEnd?: (e: ViewEvent) => void;
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
export function Diagram({ scene, height = 240, viewBox = 'auto', padding, duration, onClick, onDragStart, onDrag, onDragEnd, className, label }: DiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef<View | null>(null);
  const dragging = useRef(false);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const handlers = useRef({ onClick, onDragStart, onDrag, onDragEnd });
  handlers.current = { onClick, onDragStart, onDrag, onDragEnd };

  // Create / destroy the view. `viewBox`, `padding`, `duration` are creation options.
  useEffect(() => {
    const view = createView(svgRef.current!, { viewBox, padding, duration });
    viewRef.current = view;
    const offs = [
      view.on('click', (e) => handlers.current.onClick?.(e)),
      view.on('dragstart', (e) => ((dragging.current = true), handlers.current.onDragStart?.(e))),
      view.on('drag', (e) => handlers.current.onDrag?.(e)),
      view.on('dragend', (e) => ((dragging.current = false), handlers.current.onDragEnd?.(e))),
    ];
    view.render(sceneRef.current);
    return () => {
      offs.forEach((off) => off());
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padding, duration]);

  // Camera changes don't need a new view.
  useEffect(() => {
    viewRef.current?.setViewBox(viewBox);
    // a fixed camera is a new array each render; compare by value
  }, [Array.isArray(viewBox) ? viewBox.join(',') : viewBox]);

  // Every scene change: render. While the user drags, skip tweening so the
  // thing under the cursor stays glued to it.
  useEffect(() => {
    viewRef.current?.render(scene, dragging.current ? { duration: 0 } : undefined);
  }, [scene]);

  const style = Array.isArray(viewBox)
    ? { width: '100%', height: 'auto', aspectRatio: `${viewBox[2]} / ${viewBox[3]}`, maxHeight: height, display: 'block' }
    : { width: '100%', height, display: 'block' };
  return <svg ref={svgRef} className={className} style={style} role="img" aria-label={label} />;
}
