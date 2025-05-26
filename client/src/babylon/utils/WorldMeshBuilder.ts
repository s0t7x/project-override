import * as BABYLON from '@babylonjs/core';
import { BlockDefinition } from './BlockDefinition';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';

export interface AutoTileConfig {
    atlasTexturePath: string;
    atlasDimensions: { tilesWide: number, tilesHigh: number }; // e.g., { tilesWide: 3, tilesHigh: 3 }
    // Future: could include a specific tile mapping if not global
}

// --- Helper functions for keys ---
function getVoxelKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
}

function getChunkKey(chunkX: number, chunkY: number, chunkZ: number): string {
    return `${chunkX},${chunkY},${chunkZ}`;
}

// --- Autotile Constants and Mappings ---
// This map defines which tile (col, row) in the 3x3 atlas to use based on a 4-bit NESW neighbor mask.
// Bit order: 1=N, 2=E, 4=S, 8=W (e.g., N=true, E=false, S=true, W=false -> 0101 = 5)
// Atlas visual layout assumed:
// (0,0)TL  (1,0)T   (2,0)TR
// (0,1)L   (1,1)C   (2,1)R
// (0,2)BL  (1,2)B   (2,2)BR
// 0,3IBR 1,3IBL
// 0,4ITR 1,4ITL
const AUTOTILE_NESW_TO_COORDS = new Map<number, { col: number, row: number }>([
    [0, { col: 1, row: 1 }], // Isolated                                                
    [1, { col: 1, row: 0 }], // N                                                           
    [2, { col: 0, row: 1 }], // E                    .---.---.---.                                       
    [3, { col: 0, row: 0 }], // NE                   |___|___|___|                           
    [4, { col: 1, row: 2 }], // S                    |___|___|___|                           
    [5, { col: 1, row: 1 }], // NS                   |___|___|___|                               
    [6, { col: 0, row: 2 }], // ES                   .---.---.---.                                           
    [7, { col: 0, row: 1 }], // NES                                                             
    [8, { col: 2, row: 1 }], // W                                                               
    [9, { col: 2, row: 0 }], // NW                                                              
    [10, { col: 1, row: 1 }], // EW                                                             
    [11, { col: 1, row: 0 }], // NEW                                                                
    [12, { col: 2, row: 2 }], // SW                                                             
    [13, { col: 2, row: 1 }], // NSW                                                                
    [14, { col: 1, row: 2 }], // ESW                                                                
    [15, { col: 1, row: 1 }], // NESW                                                           
]);

export class WorldMeshBuilder {
    private scene: BABYLON.Scene;
    private blockDefinitions: Map<string, BlockDefinition>;
    private voxelData: Map<string, IWorldBlock>; // Store IWorldBlock directly

    public readonly CHUNK_SIZE = 16; // Voxels per chunk dimension
    private chunks: Map<string, BABYLON.TransformNode>;
    private dirtyChunks: Set<string>;

    private materialCache: Map<string, BABYLON.StandardMaterial>;
    private textureCache: Map<string, BABYLON.Texture>;
    private baseMeshCache: Map<string, BABYLON.Mesh>; // Cache for source meshes for instancing

    constructor(scene: BABYLON.Scene, blockDefs: BlockDefinition[]) {
        this.scene = scene;
        this.blockDefinitions = new Map();
        blockDefs.forEach(def => this.blockDefinitions.set(def.id, def));

        this.voxelData = new Map();
        this.chunks = new Map();
        this.dirtyChunks = new Set();
        this.materialCache = new Map();
        this.textureCache = new Map();
        this.baseMeshCache = new Map();

        this.preloadTextures(); // It's good practice to preload
    }

