import { SmoothGraphicsProgram, SmoothGraphicsShader } from './SmoothShader';

const dashFrag = `%PRECISION%
varying vec4 vColor;
varying vec4 vLine1;
varying vec4 vLine2;
varying vec4 vArc;
varying float vType;
varying float vTextureId;
varying vec2 vTextureCoord;
varying float vTravel;
uniform sampler2D uSamplers[%MAX_TEXTURES%];
uniform float dash;
uniform float gap;

%PIXEL_LINE%

void main(void){
    %PIXEL_COVERAGE%

    if (dash + gap > 1.0)
    {
        float travel = mod(vTravel + gap * 0.5, dash + gap) - (gap * 0.5);
        float left = max(travel - 0.5, -0.5);
        float right = min(travel + 0.5, gap + 0.5);
        alpha *= max(0.0, right - left);
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

        super(settings, new SmoothGraphicsProgram(settings, undefined, dashFrag),
            dashParams || {
                dash: 5.0,
                gap: 8.0
            });
    }
}
