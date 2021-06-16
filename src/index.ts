import {Renderer} from '@pixi/core';

export * from './core/BuildData';
export * from './core/const';
export * from './core/IShapeBuilder';
export * from './core/SegmentPacker';
export * from './core/SmoothGraphicsData';

export * from './shapes';
export * from './SmoothGraphicsGeometry';
export * from './SmoothGraphics';
import {SmoothRendererFactory, SmoothRenderer} from './SmoothShader';

export {SmoothRendererFactory, SmoothRenderer};

Renderer.registerPlugin('smooth', SmoothRenderer);
