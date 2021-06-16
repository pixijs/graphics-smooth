import {
    AbstractBatchRenderer, BatchGeometry,
    BatchShaderGenerator,
    IBatchFactoryOptions,
    Program, Renderer,
    Shader,
    UniformGroup
} from '@pixi/core';
import {Matrix} from '@pixi/math';

const vert = `
const float FILL = 1.0;
const float BEVEL = 4.0;
const float MITER = 8.0;
const float ROUND = 12.0;
const float JOINT_CAP_BUTT = 16.0;
const float JOINT_CAP_SQUARE = 18.0;
const float JOINT_CAP_ROUND = 20.0;

const float FILL_EXPAND = 24.0;

const float CAP_BUTT = 1.0;
const float CAP_SQUARE = 2.0;
const float CAP_ROUND = 3.0;
const float CAP_BUTT2 = 4.0;

const float MITER_LIMIT = 10.0;

precision highp float;
attribute vec2 aPrev;
attribute vec2 aPoint1;
attribute vec2 aPoint2;
attribute vec2 aNext;
attribute vec2 aLineStyle;
attribute float aVertexJoint;
attribute vec4 aColor;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec4 tint;

varying vec4 vSignedCoord;
varying vec4 vColor;
varying vec4 vDistance;
varying float vType;

uniform float resolution;
uniform float expand;

vec2 doBisect(vec2 norm, float len, vec2 norm2, float len2,
    float dy, float inner) {
    vec2 bisect = (norm + norm2) / 2.0;
    bisect /= dot(norm, bisect);
    vec2 shift = dy * bisect;
    if (inner > 0.5) {
        if (len < len2) {
            if (abs(dy * (bisect.x * norm.y - bisect.y * norm.x)) > len) {
                return dy * norm;
            }
        } else {
            if (abs(dy * (bisect.x * norm2.y - bisect.y * norm2.x)) > len2) {
                return dy * norm;
            }
        }
    }
    return dy * bisect;
}

void main(void){
    vec2 pointA = (translationMatrix * vec3(aPoint1, 1.0)).xy;
    vec2 pointB = (translationMatrix * vec3(aPoint2, 1.0)).xy;

    vec2 xBasis = pointB - pointA;
    float len = length(xBasis);
    vec2 norm = vec2(xBasis.y, -xBasis.x) / len;

    float type = floor(aVertexJoint / 16.0);
    float vertexNum = aVertexJoint - type * 16.0;
    float dx = 0.0, dy = 1.0;

    float capType = floor(type / 32.0);
    type -= capType * 32.0;

    float lineWidth = aLineStyle.x * 0.5;
    vec2 pos;

    if (capType == CAP_ROUND) {
        vertexNum += 4.0;
        type = JOINT_CAP_ROUND;
        capType = 0.0;
    }

    if (type == FILL) {
        pos = pointA;
        vDistance = vec4(0.0, -0.5, -0.5, 1.0);
        vType = 0.0;
    } else if (type >= FILL_EXPAND && type < FILL_EXPAND + 7.5) {
        // expand vertices
        float flags = type - FILL_EXPAND;
        float flag3 = floor(flags / 4.0);
        float flag2 = floor((flags - flag3 * 4.0) / 2.0);
        float flag1 = flags - flag3 * 4.0 - flag2 * 2.0;

        vec2 prev = (translationMatrix * vec3(aPrev, 1.0)).xy;

        if (vertexNum < 0.5) {
            pos = prev;
        } else if (vertexNum < 1.5) {
            pos = pointA;
        } else {
            pos = pointB;
        }
        float len2 = length(aNext);
        vec2 bisect = (translationMatrix * vec3(aNext, 0.0)).xy;
        if (len2 > 0.01) {
            bisect = normalize(bisect) * len2;
        }

        vec2 n1 = normalize(vec2(pointA.y - prev.y, -(pointA.x - prev.x)));
        vec2 n2 = normalize(vec2(pointB.y - pointA.y, -(pointB.x - pointA.x)));
        vec2 n3 = normalize(vec2(prev.y - pointB.y, -(prev.x - pointB.x)));

        if (n1.x * n2.y - n1.y * n2.x < 0.0) {
            n1 = -n1;
            n2 = -n2;
            n3 = -n3;
        }

        vDistance.w = 1.0;
        pos += bisect * expand;

        vDistance = vec4(16.0, 16.0, 16.0, -1.0);
        if (flag1 > 0.5) {
            vDistance.x = -dot(pos - prev, n1);
        }
        if (flag2 > 0.5) {
            vDistance.y = -dot(pos - pointA, n2);
        }
        if (flag3 > 0.5) {
            vDistance.z = -dot(pos - pointB, n3);
        }
        vDistance.xyz *= resolution;
        vType = 2.0;
    } else if (type >= BEVEL) {
        float dy = lineWidth + expand;
        float inner = 0.0;
        if (vertexNum >= 1.5) {
            dy = -dy;
            inner = 1.0;
        }

        vec2 base, next, xBasis2, bisect;
        float flag = 0.0;
        float sign2 = 1.0;
        if (vertexNum < 0.5 || vertexNum > 2.5 && vertexNum < 3.5) {
            next = (translationMatrix * vec3(aPrev, 1.0)).xy;
            base = pointA;
            flag = type - floor(type / 2.0) * 2.0;
            sign2 = -1.0;
        } else {
            next = (translationMatrix * vec3(aNext, 1.0)).xy;
            base = pointB;
            if (type >= MITER && type < MITER + 3.5) {
                flag = step(MITER + 1.5, type);
                // check miter limit here?
            }
        }
        xBasis2 = next - base;
        float len2 = length(xBasis2);
        vec2 norm2 = vec2(xBasis2.y, -xBasis2.x) / len2;
        float D = norm.x * norm2.y - norm.y * norm2.x;
        if (D < 0.0) {
            inner = 1.0 - inner;
        }
        norm2 *= sign2;
        float collinear = step(0.0, dot(norm, norm2));

        vType = 0.0;
        float dy2 = -0.5;
        float dy3 = -0.5;

        if (abs(D) < 0.01 && collinear < 0.5) {
            if (type >= ROUND && type < ROUND + 1.5) {
                type = JOINT_CAP_ROUND;
            }
            //TODO: BUTT here too
        }

        if (vertexNum < 3.5) {
            if (abs(D) < 0.01) {
                pos = dy * norm;
            } else {
                if (flag < 0.5 && inner < 0.5) {
                    pos = dy * norm;
                } else {
                    pos = doBisect(norm, len, norm2, len2, dy, inner);
                }
            }
            if (capType >= CAP_BUTT && capType < CAP_ROUND) {
                vec2 back = -vec2(-norm.y, norm.x);
                float extra = step(CAP_SQUARE, capType) * lineWidth;
                if (vertexNum < 0.5 || vertexNum > 2.5) {
                    pos += back * (expand + extra);
                    dy2 = expand;
                } else {
                    dy2 = dot(pos + base - pointA, back) - extra;
                }
            }
            if (type >= JOINT_CAP_BUTT && type < JOINT_CAP_SQUARE + 0.5) {
                vec2 forward = vec2(-norm.y, norm.x);
                float extra = step(JOINT_CAP_SQUARE, type) * lineWidth;
                if (vertexNum < 0.5 || vertexNum > 2.5) {
                    dy3 = dot(pos + base - pointB, forward) - extra;
                } else {
                    pos += forward * (expand + extra);
                    dy3 = expand;
                    if (capType >= CAP_BUTT) {
                        dy2 -= expand + extra;
                    }
                }
            }
        } else if (type >= JOINT_CAP_ROUND && type < JOINT_CAP_ROUND + 1.5) {
            if (inner > 0.5) {
                dy = -dy;
                inner = 0.0;
            }
            vec2 d2 = abs(dy) * vec2(-norm.y, norm.x);
            if (vertexNum < 4.5) {
                dy = -dy;
                pos = dy * norm;
            } else if (vertexNum < 5.5) {
                pos = dy * norm;
            } else if (vertexNum < 6.5) {
                pos = dy * norm + d2;
            } else {
                dy = -dy;
                pos = dy * norm + d2;
            }
            dy = -0.5;
            dy2 = pos.x;
            dy3 = pos.y;
            vType = 3.0;
        } else if (abs(D) < 0.01) {
            pos = dy * norm;
        } else {
            if (type >= ROUND && type < ROUND + 1.5) {
                if (inner > 0.5) {
                    dy = -dy;
                    inner = 0.0;
                }
                if (vertexNum < 4.5) {
                    pos = doBisect(norm, len, norm2, len2, -dy, 1.0);
                } else if (vertexNum < 5.5) {
                    pos = dy * norm;
                } else if (vertexNum > 7.5) {
                    pos = dy * norm2;
                } else {
                    pos = doBisect(norm, len, norm2, len2, dy, 0.0);
                    float d2 = abs(dy);
                    if (length(pos) > abs(dy) * 1.5) {
                        if (vertexNum < 6.5) {
                            pos.x = dy * norm.x - d2 * norm.y;
                            pos.y = dy * norm.y + d2 * norm.x;
                        } else {
                            pos.x = dy * norm2.x + d2 * norm2.y;
                            pos.y = dy * norm2.y - d2 * norm2.x;
                        }
                    }
                }
                vec2 norm3 = normalize(norm - norm2);
                dy = pos.x * norm3.y - pos.y * norm3.x - 3.0;
                dy2 = pos.x;
                dy3 = pos.y;
                vType = 3.0;
            } else {
                if (type >= MITER && type < MITER + 3.5) {
                    if (inner > 0.5) {
                        dy = -dy;
                        inner = 0.0;
                    }
                    float sign = step(0.0, dy) * 2.0 - 1.0;
                    pos = doBisect(norm, len, norm2, len2, dy, 0.0);
                    if (length(pos) > abs(dy) * MITER_LIMIT) {
                        type = BEVEL;
                    } else {
                        if (vertexNum < 4.5) {
                            dy = -dy;
                            pos = doBisect(norm, len, norm2, len2, dy, 1.0);
                        } else if (vertexNum < 5.5) {
                            pos = dy * norm;
                        } else if (vertexNum > 6.5) {
                            pos = dy * norm2;
                            // dy = ...
                        }
                    }
                    vType = 1.0;
                    dy2 = sign * dot(pos, norm) - lineWidth;
                    dy3 = sign * dot(pos, norm2) - lineWidth;
                }
                if (type >= BEVEL && type < BEVEL + 1.5) {
                    if (inner < 0.5) {
                        dy = -dy;
                        inner = 1.0;
                    }
                    vec2 norm3 = normalize((norm + norm2) / 2.0);
                    if (vertexNum < 4.5) {
                        pos = doBisect(norm, len, norm2, len2, dy, 1.0);
                        dy2 = -abs(dot(pos + dy * norm, norm3));
                    } else {
                        dy2 = 0.0;
                        dy = -dy;
                        if (vertexNum < 5.5) {
                            pos = dy * norm;
                        } else {
                            pos = dy * norm2;
                        }
                    }
                }
            }
        }

        pos += base;
        vDistance = vec4(dy, dy2, dy3, lineWidth) * resolution;
    }

    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);

    vColor = aColor * tint;
}`;

