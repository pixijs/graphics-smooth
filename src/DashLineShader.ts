import { SmoothGraphicsProgram, SmoothGraphicsShader } from './SmoothShader';

const dashFrag = `
varying vec4 vColor;
varying vec4 vDistance;
varying float vType;
varying float vTextureId;
varying vec2 vTextureCoord;
varying float vTravel;
uniform sampler2D uSamplers[%MAX_TEXTURES%];
uniform float dash;
uniform float gap;

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
        const settings = { maxStyles: 16, maxTextures: 1 };

        super(settings, new SmoothGraphicsProgram(settings, undefined, dashFrag),
            dashParams || {
                dash: 5.0,
                gap: 8.0
            });
    }
}
