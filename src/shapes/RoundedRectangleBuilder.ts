import type { IShapeBuilder } from '../core/IShapeBuilder';
import { SmoothGraphicsData } from '../core/SmoothGraphicsData';
import { BuildData } from '../core/BuildData';
import { Graphics } from '@pixi/graphics';
import { RoundedRectangle } from '@pixi/core';
import { CircleBuilder } from './CircleBuilder';

function getPt(n1: number, n2: number, perc: number): number
{
    const diff = n2 - n1;

    return n1 + (diff * perc);
}

function quadraticBezierCurve(
    fromX: number, fromY: number,
    cpX: number, cpY: number,
    toX: number, toY: number,
    out: Array<number> = [],
    eps = 0.001): Array<number>
{
    const n = 20;
    const points = out;

    let xa = 0;
    let ya = 0;
    let xb = 0;
    let yb = 0;
    let x = 0;
    let y = 0;

    for (let i = 0, j = 0; i <= n; ++i)
    {
        j = i / n;

        // The Green Line
        xa = getPt(fromX, cpX, j);
        ya = getPt(fromY, cpY, j);
        xb = getPt(cpX, toX, j);
        yb = getPt(cpY, toY, j);

        // The Black Dot
        x = getPt(xa, xb, j);
        y = getPt(ya, yb, j);

        // Handle case when first curve points overlaps and earcut fails to triangulate
        if (i === 0
            && Math.abs(x - points[points.length - 2]) < eps
            && Math.abs(y - points[points.length - 1]) < eps)
        {
            continue;
        }

        points.push(x, y);
    }

    return points;
}

export class RoundedRectangleBuilder implements IShapeBuilder
{
    _circleBuilder = new CircleBuilder();

    path(graphicsData: SmoothGraphicsData, _target: BuildData)
    {
        if ((Graphics as any).nextRoundedRectBehavior)
        {
            this._circleBuilder.path(graphicsData, _target);

            return;
        }

        const rrectData = graphicsData.shape as RoundedRectangle;
        const { points } = graphicsData;
        const x = rrectData.x;
        const y = rrectData.y;
        const width = rrectData.width;
        const height = rrectData.height;

        // Don't allow negative radius or greater than half the smallest width
        const radius = Math.max(0, Math.min(rrectData.radius, Math.min(width, height) / 2));

        points.length = 0;

        // No radius, do a simple rectangle
        if (!radius)
        {
            points.push(x, y,
                x + width, y,
                x + width, y + height,
                x, y + height);
        }
        else
        {
            const eps = _target.closePointEps;

            quadraticBezierCurve(x, y + radius,
                x, y,
                x + radius, y,
                points, eps);
            quadraticBezierCurve(x + width - radius,
                y, x + width, y,
                x + width, y + radius,
                points, eps);
            quadraticBezierCurve(x + width, y + height - radius,
                x + width, y + height,
                x + width - radius, y + height,
                points, eps);
            quadraticBezierCurve(x + radius, y + height,
                x, y + height,
                x, y + height - radius,
                points, eps);

            if (points.length >= 4
                && Math.abs(points[0] - points[points.length - 2]) < eps
                && Math.abs(points[1] - points[points.length - 1]) < eps)
            {
                points.pop();
                points.pop();
            }
        }
    }

    line(graphicsData: SmoothGraphicsData, target: BuildData): void
    {
        this._circleBuilder.line(graphicsData, target);
    }

    fill(graphicsData: SmoothGraphicsData, target: BuildData): void
    {
        this._circleBuilder.fill(graphicsData, target);
    }
}
