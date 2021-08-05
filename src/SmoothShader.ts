import { Program, Shader } from '@pixi/core';
import { IGraphicsBatchSettings } from './core/BatchDrawCall';

const smoothVert = `precision highp float;
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

// === geom ===
attribute vec2 aPrev;
attribute vec2 aPoint1;
attribute vec2 aPoint2;
attribute vec2 aNext;
attribute float aVertexJoint;
attribute float aTravel;

uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
uniform vec4 tint;

varying vec4 vSignedCoord;
varying vec4 vDistance;
varying float vType;

uniform float resolution;
uniform float expand;

// === style ===
attribute float aStyleId;
attribute vec4 aColor;

varying float vTextureId;
varying vec4 vColor;
varying vec2 vTextureCoord;
varying float vTravel;

uniform vec2 styleLine[%MAX_STYLES%];
uniform vec3 styleMatrix[2 * %MAX_STYLES%];
uniform float styleTextureId[%MAX_STYLES%];
uniform vec2 samplerSize[%MAX_TEXTURES%];

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

float up;
float down;

void swap() {
    float tmp = up;
    up = down;
    down = tmp;
}

void main(void){
    vec2 pointA = (translationMatrix * vec3(aPoint1, 1.0)).xy;
    vec2 pointB = (translationMatrix * vec3(aPoint2, 1.0)).xy;

    vec2 xBasis = pointB - pointA;
    float len = length(xBasis);
    vec2 forward = xBasis / len;
    vec2 norm = vec2(forward.y, -forward.x);

    float type = floor(aVertexJoint / 16.0);
    float vertexNum = aVertexJoint - type * 16.0;

    vec2 avgDiag = (translationMatrix * vec3(1.0, 1.0, 0.0)).xy;
    float avgScale = sqrt(dot(avgDiag, avgDiag) * 0.5);

    float capType = floor(type / 32.0);
    type -= capType * 32.0;

    int styleId = int(aStyleId + 0.5);
    float lineWidth = styleLine[styleId].x;
    if (lineWidth < 0.0) {
        lineWidth = -lineWidth;
    } else {
        lineWidth = lineWidth * avgScale;
    }
    lineWidth *= 0.5;
    float lineAlignment = 2.0 * styleLine[styleId].y - 1.0;
    vTextureId = styleTextureId[styleId];
    vTextureCoord = vec2(0.0);

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

        vec2 vTexturePixel;
        vTexturePixel.x = dot(vec3(aPoint1, 1.0), styleMatrix[styleId * 2]);
        vTexturePixel.y = dot(vec3(aPoint1, 1.0), styleMatrix[styleId * 2 + 1]);
        vTextureCoord = vTexturePixel / samplerSize[int(vTextureId)];
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
        up = lineWidth * (1.0 + lineAlignment) + expand;
        down = lineWidth * (-1.0 + lineAlignment) - expand;
        float inner = 0.0;
        if (vertexNum >= 1.5) {
            swap();
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
/*
        if (abs(lineAlignment) > 0.01) {
            float shift = lineWidth * lineAlignment;
            pointA += norm * shift;
            pointB += norm * shift;
            if (abs(D) < 0.01) {
                base += norm * shift;
            } else {
                base += doBisect(norm, len, norm2, len2, shift, 0.0);
            }
        }
*/
        float collinear = step(0.0, dot(norm, norm2));

        vType = 0.0;
        float dy2 = -1000.0;
        float dy3 = -1000.0;

        if (abs(D) < 0.01 && collinear < 0.5) {
            if (type >= ROUND && type < ROUND + 1.5) {
                type = JOINT_CAP_ROUND;
            }
            //TODO: BUTT here too
        }

        if (vertexNum < 3.5) {
            if (abs(D) < 0.01) {
                pos = up * norm;
            } else {
                if (flag < 0.5 && inner < 0.5) {
                    pos = up * norm;
                } else {
                    pos = doBisect(norm, len, norm2, len2, up, inner);
                }
            }
            if (capType >= CAP_BUTT && capType < CAP_ROUND) {
                float extra = step(CAP_SQUARE, capType) * lineWidth;
                vec2 back = -forward;
                if (vertexNum < 0.5 || vertexNum > 2.5) {
                    pos += back * (expand + extra);
                    dy2 = expand;
                } else {
                    dy2 = dot(pos + base - pointA, back) - extra;
                }
            }
            if (type >= JOINT_CAP_BUTT && type < JOINT_CAP_SQUARE + 0.5) {
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
                swap();
                inner = 0.0;
            }
            vec2 d2 = abs(up) * vec2(-norm.y, norm.x);
            if (vertexNum < 4.5) {
                swap();
                pos = up * norm;
            } else if (vertexNum < 5.5) {
                pos = up * norm;
            } else if (vertexNum < 6.5) {
                pos = up * norm + d2;
            } else {
                swap();
                pos = up * norm + d2;
            }
            up = -0.5;
            dy2 = pos.x;
            dy3 = pos.y;
            vType = 3.0;
        } else if (abs(D) < 0.01) {
            pos = up * norm;
        } else {
            if (type >= ROUND && type < ROUND + 1.5) {
                if (inner > 0.5) {
                    swap();
                    inner = 0.0;
                }
                if (vertexNum < 4.5) {
                    pos = doBisect(norm, len, norm2, len2, -down, 1.0);
                } else if (vertexNum < 5.5) {
                    pos = up * norm;
                } else if (vertexNum > 7.5) {
                    pos = up * norm2;
                } else {
                    pos = doBisect(norm, len, norm2, len2, up, 0.0);
                    float d2 = abs(up);
                    if (length(pos) > abs(up) * 1.5) {
                        if (vertexNum < 6.5) {
                            pos.x = up * norm.x - d2 * norm.y;
                            pos.y = up * norm.y + d2 * norm.x;
                        } else {
                            pos.x = up * norm2.x + d2 * norm2.y;
                            pos.y = up * norm2.y - d2 * norm2.x;
                        }
                    }
                }
                vec2 norm3 = normalize(norm - norm2);
                up = pos.x * norm3.y - pos.y * norm3.x - 3.0;
                dy2 = pos.x;
                dy3 = pos.y;
                vType = 3.0;
            } else {
                if (type >= MITER && type < MITER + 3.5) {
                    if (inner > 0.5) {
                        swap();
                        inner = 0.0;
                    }
                    float sign = step(0.0, up) * 2.0 - 1.0;
                    pos = doBisect(norm, len, norm2, len2, up, 0.0);
                    if (length(pos) > abs(up) * MITER_LIMIT) {
                        type = BEVEL;
                    } else {
                        if (vertexNum < 4.5) {
                            swap();
                            pos = doBisect(norm, len, norm2, len2, up, 1.0);
                        } else if (vertexNum < 5.5) {
                            pos = up * norm;
                        } else if (vertexNum > 6.5) {
                            pos = up * norm2;
                            // up = ...
                        }
                    }
                    vType = 1.0;
                    up = -sign * dot(pos, norm);
                    dy2 = -sign * dot(pos, norm2);
                }
                if (type >= BEVEL && type < BEVEL + 1.5) {
                    if (inner < 0.5) {
                        swap();
                        inner = 1.0;
                    }
                    vec2 norm3 = normalize((norm + norm2) / 2.0);
                    if (vertexNum < 4.5) {
                        pos = doBisect(norm, len, norm2, len2, up, 1.0);
                        dy2 = -abs(dot(pos + up * norm, norm3));
                    } else {
                        dy2 = 0.0;
                        swap();
                        if (vertexNum < 5.5) {
                            pos = up * norm;
                        } else {
                            pos = up * norm2;
                        }
                    }
                }
            }
        }

        pos += base;
        vDistance = vec4(up - lineAlignment * lineWidth, dy2, dy3, lineWidth) * resolution;
        vTravel = aTravel * avgScale + dot(pos - pointA, vec2(-norm.y, norm.x));
    }

    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);

    vColor = aColor * tint;
}`;

