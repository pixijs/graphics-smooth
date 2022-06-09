import { SmoothGraphicsShader } from './SmoothShader';

const dashFrag = `%PRECISION%
varying vec4 vColor;
varying vec4 vLine1;
varying vec4 vLine2;
varying vec4 vArc;
varying float vType;
varying float vTextureId;
varying vec2 vTextureCoord;
varying vec2 vTravel;
uniform sampler2D uSamplers[%MAX_TEXTURES%];
uniform float dash;
uniform float gap;

%PIXEL_LINE%

void main(void){
    %PIXEL_COVERAGE%

    float d = dash * vTravel.y;
    if (d > 0.0) {
        float g = gap * vTravel.y;
        if (g > 0.0) {
            float t = mod(vTravel.x, d + g);
            alpha *= mix(
                min(0.5 * d + 0.5 - abs(t - 0.5 * d), 1.0),
                max(abs(t - 0.5 * g - d) - 0.5 * g + 0.5, 0.0),
                step(d, t)
            );
        }
    } else {
        alpha = 0.0;
    }

    vec4 texColor;
    float textureId = floor(vTextureId+0.5);
    %FOR_LOOP%

    gl_FragColor = vColor * texColor * alpha;
}
`;

export interface IDashParams {
    dash: number;
    gap: number;
}

export class DashLineShader extends SmoothGraphicsShader
{
    constructor(dashParams?: IDashParams)
    {
        const settings = { maxStyles: 16, maxTextures: 1, pixelLine: 1 };

        super(settings, undefined, dashFrag,
            dashParams || {
                dash: 8.0,
                gap: 5.0
            });
    }
}