const frag = `
varying vec4 vColor;
varying vec4 vDistance;
varying float vType;

//%forloop% %count%

void main(void){
    float alpha = 1.0;
    if (vType < 0.5) {
        float left = max(vDistance.x - 0.5, -vDistance.w);
        float right = min(vDistance.x + 0.5, vDistance.w);
        float near = vDistance.y - 0.5;
        float far = min(vDistance.y + 0.5, 0.0);
        float top = vDistance.z - 0.5;
        float bottom = min(vDistance.z + 0.5, 0.0);
        alpha = max(right - left, 0.0) * max(bottom - top, 0.0) * max(far - near, 0.0);
    } else if (vType < 1.5) {
        float near = vDistance.y - 0.5;
        float far = min(vDistance.y + 0.5, 0.0);
        float top = vDistance.z - 0.5;
        float bottom = min(vDistance.z + 0.5, 0.0);
        alpha = max(bottom - top, 0.0) * max(far - near, 0.0);
    } else if (vType < 2.5) {
        alpha *= max(min(vDistance.x + 0.5, 1.0), 0.0);
        alpha *= max(min(vDistance.y + 0.5, 1.0), 0.0);
        alpha *= max(min(vDistance.z + 0.5, 1.0), 0.0);
    } else {
        float dist2 = sqrt(dot(vDistance.yz, vDistance.yz));
        float rad = vDistance.w;
        float left = max(dist2 - 0.5, -rad);
        float right = min(dist2 + 0.5, rad);
        // TODO: something has to be done about artifact at vDistance.x far side
        alpha = 1.0 - step(vDistance.x, 0.0) * (1.0 - max(right - left, 0.0));
    }

    gl_FragColor = vColor * alpha;
}
`;

export class SmoothShaderGenerator extends BatchShaderGenerator {
    generateShader(maxTextures: number): Shader {
        if (!this.programCache[maxTextures]) {
            this.programCache[maxTextures] = new Program(this.vertexSrc, this.fragTemplate);
        }

        const uniforms = {
            tint: new Float32Array([1, 1, 1, 1]),
            translationMatrix: new Matrix(),
            resolution: 1,
            expand: 1,
        };

        return new Shader(this.programCache[maxTextures], uniforms);
    }

}

export class SmoothRendererFactory {
    static create(options?: IBatchFactoryOptions): typeof AbstractBatchRenderer {
        const {vertex, fragment, vertexSize, geometryClass} = Object.assign({
            vertex: vert,
            fragment: frag,
            geometryClass: BatchGeometry,
            vertexSize: 11,
        }, options);

        return class BatchPlugin extends AbstractBatchRenderer {
            constructor(renderer: Renderer) {
                super(renderer);

                this.shaderGenerator = new SmoothShaderGenerator(vertex, fragment);
                this.geometryClass = geometryClass;
                this.vertexSize = vertexSize;
            }
        };
    }
}

export const SmoothRenderer = SmoothRendererFactory.create();
