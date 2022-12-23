import { SmoothGraphicsData } from './SmoothGraphicsData';
import { BuildData } from './BuildData';

/**
 * @memberof PIXI.smooth
 */
export interface IShapeBuilder
{
    path(graphicsData: SmoothGraphicsData, target: BuildData): void;

    line(graphicsData: SmoothGraphicsData, target: BuildData): void;

    fill(graphicsData: SmoothGraphicsData, target: BuildData): void;
}
