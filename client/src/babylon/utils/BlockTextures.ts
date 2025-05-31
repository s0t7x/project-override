import { TileMapTexture } from "./TileMapTexture";

export interface BlockTextures {
    side: string | TileMapTexture;       // Texture path for sides (and default for top/bottom)
    top?: string | TileMapTexture;      // Optional: Texture path for top
    bottom?: string | TileMapTexture;   // Optional: Texture path for bottom
}