    private preloadTextures() {
        const texturePaths = new Set<string>();
        this.blockDefinitions.forEach(def => {
            if (def.textures.side) texturePaths.add(def.textures.side);
            if (def.textures.top) texturePaths.add(def.textures.top);
            if (def.textures.bottom) texturePaths.add(def.textures.bottom);
            if (def.autoTileTop?.atlasTexturePath) texturePaths.add(def.autoTileTop.atlasTexturePath);
        });

        texturePaths.forEach(path => {
            if (path && !this.textureCache.has(path)) {
                const texture = new BABYLON.Texture(path, this.scene,
                    false, // noMipmap (can be true if textures are power of 2 and mipmapping desired)
                    true,  // invertY (usually true for Babylon)
                    BABYLON.Texture.NEAREST_SAMPLINGMODE // Pixelated look
                );
                texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE; // Good for atlases
                texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
                this.textureCache.set(path, texture);
            }
        });
    }

    private getMaterial(blockDef: BlockDefinition, faceType: 'top' | 'bottom' | 'side'): BABYLON.StandardMaterial {
        let texturePath: string | undefined;
        let materialKeySuffix: string; // To build the full key later
        const blockIdForLog = blockDef.id || 'UNKNOWN_BLOCK_ID'; // Safety for logging

        if (faceType === 'top') {
            if (blockDef.autoTileTop) {
                texturePath = blockDef.autoTileTop.atlasTexturePath;
                materialKeySuffix = `autotile_top_atlas_${texturePath}`; // Make key distinct for atlas material
                // console.log(`[WorldMeshBuilder] DEBUG: Block '${blockIdForLog}', Face 'top': Using autotile top texture '${texturePath}'`);
            } else {
                if (blockDef.textures.top) {
                    texturePath = blockDef.textures.top;
                    // console.log(`[WorldMeshBuilder] DEBUG: Block '${blockIdForLog}', Face 'top': Using specific top texture '${texturePath}'`);
                } else {
                    texturePath = blockDef.textures.side;
                    // console.log(`[WorldMeshBuilder] DEBUG: Block '${blockIdForLog}', Face 'top': Specific top texture missing, falling back to side texture '${texturePath}'`);
                }
                materialKeySuffix = `top_${texturePath}`;
            }
        } else if (faceType === 'bottom') {
            if (blockDef.textures.bottom) {
                texturePath = blockDef.textures.bottom;
                // console.log(`[WorldMeshBuilder] DEBUG: Block '${blockIdForLog}', Face 'bottom': Using specific bottom texture '${texturePath}'`);
            } else {
                texturePath = blockDef.textures.side;
                // console.log(`[WorldMeshBuilder] DEBUG: Block '${blockIdForLog}', Face 'bottom': Specific bottom texture missing, falling back to side texture '${texturePath}'`);
            }
            materialKeySuffix = `bottom_${texturePath}`;
        } else { // side
            texturePath = blockDef.textures.side;
            // No specific log for side needed unless it's also missing.
            materialKeySuffix = `side_${texturePath}`;
        }

        if (!texturePath) {
            // This case implies that for 'side', blockDef.textures.side was undefined,
            // or for 'top'/'bottom', both the specific and the fallback (side) were undefined.
            console.warn(`[WorldMeshBuilder] WARN: No texture path could be determined for block '${blockIdForLog}' face '${faceType}'. This usually means 'textures.side' (and possibly specific face texture) is missing. Using fallback magenta material.`);
            const fallbackMaterialKey = "fallback_magenta";
            if (this.materialCache.has(fallbackMaterialKey)) {
                return this.materialCache.get(fallbackMaterialKey)!;
            }
            const fallbackMat = new BABYLON.StandardMaterial(fallbackMaterialKey, this.scene);
            fallbackMat.diffuseColor = BABYLON.Color3.Magenta();
            this.materialCache.set(fallbackMaterialKey, fallbackMat);
            return fallbackMat;
        }

        const materialKey = `${blockDef.id}_${materialKeySuffix}`;

        if (this.materialCache.has(materialKey)) {
            return this.materialCache.get(materialKey)!;
        }

        const material = new BABYLON.StandardMaterial(materialKey, this.scene);
        const texture = this.textureCache.get(texturePath);

        if (texture) {
            material.diffuseTexture = texture;
            material.specularColor = new BABYLON.Color3(0, 0, 0); // No shininess
            if (texturePath.toLowerCase().endsWith(".png")) { // Basic transparency for PNGs
                if (material.diffuseTexture) material.diffuseTexture.hasAlpha = true; // Inform Babylon texture might have alpha
            }
        } else {
            console.warn(`[WorldMeshBuilder] WARN: Texture '${texturePath}' not found in textureCache for material key '${materialKey}'. Block '${blockIdForLog}', Face '${faceType}'. Using gray fallback color for this material.`);
            material.diffuseColor = BABYLON.Color3.Gray();
        }
        this.materialCache.set(materialKey, material);
        return material;
    }

