import { Program, Shader } from '@pixi/core';
import { IGraphicsBatchSettings } from './core/BatchDrawCall';

const smoothVert = `#version 100
precision highp float;
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

varying vec4 vLine1;
varying vec4 vLine2;
varying vec4 vArc;
varying float vType;

uniform float resolution;
uniform float expand;

// === style ===
attribute float aStyleId;
attribute vec4 aColor;

varying float vTextureId;
varying vec4 vColor;
varying vec2 vTextureCoord;
varying vec2 vTravel;

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

void main(void){
    vec2 pointA = (translationMatrix * vec3(aPoint1, 1.0)).xy;
    vec2 pointB = (translationMatrix * vec3(aPoint2, 1.0)).xy;

    vec2 xBasis = pointB - pointA;
    float len = length(xBasis);
    vec2 forward = xBasis / len;
    vec2 norm = vec2(forward.y, -forward.x);

    float type = floor(aVertexJoint / 16.0);
    float vertexNum = aVertexJoint - type * 16.0;
    float dx = 0.0, dy = 1.0;

    float capType = floor(type / 32.0);
    type -= capType * 32.0;

    int styleId = int(aStyleId + 0.5);
    float lineWidth = styleLine[styleId].x;
    vTextureId = floor(styleTextureId[styleId] / 4.0);
    float scaleMode = styleTextureId[styleId] - vTextureId * 4.0;
    float avgScale = 1.0;
    if (scaleMode > 2.5) {
        avgScale = length(translationMatrix * vec3(1.0, 0.0, 0.0));
    } else if (scaleMode > 1.5) {
        avgScale = length(translationMatrix * vec3(0.0, 1.0, 0.0));
    } else if (scaleMode > 0.5) {
        vec2 avgDiag = (translationMatrix * vec3(1.0, 1.0, 0.0)).xy;
        avgScale = sqrt(dot(avgDiag, avgDiag) * 0.5);
    }
    lineWidth *= 0.5 * avgScale;
    float lineAlignment = 2.0 * styleLine[styleId].y - 1.0;
    vTextureCoord = vec2(0.0);

    vec2 pos;

    if (capType == CAP_ROUND) {
        vertexNum += 4.0;
        type = JOINT_CAP_ROUND;
        capType = 0.0;
        lineAlignment = -lineAlignment;
    }

    vLine1 = vec4(0.0, 10.0, 1.0, 0.0);
    vLine2 = vec4(0.0, 10.0, 1.0, 0.0);
    vArc = vec4(0.0);
    if (type == FILL) {
        pos = pointA;
        vType = 0.0;
        vLine2 = vec4(-2.0, -2.0, -2.0, 0.0);
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
        pos += bisect * expand;

        vLine1 = vec4(16.0, 16.0, 16.0, -1.0);
        if (flag1 > 0.5) {
            vLine1.x = -dot(pos - prev, n1);
        }
        if (flag2 > 0.5) {
            vLine1.y = -dot(pos - pointA, n2);
        }
        if (flag3 > 0.5) {
            vLine1.z = -dot(pos - pointB, n3);
        }
        vLine1.xyz *= resolution;
        vType = 2.0;
    } else if (type >= BEVEL) {
        float dy = lineWidth + expand;
        float shift = lineWidth * lineAlignment;
        float inner = 0.0;
        if (vertexNum >= 1.5) {
            dy = -dy;
            inner = 1.0;
        }

        vec2 base, next, xBasis2, bisect;
        float flag = 0.0;
        float side2 = 1.0;
        if (vertexNum < 0.5 || vertexNum > 2.5 && vertexNum < 3.5) {
            next = (translationMatrix * vec3(aPrev, 1.0)).xy;
            base = pointA;
            flag = type - floor(type / 2.0) * 2.0;
            side2 = -1.0;
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

        norm2 *= side2;

        float collinear = step(0.0, dot(norm, norm2));

        vType = 0.0;
        float dy2 = -1000.0;

        if (abs(D) < 0.01 && collinear < 0.5) {
            if (type >= ROUND && type < ROUND + 1.5) {
                type = JOINT_CAP_ROUND;
            }
            //TODO: BUTT here too
        }

        vLine1 = vec4(0.0, lineWidth, max(abs(norm.x), abs(norm.y)), min(abs(norm.x), abs(norm.y)));
        vLine2 = vec4(0.0, lineWidth, max(abs(norm2.x), abs(norm2.y)), min(abs(norm2.x), abs(norm2.y)));

        if (vertexNum < 3.5) {
            if (abs(D) < 0.01 && collinear < 0.5) {
                pos = (shift + dy) * norm;
            } else {
                if (flag < 0.5 && inner < 0.5) {
                    pos = (shift + dy) * norm;
                } else {
                    pos = doBisect(norm, len, norm2, len2, shift + dy, inner);
                }
            }
            vLine2.y = -1000.0;
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
                    vLine2.y = dot(pos + base - pointB, forward) - extra;
                } else {
                    pos += forward * (expand + extra);
                    vLine2.y = expand;
                    if (capType >= CAP_BUTT) {
                        dy2 -= expand + extra;
                    }
                }
            }
        } else if (type >= JOINT_CAP_ROUND && type < JOINT_CAP_ROUND + 1.5) {
            base += shift * norm;
            if (inner > 0.5) {
                dy = -dy;
                inner = 0.0;
            }
            vec2 d2 = abs(dy) * forward;
            if (vertexNum < 4.5) {
                dy = -dy;
                pos = dy * norm;
            } else if (vertexNum < 5.5) {
                pos = dy * norm;
            } else if (vertexNum < 6.5) {
                pos = dy * norm + d2;
                vArc.x = abs(dy);
            } else {
                dy = -dy;
                pos = dy * norm + d2;
                vArc.x = abs(dy);
            }
            vLine2 = vec4(0.0, lineWidth * 2.0 + 10.0, 1.0  , 0.0); // forget about line2 with type=3
            vArc.y = dy;
            vArc.z = 0.0;
            vArc.w = lineWidth;
            vType = 3.0;
        } else if (abs(D) < 0.01 && collinear < 0.5) {
            pos = dy * norm;
        } else {
            if (inner > 0.5) {
                dy = -dy;
                inner = 0.0;
            }
            float side = sign(dy);
            vec2 norm3 = normalize(norm + norm2);

            if (type >= MITER && type < MITER + 3.5) {
                vec2 farVertex = doBisect(norm, len, norm2, len2, shift + dy, 0.0);
                if (length(farVertex) > abs(shift + dy) * MITER_LIMIT) {
                    type = BEVEL;
                }
            }

            if (vertexNum < 4.5) {
                pos = doBisect(norm, len, norm2, len2, shift - dy, 1.0);
            } else if (vertexNum < 5.5) {
                pos = (shift + dy) * norm;
            } else if (vertexNum > 7.5) {
                pos = (shift + dy) * norm2;
            } else {
                if (type >= ROUND && type < ROUND + 1.5) {
                    pos = doBisect(norm, len, norm2, len2, shift + dy, 0.0);
                    float d2 = abs(shift + dy);
                    if (length(pos) > abs(shift + dy) * 1.5) {
                        if (vertexNum < 6.5) {
                            pos.x = (shift + dy) * norm.x - d2 * norm.y;
                            pos.y = (shift + dy) * norm.y + d2 * norm.x;
                        } else {
                            pos.x = (shift + dy) * norm2.x + d2 * norm2.y;
                            pos.y = (shift + dy) * norm2.y - d2 * norm2.x;
                        }
                    }
                } else if (type >= MITER && type < MITER + 3.5) {
                    pos = doBisect(norm, len, norm2, len2, shift + dy, 0.0); //farVertex
                } else if (type >= BEVEL && type < BEVEL + 1.5) {
                    float d2 = side / resolution;
                    if (vertexNum < 6.5) {
                        pos = (shift + dy) * norm + d2 * norm3;
                    } else {
                        pos = (shift + dy) * norm2 + d2 * norm3;
                    }
                }
            }

            if (type >= ROUND && type < ROUND + 1.5) {
                vArc.x = side * dot(pos, norm3);
                vArc.y = pos.x * norm3.y - pos.y * norm3.x;
                vArc.z = dot(norm, norm3) * (lineWidth + side * shift);
                vArc.w = lineWidth + side * shift;
                vType = 3.0;
            } else if (type >= MITER && type < MITER + 3.5) {
                vType = 1.0;
            } else if (type >= BEVEL && type < BEVEL + 1.5) {
                vType = 4.0;
                vArc.z = dot(norm, norm3) * (lineWidth + side * shift) - side * dot(pos, norm3);
            }

            dy = side * (dot(pos, norm) - shift);
            dy2 = side * (dot(pos, norm2) - shift);
        }

        pos += base;
        vLine1.xy = vec2(dy, vLine1.y) * resolution;
        vLine2.xy = vec2(dy2, vLine2.y) * resolution;
        vArc = vArc * resolution;
        vTravel = vec2(aTravel * avgScale + dot(pos - pointA, vec2(-norm.y, norm.x)), avgScale);
    }

    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);

    vColor = aColor * tint;
}`;

