import { LINE_CAP, LINE_JOIN } from '@pixi/graphics';
import { FillStyle } from './FillStyle';

export class LineStyle extends FillStyle
{
    width: number;
    alignment: number;

    cap: LINE_CAP;
    join: LINE_JOIN;
    miterLimit: number;

    clone(): LineStyle
    {
        return this.copyTo(new LineStyle());
    }

    copyTo(obj: any)
    {
        obj.color = this.color;
        obj.alpha = this.alpha;
        obj.texture = this.texture;
        obj.matrix = this.matrix;
        obj.visible = this.visible;
        obj.width = this.width;
        obj.alignment = this.alignment;
        obj.cap = this.cap;
        obj.join = this.join;
        obj.miterLimit = this.miterLimit;
        return obj;
    }

    reset()
    {
        super.reset();

        this.smooth = true;

        this.color = 0x0;

        this.width = 0;

        this.alignment = 0.5;

        this.cap = LINE_CAP.BUTT;
        this.join = LINE_JOIN.MITER;
        this.miterLimit = 10;
    }
}
