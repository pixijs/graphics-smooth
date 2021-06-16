import type {IShapeBuilder} from '../core/IShapeBuilder';
import {SmoothGraphicsData} from '../core/SmoothGraphicsData';
import {BuildData} from '../core/BuildData';
import {JOINT_TYPE} from '../core/const';
import {Point, Polygon} from "@pixi/math";
import {earcut} from '@pixi/utils';

let tempArr: Array<number> = [];

export class PolyBuilder implements IShapeBuilder {
    path(graphicsData: SmoothGraphicsData, buildData: BuildData) {
        const shape = graphicsData.shape as Polygon;
        let points = graphicsData.points = shape.points.slice();
        const eps = buildData.closePointEps;
        const eps2 = eps * eps;

        if (points.length === 0) {
            return;
        }

        const firstPoint = new Point(points[0], points[1]);
        const lastPoint = new Point(points[points.length - 2], points[points.length - 1]);
        const closedShape = graphicsData.closeStroke = shape.closeStroke;

        let len = points.length;
        let newLen = 2;

        // 1. remove equal points
        for (let i = 2; i < len; i += 2) {
            const x1 = points[i - 2], y1 = points[i - 1], x2 = points[i], y2 = points[i + 1];
            let flag = true;
            if (Math.abs(x1 - x2) < eps
                && Math.abs(y1 - y2) < eps) {
                flag = false;
            }

            if (flag) {
                points[newLen] = points[i];
                points[newLen + 1] = points[i + 1];
                newLen += 2;
            }
        }
        points.length = len = newLen;

        newLen = 2;
        // 2. remove middle points
        for (let i = 2; i + 2 < len; i += 2) {
            let x1 = points[i - 2], y1 = points[i - 1], x2 = points[i], y2 = points[i + 1],
                x3 = points[i + 2], y3 = points[i + 3];

            x1 -= x2;
            y1 -= y2;
            x3 -= x2;
            y3 -= y2;
            let flag = true;
            if (Math.abs(x3 * y1 - y3 * x1) < eps2) {
                if (x1 * x2 + y1 * y2 < -eps2) {
                    flag = false;
                }
            }

            if (flag) {
                points[newLen] = points[i];
                points[newLen + 1] = points[i + 1];
                newLen += 2;
            }
        }
        points[newLen] = points[len - 2];
        points[newLen + 1] = points[len - 1];
        newLen += 2;

        points.length = len = newLen;

        if (len <= 2) {
            // suddenly, nothing
            return;
        }

        if (closedShape) {
            // first point should be last point in closed line!
            const closedPath = Math.abs(firstPoint.x - lastPoint.x) < eps
                && Math.abs(firstPoint.y - lastPoint.y) < eps;

            if (closedPath) {
                points.pop();
                points.pop();
            }
        }
    }

