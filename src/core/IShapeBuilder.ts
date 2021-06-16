import type {Circle, Ellipse} from '@pixi/math';
import {SmoothGraphicsData} from './SmoothGraphicsData';
import {BuildData} from './BuildData';

export interface IShapeBuilder {
    path(graphicsData: SmoothGraphicsData, target: BuildData): void;

    line(graphicsData: SmoothGraphicsData, target: BuildData): void;

    fill(graphicsData: SmoothGraphicsData, target: BuildData): void;
}
