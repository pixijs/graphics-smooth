import {SHAPES} from '@pixi/math';
import {IShapeBuilder} from '../core/IShapeBuilder';
import {CircleBuilder} from './CircleBuilder';
import {RectangleBuilder} from './RectangleBuilder';
import {RoundedRectangleBuilder} from './RoundedRectangleBuilder';
import {PolyBuilder} from './PolyBuilder';

export const FILL_COMMANDS: Record<SHAPES, IShapeBuilder> = {
    [SHAPES.POLY]: new PolyBuilder(),
    [SHAPES.CIRC]: new CircleBuilder(),
    [SHAPES.ELIP]: new CircleBuilder(),
    [SHAPES.RECT]: new RectangleBuilder(),
    [SHAPES.RREC]: new RoundedRectangleBuilder()
};

export {CircleBuilder, RectangleBuilder, RoundedRectangleBuilder, PolyBuilder}
