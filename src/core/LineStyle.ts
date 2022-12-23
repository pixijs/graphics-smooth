import { LINE_CAP, LINE_JOIN } from '@pixi/graphics';
import { FillStyle } from './FillStyle';

export enum LINE_SCALE_MODE
    {
    NONE = 'none',
    NORMAL = 'normal',
    HORIZONTAL = 'horizontal',
    VERTICAL = 'vertical',
}

export class LineStyle extends FillStyle
{
    width: number;
    alignment: number;

    cap: LINE_CAP;
    join: LINE_JOIN;
    miterLimit: number;
    scaleMode: LINE_SCALE_MODE;

    clone(): LineStyle
    {
        return this.copyTo(new LineStyle());
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    copyTo(obj: any): LineStyle
    {
        obj.color = this.color;
        obj.alpha = this.alpha;
        obj.texture = this.texture;
        obj.matrix = this.matrix;
        obj.shader = this.shader;
        obj.visible = this.visible;
        obj.width = this.width;
        obj.alignment = this.alignment;
        obj.cap = this.cap;
        obj.join = this.join;
        obj.miterLimit = this.miterLimit;
        obj.scaleMode = this.scaleMode;

        return obj;
    }

    /**
     * returns width multiplied by scaleMode
     */
    packLineScale(): number
    {
        switch (this.scaleMode)
        {
            case LINE_SCALE_MODE.NORMAL: return 1;
            case LINE_SCALE_MODE.HORIZONTAL: return 2;
            case LINE_SCALE_MODE.VERTICAL: return 3;
            default: return 0;
        }
    }

    reset(): void
    {
        super.reset();

        this.smooth = true;

        this.color = 0x0;

        this.width = 0;

        this.alignment = 0.5;

        this.cap = LINE_CAP.BUTT;
        this.join = LINE_JOIN.MITER;
        this.miterLimit = 10;
        this.scaleMode = LINE_SCALE_MODE.NORMAL;
    }
}
