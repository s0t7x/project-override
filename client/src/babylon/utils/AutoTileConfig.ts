import { UVRect } from "./UVRect";

export interface AutoTileConfig {
    atlasTexturePath: string;
    rules: Map<number, UVRect>; // Key: neighbor bitmask, Value: UVRect from atlas
    defaultUVs: UVRect;       // Fallback UVs
}