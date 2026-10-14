import { Scene, SceneNode } from './scene';
import { Easing } from './easing';
import { Theme, themes } from './themes';
import { Vec } from './vec';
export interface ViewOptions {
    /** A theme object (e.g. `themes.brilliant`) or its name. Default: getDefaultTheme(). */
    theme?: Theme | keyof typeof themes;
    /** Animation length in ms. Default: the theme's. */
    duration?: number;
    /** Default: the theme's. */
    ease?: Easing;
    /** 'auto' fits the viewBox to the scene (and animates it); or pass a fixed [x, y, w, h]. */
    viewBox?: 'auto' | [number, number, number, number];
    /** Padding around the scene in 'auto' mode. Default 24. */
    padding?: number;
    /** Inject the default stylesheet into <head>. Default true. */
    injectStyles?: boolean;
}
export interface RenderOptions {
    /** Override the duration for this render only. Use 0 while dragging. */
    duration?: number;
}
export type ViewEventType = 'click' | 'dragstart' | 'drag' | 'dragend';
export interface ViewEvent {
    type: ViewEventType;
    id: string;
    node: SceneNode;
    /** Pointer position in scene (world) coordinates. */
    x: number;
    y: number;
    original: Event;
}
export interface View {
    readonly svg: SVGSVGElement;
    /** The last scene passed to render(). */
    readonly scene: Scene;
    render(scene: Scene, opts?: RenderOptions): void;
    /** Switch theme in place (repaints immediately). */
    setTheme(theme: Theme | keyof typeof themes): void;
    readonly theme: Theme;
    on(type: ViewEventType, handler: (e: ViewEvent) => void): () => void;
    /** Convert browser client coords (e.g. event.clientX) into scene coords. */
    toWorld(clientX: number, clientY: number): Vec;
    destroy(): void;
}
/** Create a view inside an existing <svg> element. */
export declare function createView(svg: SVGSVGElement, options?: ViewOptions): View;