const precision = `#version 100
#ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
#else
  precision mediump float;
#endif
`;

const smoothFrag = `%PRECISION%
varying vec4 vColor;
varying vec4 vLine1;
varying vec4 vLine2;
varying vec4 vArc;
varying float vType;
varying float vTextureId;
varying vec2 vTextureCoord;
varying vec2 vTravel;
uniform sampler2D uSamplers[%MAX_TEXTURES%];

%PIXEL_LINE%

void main(void){
    %PIXEL_COVERAGE%

    vec4 texColor;
    float textureId = floor(vTextureId+0.5);
    %FOR_LOOP%

    gl_FragColor = vColor * texColor * alpha;
}
`;

const pixelLineFunc = [`
float pixelLine(float x, float A, float B) {
    return clamp(x + 0.5, 0.0, 1.0);
}
`, `
float pixelLine(float x, float A, float B) {
    float y = abs(x), s = sign(x);
    if (y * 2.0 < A - B) {
        return 0.5 + s * y / A;
    }
    y -= (A - B) * 0.5;
    y = max(1.0 - y / B, 0.0);
    return (1.0 + s * (1.0 - y * y)) * 0.5;
    //return clamp(x + 0.5, 0.0, 1.0);
}
`];

const pixelCoverage = `float alpha = 1.0;
if (vType < 0.5) {
    float left = pixelLine(-vLine1.y - vLine1.x, vLine1.z, vLine1.w);
    float right = pixelLine(vLine1.y - vLine1.x, vLine1.z, vLine1.w);
    float near = vLine2.x - 0.5;
    float far = min(vLine2.x + 0.5, 0.0);
    float top = vLine2.y - 0.5;
    float bottom = min(vLine2.y + 0.5, 0.0);
    alpha = (right - left) * max(bottom - top, 0.0) * max(far - near, 0.0);
} else if (vType < 1.5) {
    float a1 = pixelLine(- vLine1.y - vLine1.x, vLine1.z, vLine1.w);
    float a2 = pixelLine(vLine1.y - vLine1.x, vLine1.z, vLine1.w);
    float b1 = pixelLine(- vLine2.y - vLine2.x, vLine2.z, vLine2.w);
    float b2 = pixelLine(vLine2.y - vLine2.x, vLine2.z, vLine2.w);
    alpha = a2 * b2 - a1 * b1;
} else if (vType < 2.5) {
    alpha *= max(min(vLine1.x + 0.5, 1.0), 0.0);
    alpha *= max(min(vLine1.y + 0.5, 1.0), 0.0);
    alpha *= max(min(vLine1.z + 0.5, 1.0), 0.0);
} else if (vType < 3.5) {
    float a1 = pixelLine(- vLine1.y - vLine1.x, vLine1.z, vLine1.w);
    float a2 = pixelLine(vLine1.y - vLine1.x, vLine1.z, vLine1.w);
    float b1 = pixelLine(- vLine2.y - vLine2.x, vLine2.z, vLine2.w);
    float b2 = pixelLine(vLine2.y - vLine2.x, vLine2.z, vLine2.w);
    float alpha_miter = a2 * b2 - a1 * b1;
    float alpha_plane = clamp(vArc.z - vArc.x + 0.5, 0.0, 1.0);
    float d = length(vArc.xy);
    float circle_hor = max(min(vArc.w, d + 0.5) - max(-vArc.w, d - 0.5), 0.0);
    float circle_vert = min(vArc.w * 2.0, 1.0);
    float alpha_circle = circle_hor * circle_vert;
    alpha = min(alpha_miter, max(alpha_circle, alpha_plane));
} else {
    float a1 = pixelLine(- vLine1.y - vLine1.x, vLine1.z, vLine1.w);
    float a2 = pixelLine(vLine1.y - vLine1.x, vLine1.z, vLine1.w);
    float b1 = pixelLine(- vLine2.y - vLine2.x, vLine2.z, vLine2.w);
    float b2 = pixelLine(vLine2.y - vLine2.x, vLine2.z, vLine2.w);
    alpha = a2 * b2 - a1 * b1;
    alpha *= clamp(vArc.z + 0.5, 0.0, 1.0);
}
`;

