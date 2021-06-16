import {BuildData} from './BuildData';
import {SmoothGraphicsData} from './SmoothGraphicsData';
import {JOINT_TYPE} from './const';

export class SegmentPacker {
    static vertsByJoint: Array<number> = [];

    strideFloats = 12;

    updateBufferSize(jointStart: number, jointLen: number, triangles: number, target: BuildData) {
        const {joints} = target;
        let foundTriangle = false;

        let vertexSize = 0;
        let indexSize = 0;
        for (let i = jointStart; i < jointStart + jointLen; i++) {
            const prevCap = joints[i] & ~31;
            const joint = joints[i] & 31;

            if (joint === JOINT_TYPE.FILL) {
                foundTriangle = true;
                vertexSize++;
                continue;
            }

            if (joint >= JOINT_TYPE.FILL_EXPAND) {
                vertexSize += 3;
                indexSize += 3;
                continue;
            }

            const vs = SegmentPacker.vertsByJoint[joint] + SegmentPacker.vertsByJoint[prevCap];
            if (vs >= 3) {
                vertexSize += vs;
                indexSize += (vs - 2) * 3;
            }
        }
        if (foundTriangle) {
            indexSize += triangles;
        }

        target.vertexSize += vertexSize;
        target.indexSize += indexSize;
    }

    bufferPos = 0;
    indexPos = 0;
    bufFloat: Float32Array;
    bufUint: Uint32Array;
    indices: Uint16Array;
    buildData: BuildData;

    beginPack(buildData: BuildData, bufFloat: Float32Array, bufUint: Uint32Array, indices: Uint16Array, bufferPos: number = 0, indexPos: number = 0) {
        this.buildData = buildData;
        this.bufFloat = bufFloat;
        this.bufUint = bufUint;
        this.indices = indices;
        this.bufferPos = bufferPos;
        this.indexPos = indexPos;
    }

    endPack() {
        this.buildData = null;
        this.bufFloat = null;
        this.bufUint = null;
        this.indices = null;
    }

