import type {Rectangle} from '@pixi/math';
import type {IShapeBuilder} from '../core/IShapeBuilder';
import {SmoothGraphicsData} from '../core/SmoothGraphicsData';
import {BuildData} from '../core/BuildData';
import {JOINT_TYPE} from '../core/const';

export class RectangleBuilder implements IShapeBuilder {
    path(graphicsData: SmoothGraphicsData, target: BuildData) {
        // --- //
        // need to convert points to a nice regular data
        //
        const rectData = graphicsData.shape as Rectangle;
        const x = rectData.x;
        const y = rectData.y;
        const width = rectData.width;
        const height = rectData.height;
        const points = graphicsData.points;

        points.length = 0;

        points.push(x, y,
            x + width, y,
            x + width, y + height,
            x, y + height);
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
        verts.push(points[2], points[3]);
        joints.push(JOINT_TYPE.NONE);
    }

    fill(graphicsData: SmoothGraphicsData, target: BuildData): void {
        const {verts, joints} = target;
        const {points, triangles} = graphicsData;

        triangles.length = 0;

        const vertPos = verts.length / 2;

        verts.push(points[0], points[1],
            points[2], points[3],
            points[4], points[5],
            points[6], points[7]);

        joints.push(JOINT_TYPE.FILL, JOINT_TYPE.FILL, JOINT_TYPE.FILL, JOINT_TYPE.FILL);
        triangles.push(0, 1, 2, 0, 2, 3);
    }
}