const smoothFrag = `
varying vec4 vColor;
varying vec4 vDistance;
varying float vType;
varying float vTextureId;
varying vec2 vTextureCoord;
varying float vTravel;
uniform sampler2D uSamplers[%MAX_TEXTURES%];

void main(void){
    float alpha = 1.0;
    float lineWidth = vDistance.w;
    if (vType < 0.5) {
        float left = max(vDistance.x - 0.5, -vDistance.w);
        float right = min(vDistance.x + 0.5, vDistance.w);
        float near = vDistance.y - 0.5;
        float far = min(vDistance.y + 0.5, 0.0);
        float top = vDistance.z - 0.5;
        float bottom = min(vDistance.z + 0.5, 0.0);
        alpha = max(right - left, 0.0) * max(bottom - top, 0.0) * max(far - near, 0.0);
    } else if (vType < 1.5) {
        float a1 = clamp(vDistance.x + 0.5 - lineWidth, 0.0, 1.0);
        float a2 = clamp(vDistance.x + 0.5 + lineWidth, 0.0, 1.0);
        float b1 = clamp(vDistance.y + 0.5 - lineWidth, 0.0, 1.0);
        float b2 = clamp(vDistance.y + 0.5 + lineWidth, 0.0, 1.0);
        alpha = a2 * b2 - a1 * b1;
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

    vec4 texColor;
    float textureId = floor(vTextureId+0.5);
    %FOR_LOOP%

    gl_FragColor = vColor * texColor * alpha;
}
`;