/**
 * @memberof PIXI.smooth
 */
export class SmoothGraphicsShader extends Shader
{
    settings: IGraphicsBatchSettings;

    constructor(settings: IGraphicsBatchSettings,
        vert = smoothVert,
        frag = smoothFrag,
        uniforms = {})
    {
        vert = SmoothGraphicsShader.generateVertexSrc(settings, vert);
        frag = SmoothGraphicsShader.generateFragmentSrc(settings, frag);

        const { maxStyles, maxTextures } = settings;
        const sampleValues = new Int32Array(maxTextures);

        for (let i = 0; i < maxTextures; i++)
        {
            sampleValues[i] = i;
        }
        super(Program.from(vert, frag), (Object as any).assign(uniforms, {
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

    static generateVertexSrc(settings: IGraphicsBatchSettings, vertexSrc = smoothVert): string
    {
        const { maxStyles, maxTextures } = settings;

        vertexSrc = vertexSrc.replace(/%MAX_TEXTURES%/gi, `${maxTextures}`)
            .replace(/%MAX_STYLES%/gi, `${maxStyles}`);

        return vertexSrc;
    }

    static generateFragmentSrc(settings: IGraphicsBatchSettings, fragmentSrc = smoothFrag): string
    {
        const { maxTextures, pixelLine } = settings;

        fragmentSrc = fragmentSrc.replace(/%PRECISION%/gi, precision)
            .replace(/%PIXEL_LINE%/gi, pixelLineFunc[pixelLine])
            .replace(/%PIXEL_COVERAGE%/gi, pixelCoverage)
            .replace(/%MAX_TEXTURES%/gi, `${maxTextures}`)
            .replace(/%FOR_LOOP%/gi, this.generateSampleSrc(maxTextures));

        return fragmentSrc;
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