    line(graphicsData: SmoothGraphicsData, buildData: BuildData) {
        const {closeStroke, points} = graphicsData;
        const eps = buildData.closePointEps;
        const eps2 = eps * eps;
        const len = points.length;
        const style = graphicsData.lineStyle;

        if (len <= 2) {
            return;
        }
        const {verts, joints} = buildData;

        //TODO: alignment

        let joint = graphicsData.jointType();
        let cap = graphicsData.capType();
        let prevCap = 0;

        let prevX: number, prevY: number;
        if (closeStroke) {
            prevX = points[len - 2];
            prevY = points[len - 1];
            joints.push(JOINT_TYPE.NONE);
        } else {
            prevX = points[2];
            prevY = points[3];
            if (cap === JOINT_TYPE.CAP_ROUND) {
                verts.push(points[0], points[1]);
                joints.push(JOINT_TYPE.NONE);
                joints.push(JOINT_TYPE.CAP_ROUND);
                prevCap = 0;
            } else {
                prevCap = cap;
                joints.push(JOINT_TYPE.NONE);
            }
        }
        verts.push(prevX, prevY);

        /* Line segments of interest where (x1,y1) forms the corner. */
        for (let i = 0; i < len; i += 2) {
            const x1 = points[i], y1 = points[i + 1];

            let x2: number, y2: number;
            if (i + 2 < len) {
                x2 = points[i + 2];
                y2 = points[i + 3];
            } else {
                x2 = points[0];
                y2 = points[1];
            }

            const dx = x2 - x1;
            const dy = y2 - y1;
            let nextX: number, nextY: number;

            let endJoint = joint;
            if (i + 2 >= len) {
                nextX = points[2];
                nextY = points[3];
                if (!closeStroke) {
                    endJoint = JOINT_TYPE.NONE;
                }
            } else if (i + 4 >= len) {
                nextX = points[0];
                nextY = points[1];
                if (!closeStroke) {
                    if (cap === JOINT_TYPE.CAP_ROUND) {
                        endJoint = JOINT_TYPE.JOINT_CAP_ROUND;
                    }
                    if (cap === JOINT_TYPE.CAP_BUTT) {
                        endJoint = JOINT_TYPE.JOINT_CAP_BUTT;
                    }
                    if (cap === JOINT_TYPE.CAP_SQUARE) {
                        endJoint = JOINT_TYPE.JOINT_CAP_SQUARE;
                    }
                }
            } else {
                nextX = points[i + 4];
                nextY = points[i + 5];
            }

            const dx3 = x1 - prevX;
            const dy3 = y1 - prevY;

            if (joint >= JOINT_TYPE.JOINT_BEVEL && joint <= JOINT_TYPE.JOINT_MITER) {
                const dx2 = nextX - x2;
                const dy2 = nextY - y2;
                if (endJoint >= JOINT_TYPE.JOINT_BEVEL
                    && endJoint <= JOINT_TYPE.JOINT_MITER + 3) {
                    const D = dx2 * dy - dy2 * dx;
                    if (Math.abs(D) < eps) {
                        switch (joint & ~3) {
                            case JOINT_TYPE.JOINT_ROUND:
                                endJoint = JOINT_TYPE.JOINT_CAP_ROUND;
                                break;
                            default:
                                endJoint = JOINT_TYPE.JOINT_CAP_BUTT;
                                break;
                        }
                    }
                }

                if (joint === JOINT_TYPE.JOINT_MITER) {
                    let jointAdd = 0;
                    if (dx3 * dx + dy3 * dy > -eps) {
                        jointAdd++;
                    }
                    if (endJoint === JOINT_TYPE.JOINT_MITER && dx2 * dx + dy2 * dy > -eps) {
                        jointAdd += 2;
                    }
                    endJoint += jointAdd;
                }
            }
            if (prevCap === 0) {
                if (Math.abs(dx3 * dy - dy3 * dx) < eps) {
                    prevCap = JOINT_TYPE.CAP_BUTT2;
                }
            }
            endJoint += prevCap;
            prevCap = 0;

            verts.push(x1, y1);
            joints.push(endJoint);

            prevX = x1;
            prevY = y1;
        }

        if (closeStroke) {
            verts.push(points[0], points[1]);
            joints.push(JOINT_TYPE.NONE);
            verts.push(points[2], points[3]);
            joints.push(JOINT_TYPE.NONE);
        } else {
            verts.push(points[len - 4], points[len - 3]);
            joints.push(JOINT_TYPE.NONE);
        }
    }