    // --- Voxel Data Management ---
    public addBlock(blockInfo: IWorldBlock): void {
        const { x, y, z } = blockInfo.position;
        const key = getVoxelKey(x, y, z);
        this.voxelData.set(key, blockInfo);
        this.markChunkDirty(x, y, z);
        this.markNeighborChunksDirtyOnBoundary(x, y, z);
    }

    public removeBlock(x: number, y: number, z: number): void {
        const key = getVoxelKey(x, y, z);
        if (this.voxelData.has(key)) {
            this.voxelData.delete(key);
            this.markChunkDirty(x, y, z);
            this.markNeighborChunksDirtyOnBoundary(x, y, z);
        }
    }

    public loadInitialWorld(worldBlocks: IWorldBlock[]): void {
        console.log(`Loading initial world with ${worldBlocks.length} blocks.`);
        this.voxelData.clear(); // Clear existing data if any
        const allDirtyChunks = new Set<string>();

        worldBlocks.forEach(block => {
            if(block.explode) {
                const offX = block.explode.x / 2;
                const offY = block.explode.y / 2;
                const offZ = block.explode.z / 2;
                for(let i = 0; i <= block.explode.x; i++) {
                    for(let j = 0; j <= block.explode.y; j++) {
                        for(let k = 0; k <= block.explode.z; k++) {
                            const { x, y, z } = block.position;
                            const nx = Math.trunc(x + i - offX);
                            const ny = Math.trunc(y + j - offY);
                            const nz = Math.trunc(z + k - offZ);
                            const key = getVoxelKey(nx,ny,nz);
                            const ib: IWorldBlock = {
                                position: { x: nx,y:ny,z:nz},
                                type: block.type,
                                explode: undefined,
                                rotation: block.rotation || 0
                            }
                            this.voxelData.set(key, ib);

                            const { cx, cy, cz } = this.getChunkCoordinates(nx,ny,nz);
                            allDirtyChunks.add(getChunkKey(cx, cy, cz));
                        }
                    }
                }
                return;
            }
            const { x, y, z } = block.position;
            const key = getVoxelKey(x, y, z);
            this.voxelData.set(key, block);

            const { cx, cy, cz } = this.getChunkCoordinates(x, y, z);
            allDirtyChunks.add(getChunkKey(cx, cy, cz));
        });
        this.dirtyChunks = allDirtyChunks; // Set all chunks containing initial blocks as dirty
        this.update(); // Build all marked chunks
    }


    private markNeighborChunksDirtyOnBoundary(x: number, y: number, z: number): void {
        // If block is on the 'negative' side of a chunk boundary
        if (x % this.CHUNK_SIZE === 0) this.markChunkDirty(x - 1, y, z);
        if (y % this.CHUNK_SIZE === 0) this.markChunkDirty(x, y - 1, z);
        if (z % this.CHUNK_SIZE === 0) this.markChunkDirty(x, y, z - 1);

        // If block is on the 'positive' side of a chunk boundary
        // (CHUNK_SIZE - 1 because coords are 0-indexed)
        if ((x % this.CHUNK_SIZE) === (this.CHUNK_SIZE - 1)) this.markChunkDirty(x + 1, y, z);
        if ((y % this.CHUNK_SIZE) === (this.CHUNK_SIZE - 1)) this.markChunkDirty(x, y + 1, z);
        if ((z % this.CHUNK_SIZE) === (this.CHUNK_SIZE - 1)) this.markChunkDirty(x, y, z + 1);
    }


