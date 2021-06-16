import type {Rectangle} from '@pixi/math';
import type {IShapeBuilder} from '../core/IShapeBuilder';
import {SmoothGraphicsData} from '../core/SmoothGraphicsData';
import {BuildData} from '../core/BuildData';
import {RoundedRectangle} from '@pixi/math';
import { earcut } from '@pixi/utils';
import {JOINT_TYPE} from '../core/const';

function getPt(n1: number, n2: number, perc: number): number {
    const diff = n2 - n1;

    return n1 + (diff * perc);
}

function quadraticBezierCurve(
    fromX: number, fromY: number,
    cpX: number, cpY: number,
    toX: number, toY: number,
    out: Array<number> = []): Array<number> {
    const n = 20;
    const points = out;

    let xa = 0;
    let ya = 0;
    let xb = 0;
    let yb = 0;
    let x = 0;
    let y = 0;

    for (let i = 0, j = 0; i <= n; ++i) {
        j = i / n;

        // The Green Line
        xa = getPt(fromX, cpX, j);
        ya = getPt(fromY, cpY, j);
        xb = getPt(cpX, toX, j);
        yb = getPt(cpY, toY, j);

        // The Black Dot
        x = getPt(xa, xb, j);
        y = getPt(ya, yb, j);

        points.push(x, y);
    }

    return points;
}

export class RoundedRectangleBuilder implements IShapeBuilder {
    path(graphicsData: SmoothGraphicsData, target: BuildData) {
        const rrectData = graphicsData.shape as RoundedRectangle;
        const {points} = graphicsData;
        const x = rrectData.x;
        const y = rrectData.y;
        const width = rrectData.width;
        const height = rrectData.height;

        // Don't allow negative radius or greater than half the smallest width
        const radius = Math.max(0, Math.min(rrectData.radius, Math.min(width, height) / 2));

        points.length = 0;

        // No radius, do a simple rectangle
        if (!radius) {
            points.push(x, y,
                x + width, y,
                x + width, y + height,
                x, y + height);
        } else {
            quadraticBezierCurve(x, y + radius,
                x, y,
                x + radius, y,
                points);
            quadraticBezierCurve(x + width - radius,
                y, x + width, y,
                x + width, y + radius,
                points);
            quadraticBezierCurve(x + width, y + height - radius,
                x + width, y + height,
                x + width - radius, y + height,
                points);
            quadraticBezierCurve(x + radius, y + height,
                x, y + height,
                x, y + height - radius,
                points);
        }
    }

    line(graphicsData: SmoothGraphicsData, target: BuildData): void {
        const {verts, joints} = target;
        const {points} = graphicsData;

        const joint = graphicsData.jointType();
        const len = points.length;

        verts.push(points[len - 2], points[len - 1]);
        joints.push(JOINT_TYPE.NONE);
        for (let i = 0; i < len; i += 2) {
            verts.push(points[i], points[i + 1]);
            joints.push(joint + 3);
        }
        verts.push(points[0], points[1]);
        joints.push(JOINT_TYPE.NONE);
    }

    fill(graphicsData: SmoothGraphicsData, target: BuildData): void {
        const {verts, joints} = target;
        const {points, triangles} = graphicsData;

        const vecPos = verts.length / 2;

        graphicsData.triangles = earcut(points, null, 2);

        for (let i = 0, j = points.length; i < j; i++)
        {
            verts.push(points[i], points[++i]);
            joints.push(JOINT_TYPE.FILL);
        }
    }
}