    packInterleavedGeometry(jointStart: number, jointLen: number, triangles: number[],
                            lineStyle: number, color: number) {
        const {bufFloat, bufUint, indices, buildData, strideFloats} = this;
        const {joints, verts} = buildData;

        let bufPos = this.bufferPos;
        let indPos = this.indexPos;
        let index = this.bufferPos / this.strideFloats;

        let x1: number, y1: number, x2: number, y2: number, prevX: number, prevY: number, nextX: number, nextY: number;
        let type: number;
        let hasTriangle = false;

        for (let j = jointStart; j < jointStart + jointLen; j++) {
            const fullJoint = joints[j];
            const prevCap = joints[j] & ~31;
            const joint = joints[j] & 31;

            if (joint === JOINT_TYPE.FILL) {
                // just one vertex
                hasTriangle = true;
                x1 = verts[j * 2];
                y1 = verts[j * 2 + 1];
                bufFloat[bufPos] = x1;
                bufFloat[bufPos + 1] = y1;
                bufFloat[bufPos + 2] = x1;
                bufFloat[bufPos + 3] = y1;
                bufFloat[bufPos + 4] = x1;
                bufFloat[bufPos + 5] = y1;
                bufFloat[bufPos + 6] = x1;
                bufFloat[bufPos + 7] = y1;
                bufFloat[bufPos + 8] = 16 * joint;
                bufFloat[bufPos + 9] = 0;
                bufFloat[bufPos + 10] = 0;
                bufUint[bufPos + 11] = color;
                bufPos += strideFloats;
                continue;
            }

            if (joint >= JOINT_TYPE.FILL_EXPAND) {
                prevX = verts[j * 2];
                prevY = verts[j * 2 + 1];
                x1 = verts[j * 2 + 2];
                y1 = verts[j * 2 + 3];
                x2 = verts[j * 2 + 4];
                y2 = verts[j * 2 + 5];

                const bis = j + 3;
                for (let i = 0; i < 3; i++) {
                    bufFloat[bufPos] = prevX;
                    bufFloat[bufPos + 1] = prevY;
                    bufFloat[bufPos + 2] = x1;
                    bufFloat[bufPos + 3] = y1;
                    bufFloat[bufPos + 4] = x2;
                    bufFloat[bufPos + 5] = y2;
                    bufFloat[bufPos + 6] = verts[(bis + i) * 2];
                    bufFloat[bufPos + 7] = verts[(bis + i) * 2 + 1];
                    bufFloat[bufPos + 8] = 16 * fullJoint + i;
                    bufFloat[bufPos + 9] = 0;
                    bufFloat[bufPos + 10] = 0;
                    bufUint[bufPos + 11] = color;
                    bufPos += strideFloats;
                }

                indices[indPos] = index;
                indices[indPos + 1] = index + 1;
                indices[indPos + 2] = index + 2;
                indPos += 3;
                index += 3;
                continue;
            }

            const vs = SegmentPacker.vertsByJoint[joint] + SegmentPacker.vertsByJoint[prevCap];
            if (vs === 0) {
                continue;
            }
            x1 = verts[j * 2];
            y1 = verts[j * 2 + 1];
            x2 = verts[j * 2 + 2];
            y2 = verts[j * 2 + 3];
            //TODO: caps here
            prevX = verts[j * 2 - 2];
            prevY = verts[j * 2 - 1];

            if ((joint & ~2) !== JOINT_TYPE.JOINT_CAP_BUTT) {
                nextX = verts[j * 2 + 4];
                nextY = verts[j * 2 + 5];
            } else {
                nextX = x1;
                nextY = y1;
            }
            type = joint;

            for (let i = 0; i < vs; i++) {
                bufFloat[bufPos] = prevX;
                bufFloat[bufPos + 1] = prevY;
                bufFloat[bufPos + 2] = x1;
                bufFloat[bufPos + 3] = y1;
                bufFloat[bufPos + 4] = x2;
                bufFloat[bufPos + 5] = y2;
                bufFloat[bufPos + 6] = nextX;
                bufFloat[bufPos + 7] = nextY;
                bufFloat[bufPos + 8] = 16 * fullJoint + i;
                bufFloat[bufPos + 9] = lineStyle;
                bufFloat[bufPos + 10] = 0;
                bufUint[bufPos + 11] = color;
                bufPos += strideFloats;
            }

            indices[indPos] = index;
            indices[indPos + 1] = index + 1;
            indices[indPos + 2] = index + 2;
            indices[indPos + 3] = index;
            indices[indPos + 4] = index + 2;
            indices[indPos + 5] = index + 3;
            indPos += 6;
            for (let j = 5; j + 1 < vs; j++) {
                indices[indPos] = index + 4;
                indices[indPos + 1] = index + j;
                indices[indPos + 2] = index + j + 1;
                indPos += 3;
            }
            index += vs;
        }

        if (hasTriangle) {
            for (let i = 0; i < triangles.length; i++) {
                indices[indPos + i] = triangles[i] + index;
            }
            indPos += triangles.length;
        }

        this.bufferPos = bufPos;
        this.indexPos = indPos;
    }
}

const verts = SegmentPacker.vertsByJoint;
for (let i = 0; i < 256; i++)
    verts.push(0);
// simple fill
verts[JOINT_TYPE.FILL] = 1;

for (let i = 0; i < 8; i++) {
    verts[JOINT_TYPE.FILL_EXPAND + i] = 3;
}

// no caps for now
verts[JOINT_TYPE.JOINT_BEVEL] = 4 + 3;
verts[JOINT_TYPE.JOINT_BEVEL + 1] = 4 + 3;
verts[JOINT_TYPE.JOINT_BEVEL + 2] = 4 + 3;
verts[JOINT_TYPE.JOINT_BEVEL + 3] = 4 + 3;
verts[JOINT_TYPE.JOINT_ROUND] = 4 + 5;
verts[JOINT_TYPE.JOINT_ROUND + 1] = 4 + 5;
verts[JOINT_TYPE.JOINT_ROUND + 2] = 4 + 5;
verts[JOINT_TYPE.JOINT_ROUND + 3] = 4 + 5;
verts[JOINT_TYPE.JOINT_MITER] = 4 + 4;
verts[JOINT_TYPE.JOINT_MITER + 1] = 4 + 4;
verts[JOINT_TYPE.JOINT_MITER + 2] = 4;
verts[JOINT_TYPE.JOINT_MITER + 3] = 4;
verts[JOINT_TYPE.JOINT_CAP_BUTT] = 4;
verts[JOINT_TYPE.JOINT_CAP_BUTT + 1] = 4;
verts[JOINT_TYPE.JOINT_CAP_SQUARE] = 4;
verts[JOINT_TYPE.JOINT_CAP_SQUARE + 1] = 4;
verts[JOINT_TYPE.JOINT_CAP_ROUND] = 4 + 4;
verts[JOINT_TYPE.JOINT_CAP_ROUND + 1] = 4 + 4;

verts[JOINT_TYPE.CAP_ROUND] = 4;
