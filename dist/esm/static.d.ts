import { Scene } from './scene';
import { Theme, themes } from './themes';
export interface ToSvgOptions {
    padding?: number;
    /** Embed the default stylesheet so the file looks right on its own. Default true. */
    embedStyles?: boolean;
    width?: number;
    theme?: Theme | keyof typeof themes;
}
export declare function toSVG(scene: Scene, o?: ToSvgOptions): string;
