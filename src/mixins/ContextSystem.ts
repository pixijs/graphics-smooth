import { ContextSystem } from '@pixi/core';

interface ContextSystemPatched extends ContextSystem
{
    antialias: boolean;
}

// Hack to expose the antialias property on the ContextSystem
// But in PixiJS v7.1+ we will expose this property on the renderer
const originalInitFromOptions = ContextSystem.prototype.initFromOptions;

ContextSystem.prototype.initFromOptions = function initFromOptions(
    this:ContextSystemPatched,
    options: WebGLContextAttributes): void
{
    this.antialias = options.antialias;

    originalInitFromOptions.call(this, options);
};

export type { ContextSystemPatched };