export class SmoothGraphicsProgram extends Program
{
    settings: IGraphicsBatchSettings;

    constructor(settings: IGraphicsBatchSettings,
        vert = smoothVert,
        frag = smoothFrag,
        _uniforms = {})
    {
        const { maxStyles, maxTextures } = settings;

        vert = vert.replace(/%MAX_TEXTURES%/gi, `${maxTextures}`)
            .replace(/%MAX_STYLES%/gi, `${maxStyles}`);
        frag = frag.replace(/%MAX_TEXTURES%/gi, `${maxTextures}`)
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            .replace(/%FOR_LOOP%/gi, SmoothGraphicsShader.generateSampleSrc(maxTextures));

        super(vert, frag);
        this.settings = settings;
    }
}

export class SmoothGraphicsShader extends Shader
{
    settings: IGraphicsBatchSettings;

    constructor(settings: IGraphicsBatchSettings, prog = new SmoothGraphicsProgram(settings), uniforms = {})
    {
        const { maxStyles, maxTextures } = settings;
        const sampleValues = new Int32Array(maxTextures);

        for (let i = 0; i < maxTextures; i++)
        {
            sampleValues[i] = i;
        }
        super(prog, (Object as any).assign(uniforms, {
            styleMatrix: new Float32Array(6 * maxStyles),
            styleTextureId: new Float32Array(maxStyles),
            styleLine: new Float32Array(2 * maxStyles),
            samplerSize: new Float32Array(2 * maxTextures),
            uSamplers: sampleValues,
            tint: new Float32Array([1, 1, 1, 1]),
            resolution: 1,
            expand: 1,
        }));
        this.settings = settings;
    }

    static generateSampleSrc(maxTextures: number): string
    {
        let src = '';

        src += '\n';
        src += '\n';

        for (let i = 0; i < maxTextures; i++)
        {
            if (i > 0)
            {
                src += '\nelse ';
            }

            if (i < maxTextures - 1)
            {
                src += `if(textureId < ${i}.5)`;
            }

            src += '\n{';
            src += `\n\ttexColor = texture2D(uSamplers[${i}], vTextureCoord);`;
            src += '\n}';
        }

        src += '\n';
        src += '\n';

        return src;
    }
}