    fill(graphicsData: SmoothGraphicsData, buildData: BuildData) {
        let points = graphicsData.points;
        //TODO: simplify holes too!
        const holes = graphicsData.holes;
        const eps = buildData.closePointEps;

        const {verts, joints} = buildData;

        if (points.length < 6) {
            return
        }
        const holeArray = [];
        let len = points.length;
        // Process holes..

        for (let i = 0; i < holes.length; i++) {
            const hole = holes[i];

            holeArray.push(points.length / 2);
            points = points.concat(hole.points);
        }

        //TODO: reduce size later?
        const pn = tempArr;
        if (pn.length < points.length) {
            pn.length = points.length;
        }
        let start = 0;
        for (let i = 0; i <= holeArray.length; i++) {
            let finish = len / 2;
            if (i > 0) {
                if (i < holeArray.length) {
                    finish = holeArray[i];
                } else {
                    finish = (points.length >> 1);
                }
            }
            pn[start * 2] = finish - 1;
            pn[(finish - 1) * 2 + 1] = 0;
            for (let j = start; j + 1 < finish; j++) {
                pn[j * 2 + 1] = j + 1;
                pn[j * 2 + 2] = j;
            }
        }

        // sort color
        graphicsData.triangles = earcut(points, holeArray, 2);

        if (!graphicsData.triangles) {
            return;
        }

        if (!graphicsData.fillAA) {
            for (let i = 0; i < points.length; i += 2) {
                verts.push(points[i], points[i + 1]);
                joints.push(JOINT_TYPE.FILL);
            }
            return;
        }

        const {triangles} = graphicsData;
        len = points.length;

        for (let i = 0; i < triangles.length; i += 3) {
            //TODO: holes prev/next!!!
            let flag = 0;
            for (let j = 0; j < 3; j++) {
                const ind1 = triangles[i + j];
                const ind2 = triangles[i + (j + 1) % 3];
                if (pn[ind1 * 2] === ind2 || pn[ind1 * 2 + 1] === ind2) {
                    flag |= (1 << j);
                }
            }
            joints.push(JOINT_TYPE.FILL_EXPAND + flag);
            joints.push(JOINT_TYPE.NONE);
            joints.push(JOINT_TYPE.NONE);
            joints.push(JOINT_TYPE.NONE);
            joints.push(JOINT_TYPE.NONE);
            joints.push(JOINT_TYPE.NONE);
        }

        // bisect, re-using pn
        for (let ind = 0; ind < len / 2; ind++) {
            let prev = pn[ind * 2];
            let next = pn[ind * 2 + 1];
            let nx1 = (points[next * 2 + 1] - points[ind * 2 + 1]), ny1 = -(points[next * 2] - points[ind * 2]);
            let nx2 = (points[ind * 2 + 1] - points[prev * 2 + 1]), ny2 = -(points[ind * 2] - points[prev * 2]);
            let D1 = Math.sqrt(nx1 * nx1 + ny1 * ny1);
            nx1 /= D1;
            ny1 /= D1;
            let D2 = Math.sqrt(nx2 * nx2 + ny2 * ny2);
            nx2 /= D2;
            ny2 /= D2;

            let bx = (nx1 + nx2);
            let by = (ny1 + ny2);
            let D = bx * nx1 + by * ny1;
            if (Math.abs(D) < eps) {
                bx = nx1;
                by = ny1;
            } else {
                bx /= D;
                by /= D;
            }
            pn[ind * 2] = bx;
            pn[ind * 2 + 1] = by;
        }

        for (let i = 0; i < triangles.length; i += 3) {
            const prev = triangles[i];
            const ind = triangles[i + 1];
            const next = triangles[i + 2];
            let nx1 = (points[next * 2 + 1] - points[ind * 2 + 1]), ny1 = -(points[next * 2] - points[ind * 2]);
            let nx2 = (points[ind * 2 + 1] - points[prev * 2 + 1]), ny2 = -(points[ind * 2] - points[prev * 2]);

            let j1 = 1;
            if (nx1 * ny2 - nx2 * ny1 > 0.0) {
                j1 = 2;
            }

            for (let j = 0; j < 3; j++) {
                let ind = triangles[i + (j * j1) % 3];
                verts.push(points[ind * 2], points[ind * 2 + 1]);
            }
            for (let j = 0; j < 3; j++) {
                let ind = triangles[i + (j * j1) % 3];
                verts.push(pn[ind * 2], pn[ind * 2 + 1]);
            }
        }
    }
}
