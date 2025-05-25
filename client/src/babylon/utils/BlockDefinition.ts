import { AutoTileConfig } from "./AutoTileConfig";
import { BlockTextures } from "./BlockTextures";

export interface BlockDefinition { // Exporting if you manage this elsewhere
    id: string;         // e.g., "dev_ground_grass"
    isSolid: boolean;   // For culling faces against air/non-solid blocks
    textures: BlockTextures;
    autoTileTop?: AutoTileConfig; // Optional: Configuration for auto-tiling the top face
}