    private getVoxel(x: number, y: number, z: number): IWorldBlock | undefined {
        return this.voxelData.get(getVoxelKey(x, y, z));
    }

    private getBlockDefinition(type: string): BlockDefinition | undefined {
        return this.blockDefinitions.get(type);
    }

    private isVoxelSolid(x: number, y: number, z: number): boolean {
        const voxel = this.getVoxel(x, y, z);
        if (!voxel) return false; // Air (or unloaded area) is not solid
        const def = this.getBlockDefinition(voxel.type);
        return def ? def.isSolid : false;
    }

    private getChunkCoordinates(worldX: number, worldY: number, worldZ: number): { cx: number, cy: number, cz: number } {
        const cx = Math.floor(worldX / this.CHUNK_SIZE);
        const cy = Math.floor(worldY / this.CHUNK_SIZE);
        const cz = Math.floor(worldZ / this.CHUNK_SIZE);
        return { cx, cy, cz };
    }

    private markChunkDirty(worldX: number, worldY: number, worldZ: number): void {
        const { cx, cy, cz } = this.getChunkCoordinates(worldX, worldY, worldZ);
        this.dirtyChunks.add(getChunkKey(cx, cy, cz));
    }

    // --- Mesh Generation ---
    public update(): void {
        if (this.dirtyChunks.size > 0) {
            // console.log(`Rebuilding ${this.dirtyChunks.size} dirty chunks.`);
        }
        this.dirtyChunks.forEach(chunkKey => {
            const parts = chunkKey.split(',').map(Number);
            this.rebuildChunk(parts[0], parts[1], parts[2]);
        });
        this.dirtyChunks.clear();
    }

    private getAutotilePatternInfo(
        worldX: number,
        worldY: number,
        worldZ: number,
        blockDef: BlockDefinition
    ): { uv: BABYLON.Vector4, patternKey: string } | null {
        if (!blockDef.autoTileTop) return null;

        const selfType = blockDef.id;
        let mask = 0;

        const isSame = (x: number, y: number, z: number) => this.getVoxel(x, y, z)?.type === selfType;

        // NESW bitmask
        if (isSame(worldX, worldY, worldZ + 1)) mask |= 1; // N
        if (isSame(worldX + 1, worldY, worldZ)) mask |= 2; // E
        if (isSame(worldX, worldY, worldZ - 1)) mask |= 4; // S
        if (isSame(worldX - 1, worldY, worldZ)) mask |= 8; // W

        // Diagonal override logic
        const north = (mask & 1) !== 0;
        const east = (mask & 2) !== 0;
        const south = (mask & 4) !== 0;
        const west = (mask & 8) !== 0;

        const northeast = isSame(worldX + 1, worldY, worldZ + 1);
        const southeast = isSame(worldX + 1, worldY, worldZ - 1);
        const southwest = isSame(worldX - 1, worldY, worldZ - 1);
        const northwest = isSame(worldX - 1, worldY, worldZ + 1);

        const { atlasDimensions } = blockDef.autoTileTop;

        // Check for inner corner cases
        let tileCoords: { col: number, row: number } | undefined;

        let cornerKey: string = ''
        if (north && east && !northeast) {
            cornerKey = 'northeast'
            tileCoords = { col: 0, row: 3 }; // ITR
        } else if (north && west && !northwest) {
            cornerKey = 'northwest'
            tileCoords = { col: 1, row: 3 }; // ITL
        } else if (south && east && !southeast) {
            cornerKey = 'southeast'
            tileCoords = { col: 0, row: 4 }; // IBR
        } else if (south && west && !southwest) {
            cornerKey = 'southwest'
            tileCoords = { col: 1, row: 4 }; // IBL
        } else {
            tileCoords = AUTOTILE_NESW_TO_COORDS.get(mask);
        }

        if (!tileCoords) {
            console.warn(`[WorldMeshBuilder] Autotile: No coordinate mapping for mask ${mask} for block ${selfType}. Defaulting to center.`);
            return this.getAutotilePatternInfo(worldX, worldY, worldZ, { ...blockDef, id: "fallback_center_pattern" });
        }

        const u0 = tileCoords.col / atlasDimensions.tilesWide;
        const v0 = tileCoords.row / atlasDimensions.tilesHigh;
        const u1 = (tileCoords.col + 1) / atlasDimensions.tilesWide;
        const v1 = (tileCoords.row + 1) / atlasDimensions.tilesHigh;

        const uv = new BABYLON.Vector4(u0, v0, u1, v1);
        return { uv, patternKey: mask.toString() + cornerKey };
    }


