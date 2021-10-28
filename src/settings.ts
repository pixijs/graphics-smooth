import { LINE_SCALE_MODE } from './core/LineStyle';

export interface ISettings {
    LINE_SCALE_MODE: string;
    SHADER_MAX_STYLES: number;
    SHADER_MAX_TEXTURES: number;
    PIXEL_LINE: number;
}

export const settings: ISettings = {
    LINE_SCALE_MODE: LINE_SCALE_MODE.NORMAL,
    SHADER_MAX_STYLES: 24,
    SHADER_MAX_TEXTURES: 4,
    PIXEL_LINE: 0,
};
