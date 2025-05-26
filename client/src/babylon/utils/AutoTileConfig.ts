import { UVRect } from "./UVRect";

export interface AutoTileConfig {
    atlasTexturePath: string;
    atlasDimensions: { tilesWide: number, tilesHigh: number };
    rules?: Map<number, UVRect>;
    defaultUVs?: UVRect;
}