    public rebuildChunk(chunkX: number, chunkY: number, chunkZ: number) {
        const chunkKey = getChunkKey(chunkX, chunkY, chunkZ);

        // Dispose previous chunk contents if they exist
        const oldChunkNode = this.chunks.get(chunkKey);
        if (oldChunkNode) {
            // Dispose all instanced meshes that are children of this node
            oldChunkNode.getChildMeshes(false, node => node instanceof BABYLON.InstancedMesh).forEach(instance => instance.dispose());
            oldChunkNode.dispose(); // Dispose the transform node itself
        }

        const chunkNodeName = `chunk_${chunkX}_${chunkY}_${chunkZ}`;
        const chunkRoot = new BABYLON.TransformNode(chunkNodeName, this.scene);
        chunkRoot.setPivotPoint(new BABYLON.Vector3(this.CHUNK_SIZE / 2, this.CHUNK_SIZE / 2, this.CHUNK_SIZE / 2));
        this.chunks.set(chunkKey, chunkRoot); // Store the new chunk node

        const BLOCK_SIZE = 2;

        for (let x = 0; x < this.CHUNK_SIZE; x++) {
            for (let y = 0; y < this.CHUNK_SIZE; y++) {
                for (let z = 0; z < this.CHUNK_SIZE; z++) {
                    const worldX = chunkX * this.CHUNK_SIZE + x;
                    const worldY = chunkY * this.CHUNK_SIZE + y;
                    const worldZ = chunkZ * this.CHUNK_SIZE + z;

                    const block = this.getVoxel(worldX, worldY, worldZ);
                    if (!block) continue;

                    const blockDef = this.getBlockDefinition(block.type);
                    if (!blockDef) {
                        console.warn(`Block definition not found for type: ${block.type} at ${worldX},${worldY},${worldZ}`);
                        continue;
                    }

                    // Culling: Skip block if all its faces are occluded by solid neighbors
                    if (
                        this.isVoxelSolid(worldX + 1, worldY, worldZ) &&
                        this.isVoxelSolid(worldX - 1, worldY, worldZ) &&
                        this.isVoxelSolid(worldX, worldY + 1, worldZ) &&
                        this.isVoxelSolid(worldX, worldY - 1, worldZ) &&
                        this.isVoxelSolid(worldX, worldY, worldZ + 1) &&
                        this.isVoxelSolid(worldX, worldY, worldZ - 1)
                    ) {
                        continue;
                    }

                    let baseMeshKey = block.type;
                    let autotileUVs: BABYLON.Vector4 | undefined = undefined;

                    if (blockDef.autoTileTop) {
                        const patternInfo = this.getAutotilePatternInfo(worldX, worldY, worldZ, blockDef);
                        if (patternInfo) baseMeshKey += `_auto_${patternInfo.patternKey}`;
                        autotileUVs = patternInfo?.uv;
                    }
                    let baseMesh = this.baseMeshCache.get(baseMeshKey);

                    if (!baseMesh) {
                        const matSide = this.getMaterial(blockDef, 'side');
                        const matTop = this.getMaterial(blockDef, 'top'); // Handles autoTile and fallbacks
                        const matBottom = this.getMaterial(blockDef, 'bottom'); // Handles fallbacks

                        let needsMultiMaterial = false;
                        if (matTop !== matSide || matBottom !== matSide) {
                            needsMultiMaterial = true;
                        }

                        // Define standard UV coordinates for each face (0,0 to 1,1)
                        // Face order: Back (-Z), Front (+Z), Right (+X), Left (-X), Top (+Y), Bottom (-Y)
                        const faceUVs = new Array<BABYLON.Vector4>(6);
                        for (let i = 0; i < 6; i++) {
                            faceUVs[i] = new BABYLON.Vector4(0, 0, 1, 1); // Default full UV for most faces
                        }

                        if (autotileUVs) {
                            faceUVs[4] = autotileUVs; // Index 4 is Top face (+Y)
                        }

                        const baseMeshName = "baseMesh_" + block.type; // Unique name for the mesh in the scene
                        baseMesh = BABYLON.MeshBuilder.CreateBox(baseMeshName, {
                            size: BLOCK_SIZE,
                            wrap: true,
                            faceUV: faceUVs, // Explicitly define UVs for each face
                            updatable: false
                        }, this.scene);

                        if (needsMultiMaterial) {
                            const multiMaterial = new BABYLON.MultiMaterial(baseMeshName + "_multiMat", this.scene);
                            // Standard face order for CreateBox: back, front, right, left, top, bottom
                            // Indices: 0 (-Z), 1 (+Z), 2 (+X), 3 (-X), 4 (+Y), 5 (-Y)
                            multiMaterial.subMaterials = [
                                matSide,   // Face 0: -Z (Back)
                                matSide,   // Face 1: +Z (Front)
                                matSide,   // Face 2: +X (Right)
                                matSide,   // Face 3: -X (Left)
                                matTop,    // Face 4: +Y (Top)
                                matBottom  // Face 5: -Y (Bottom)
                            ];
                            baseMesh.material = multiMaterial;
                            baseMesh.subMeshes = []
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(0, 0, 24, 0, 6, baseMesh));
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(1, 1, 24, 6, 6, baseMesh));
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(2, 2, 24, 12, 6, baseMesh));
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(3, 3, 24, 18, 6, baseMesh));
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(4, 4, 24, 24, 6, baseMesh)); // Top face
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(5, 5, 24, 30, 6, baseMesh)); // Bottom face - CORRECTED materialIndex

                        } else {
                            baseMesh.material = matSide; // All faces use the side material
                        }

                        baseMesh.setEnabled(false); // Disable rendering and interaction for the source mesh
                        baseMesh.doNotSyncBoundingInfo = true; // Optimization
                        baseMesh.isPickable = false;
                        baseMesh.freezeWorldMatrix(); // Source mesh's world matrix is static

                        this.baseMeshCache.set(baseMeshKey, baseMesh);
                    }

                    if (baseMesh) {
                        const instanceName = `cubeInstance_${worldX}_${worldY}_${worldZ}`;
                        const instance = baseMesh.createInstance(instanceName);

                        // Position instance so its center is at (worldX, worldY, worldZ) * BLOCK_SIZE.
                        // This means the center of the box is at that coordinate. This is usually fine.
                        instance.position.set(worldX * BLOCK_SIZE, worldY * BLOCK_SIZE, worldZ * BLOCK_SIZE);
                        instance.showBoundingBox = false;
                        // instance.doNotSyncBoundingInfo = true;
                        instance.parent = chunkRoot;
                        instance.isPickable = true; // Set pickable based on your needs
                        // instance.freezeWorldMatrix(); // Optional: if instances are static relative to the chunk root
                        instance.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_OPTIMISTIC_INCLUSION;

                    }
                }
            }
        }
        chunkRoot.computeWorldMatrix(true);
        // chunkRoot.freezeWorldMatrix();
    }

    public dispose(): void {
        this.chunks.forEach(node => { // Assuming node is TransformNode
            node.getChildMeshes(false, m => m instanceof BABYLON.InstancedMesh).forEach(instance => instance.dispose());
            node.dispose();
        });
        this.chunks.clear();

        this.baseMeshCache.forEach(mesh => mesh.dispose()); // Dispose base meshes (geometry only by default)
        this.baseMeshCache.clear();

        this.materialCache.forEach(mat => mat.dispose());
        this.materialCache.clear();
        this.textureCache.forEach(tex => tex.dispose());
        this.textureCache.clear();
        this.voxelData.clear();
        this.dirtyChunks.clear();
    }
}