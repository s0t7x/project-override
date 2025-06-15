import * as BABYLON from '@babylonjs/core';
import { BlockDefinition } from './BlockDefinition';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';
import { TileMapTexture } from './TileMapTexture';

export const WORLD_BLOCK_LAYER = 0x2;

export interface AutoTileConfig {
    atlasTexturePath: string;
    atlasDimensions: { tilesWide: number, tilesHigh: number };
}

// --- Helper functions for keys ---
function getVoxelKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
}

// Renamed to avoid any potential naming conflicts, consistently using this for {cx,cy,cz} input
function getChunkKeyFromCoords(chunkX: number, chunkY: number, chunkZ: number): string {
    return `${chunkX},${chunkY},${chunkZ}`;
}

// --- Autotile Constants and Mappings ---
const AUTOTILE_NESW_TO_COORDS = new Map<number, { col: number, row: number }>([
    [0, { col: 1, row: 1 }], [1, { col: 1, row: 0 }], [2, { col: 0, row: 1 }], [3, { col: 0, row: 0 }],
    [4, { col: 1, row: 2 }], [5, { col: 1, row: 1 }], [6, { col: 0, row: 2 }], [7, { col: 0, row: 1 }],
    [8, { col: 2, row: 1 }], [9, { col: 2, row: 0 }], [10, { col: 1, row: 1 }], [11, { col: 1, row: 0 }],
    [12, { col: 2, row: 2 }], [13, { col: 2, row: 1 }], [14, { col: 1, row: 2 }], [15, { col: 1, row: 1 }],
]);

export class WorldMeshBuilder {
    private scene: BABYLON.Scene;
    private blockDefinitions: Map<string, BlockDefinition>;
    public voxelData: Map<string, IWorldBlock>;

    private shadowGenerator: BABYLON.ShadowGenerator | null = null;

    public readonly CHUNK_SIZE = 16;
    public readonly BLOCK_SIZE = 1; // Added for clarity and consistent use

    private chunks: Map<string, BABYLON.TransformNode>; // For visual meshes
    private dirtyChunks: Set<string>; // For visual mesh updates

    private materialCache: Map<string, BABYLON.StandardMaterial>;
    private textureCache: Map<string, BABYLON.Texture>;
    private baseMeshCache: Map<string, BABYLON.Mesh>;

    // --- Physics Related Members ---
    public chunkCollisionMeshes: Map<string, BABYLON.Mesh>;
    private chunkCollisionUpdateQueue: Set<string>;
    private isUpdatingChunkCollisions: boolean;

    private shadowOnlyMaterial: BABYLON.StandardMaterial;

    constructor(scene: BABYLON.Scene, blockDefs: BlockDefinition[], shadowGenerator?: BABYLON.ShadowGenerator) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator || null;

        this.shadowOnlyMaterial = new BABYLON.StandardMaterial("shadowOnlyMat", this.scene);
        this.shadowOnlyMaterial.disableColorWrite = true; // Don't draw color
        this.shadowOnlyMaterial.disableLighting = true;  // No need for lighting calculations
        
        this.blockDefinitions = new Map();
        blockDefs.forEach(def => this.blockDefinitions.set(def.id, def));

        this.voxelData = new Map();
        this.chunks = new Map();
        this.dirtyChunks = new Set();
        this.materialCache = new Map();
        this.textureCache = new Map();
        this.baseMeshCache = new Map();

        this.chunkCollisionMeshes = new Map();
        this.chunkCollisionUpdateQueue = new Set();
        this.isUpdatingChunkCollisions = false;
    }

// In WorldMeshBuilder.ts

private async preloadTextures(): Promise<void> {
    console.log("[WorldMeshBuilder] Collecting textures for preloading...");

    // 1. Gather all unique texture paths (this part is synchronous and fine)
    const texturePaths = new Set<string>();
    this.blockDefinitions.forEach(def => {
        if (def.textures.side) {
            texturePaths.add(typeof def.textures.side === 'string' ? def.textures.side : def.textures.side.texturePath);
        }
        if (def.textures.top) {
            texturePaths.add(typeof def.textures.top === 'string' ? def.textures.top : def.textures.top.texturePath);
        }
        if (def.textures.bottom) {
            texturePaths.add(typeof def.textures.bottom === 'string' ? def.textures.bottom : def.textures.bottom.texturePath);
        }
        if (def.autoTileTop?.atlasTexturePath) {
            texturePaths.add(def.autoTileTop.atlasTexturePath);
        }
    });

    // 2. Create an array to hold all the loading promises
    const loadingPromises: Promise<void>[] = [];

    // 3. Iterate through the paths and create a loading promise for each new texture
    texturePaths.forEach(path => {
        if (path && !this.textureCache.has(path)) {
            // Create a new Promise that will resolve when the texture's onLoadObservable fires
            const promise = new Promise<void>((resolve, reject) => {
                let filePath = '' + path;
                if ((process as any).resourcesPath && !path.startsWith('http')) {
                    filePath = (process as any).resourcesPath + '/app' + path;
                }

                console.log(`[WorldMeshBuilder] Starting to load texture: ${filePath}`);

                // The onError callback in the constructor is the best place to reject the promise
                const onError = (message?: string, exception?: any) => {
                    console.error(`Failed to load texture: ${filePath}`, message, exception);
                    reject(new Error(`Failed to load texture: ${filePath}. Reason: ${message}`));
                };
                
                const texture = new BABYLON.Texture(
                    filePath, 
                    this.scene, 
                    false, // noMipmap
                    true,  // invertY
                    BABYLON.Texture.NEAREST_SAMPLINGMODE,
                    null,  // We use the observable, so onLoad callback is null
                    onError
                );

                texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
                texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
                
                // When the texture is successfully loaded, resolve the promise
                texture.onLoadObservable.addOnce(() => {
                    console.log(`[WorldMeshBuilder] Successfully loaded: ${path}`);
                    // IMPORTANT: Add the texture to the cache *after* it has loaded
                    // to prevent other parts of the code from using an incomplete texture.
                    this.textureCache.set(path, texture);
                    resolve();
                });
            });

            loadingPromises.push(promise);
        }
    });

    if (loadingPromises.length > 0) {
        console.log(`[WorldMeshBuilder] Waiting for ${loadingPromises.length} textures to load...`);
        // 4. Wait for all the promises in the array to resolve
        await Promise.all(loadingPromises);
        console.log("[WorldMeshBuilder] All textures have been successfully preloaded.");
    } else {
        console.log("[WorldMeshBuilder] No new textures to preload.");
    }
}

    private getMaterial(blockDef: BlockDefinition, faceType: 'top' | 'bottom' | 'side'): BABYLON.StandardMaterial {
        let texturePath: string | undefined;
        let materialKeySuffix: string;
        const blockIdForLog = blockDef.id || 'UNKNOWN_BLOCK_ID';

        if (faceType === 'top') {
            if (blockDef.autoTileTop) {
                texturePath = blockDef.autoTileTop.atlasTexturePath;
                materialKeySuffix = `autotile_top_atlas_${texturePath}`;
            } else {
                if(blockDef.textures.top) {
                    if(typeof blockDef.textures.top === 'string') texturePath = blockDef.textures.top;
                    else {texturePath = blockDef.textures.top.texturePath; }
                    materialKeySuffix = `top_${texturePath}`;

                } else {
                    if(typeof blockDef.textures.side === 'string') texturePath = blockDef.textures.side;
                    else { texturePath = blockDef.textures.side.texturePath; }
                    materialKeySuffix = `top_fallback_side`;
                }
            }
        } else if (faceType === 'bottom') {
            if( blockDef.textures.bottom) {
                if(typeof blockDef.textures.bottom === 'string') texturePath = blockDef.textures.bottom;
                else { texturePath = blockDef.textures.bottom.texturePath; }
                materialKeySuffix = `bottom_${texturePath}`;
            } else {
                if(typeof blockDef.textures.side === 'string') texturePath = blockDef.textures.side;
                    else { texturePath = blockDef.textures.side.texturePath; }
                    materialKeySuffix = `bottom_fallback_side`;
            }
        } else { // side
            console.log(typeof blockDef.textures.side === 'string', typeof blockDef.textures.side, blockDef.textures.side)
            if(typeof blockDef.textures.side === 'string') texturePath = blockDef.textures.side;
            else {texturePath = blockDef.textures.side.texturePath; }
            materialKeySuffix = `side_${texturePath}`;
        }

        if (!texturePath) {
            console.warn(`[WorldMeshBuilder] WARN: No texture path for block '${blockIdForLog}' face '${faceType}'. Using fallback magenta.`);
            const fallbackMaterialKey = "fallback_magenta";
            if (this.materialCache.has(fallbackMaterialKey)) return this.materialCache.get(fallbackMaterialKey)!;
            const fallbackMat = new BABYLON.StandardMaterial(fallbackMaterialKey, this.scene);
            fallbackMat.diffuseColor = BABYLON.Color3.Magenta();
            this.materialCache.set(fallbackMaterialKey, fallbackMat);
            return fallbackMat;
        }

        const materialKey = `${blockDef.id}_${materialKeySuffix}`;
        if (this.materialCache.has(materialKey)) return this.materialCache.get(materialKey)!;

        const material = new BABYLON.StandardMaterial(materialKey, this.scene);
        material.maxSimultaneousLights = 3;
        const texture = this.textureCache.get(texturePath);
        if (texture) {
            material.diffuseTexture = texture;
            // material.useAlphaFromDiffuseTexture = true;
            // material.transparencyMode = 3;
            material.specularColor = new BABYLON.Color3(0, 0, 0);
            if (texturePath.toLowerCase().endsWith(".png") && material.diffuseTexture) {
                material.diffuseTexture.hasAlpha = false;
            }
        } else {
            console.warn(`[WorldMeshBuilder] WARN: Texture '${texturePath}' not found for material key '${materialKey}'. Block '${blockIdForLog}', Face '${faceType}'. Using gray fallback.`);
            material.diffuseColor = BABYLON.Color3.Gray();
        }
        this.materialCache.set(materialKey, material);
        return material;
    }

    public addBlock(blockInfo: IWorldBlock): void {
        const { x, y, z } = blockInfo.position;
        const key = getVoxelKey(x, y, z);
        this.voxelData.set(key, blockInfo);
        this.markChunkDirty(x, y, z, true);
        this.markNeighborChunksDirtyOnBoundary(x, y, z, true);
    }

    public removeBlock(x: number, y: number, z: number): void {
        const key = getVoxelKey(x, y, z);
        if (this.voxelData.has(key)) {
            this.voxelData.delete(key);
            this.markChunkDirty(x, y, z, true);
            this.markNeighborChunksDirtyOnBoundary(x, y, z, true);
        }
    }

    // In WorldMeshBuilder.ts

    public async loadInitialWorld(worldBlocks: IWorldBlock[]): Promise<void> {
        console.log(`[WorldMeshBuilder] Raw worldBlocks loaded:`, JSON.parse(JSON.stringify(worldBlocks)));
        await this.preloadTextures()
        this.voxelData.clear();
        const allDirtyChunkKeys = new Set<string>();

        worldBlocks.forEach(block => {
            console.log(`[WorldMeshBuilder] Processing initial block:`, JSON.parse(JSON.stringify(block))); // Log each block from JSON

            if (block.explode) {
                console.log(`[WorldMeshBuilder] Block has EXPLODE:`, block.explode);
                // const offX = block.explode.x / 2; // This was likely an issue with non-integer offsets for trunc
                // const offY = block.explode.y / 2;
                // const offZ = block.explode.z / 2;
                const sizeX = block.explode.x; // Use this as total size
                const sizeY = block.explode.y;
                const sizeZ = block.explode.z;

                // The center of the explosion is block.position
                // We want to iterate from center - size/2 to center + size/2
                const startX = block.position.x - Math.floor(sizeX / 2);
                const startY = block.position.y - Math.floor(sizeY / 2); // Assuming y:0 means a flat plane of blocks
                const startZ = block.position.z - Math.floor(sizeZ / 2);

                const endX = startX + sizeX;
                const endY = startY + sizeY;
                const endZ = startZ + sizeZ;

                console.log(`[WorldMeshBuilder] Explode Iteration Range: X[${startX} to ${endX}], Y[${startY} to ${endY}], Z[${startZ} to ${endZ}]`);


                // Original loop was: for (let i = 0; i <= block.explode.x; i++)
                // This iterates block.explode.x + 1 times.
                // If explode.x = 3, this means 4 blocks wide.
                // If explode.x is meant to be the *total width*, the loop should be i < block.explode.x

                // Let's re-evaluate the explode logic based on the new understanding
                // If block.explode = {x:3, y:0, z:3} means a 3x1x3 platform centered at block.position

                for (let i = 0; i <= sizeX; i++) { // If sizeX=3, this is 0,1,2,3 (4 iterations) - IS THIS INTENDED?
                    // If it's meant to be total width 3, should be i < sizeX for 0,1,2 (3 iterations)
                    for (let j = 0; j <= sizeY; j++) { // If sizeY=0, this is j=0 (1 iteration) - Correct for flat
                        for (let k = 0; k <= sizeZ; k++) { // If sizeZ=3, this is k=0,1,2,3 (4 iterations)

                            // The original logic for nx, ny, nz seemed to add an offset. Let's use the calculated start + iterators
                            const nx = startX + i;
                            const ny = startY + j;
                            const nz = startZ + k;

                            const currentBlockKey = getVoxelKey(nx, ny, nz);
                            const ib: IWorldBlock = {
                                position: { x: nx, y: ny, z: nz },
                                type: block.type,
                                rotation: block.rotation || 0
                            };
                            this.voxelData.set(currentBlockKey, ib);
                            const { cx, cy, cz } = this.getChunkCoordinates(nx, ny, nz);
                            allDirtyChunkKeys.add(getChunkKeyFromCoords(cx, cy, cz));
                        }
                    }
                }
                // return; // This return was problematic if there were other non-exploding blocks after an exploding one.
                // Let's remove it to process all blocks in worldBlocks.
            } else { // Handle non-exploding blocks
                const { x, y, z } = block.position;
                const currentBlockKey = getVoxelKey(x, y, z);
                this.voxelData.set(currentBlockKey, block); // Store the original block info
                const { cx, cy, cz } = this.getChunkCoordinates(x, y, z);
                allDirtyChunkKeys.add(getChunkKeyFromCoords(cx, cy, cz));
            }
        });

        console.log(`[WorldMeshBuilder] VoxelData populated. Size: ${this.voxelData.size}`);

        allDirtyChunkKeys.forEach(chunkKey => {
            this.dirtyChunks.add(chunkKey);
            if (this.scene.getPhysicsEngine()) {
                this.chunkCollisionUpdateQueue.add(chunkKey);
            }
        });
        console.log(`[WorldMeshBuilder] Initial dirty visual chunks:`, Array.from(this.dirtyChunks));

        await this.update();
        console.log("[WorldMeshBuilder] Initial world loading processing finished.");
    }

    private markNeighborChunksDirtyOnBoundary(x: number, y: number, z: number, alsoMarkForCollision: boolean): void {
        // Original logic for determining which neighbors are in other chunks.
        // Pass 'alsoMarkForCollision' to the markChunkDirty calls.
        if (x % this.CHUNK_SIZE === 0) this.markChunkDirty(x - 1, y, z, alsoMarkForCollision);
        if (y % this.CHUNK_SIZE === 0) this.markChunkDirty(x, y - 1, z, alsoMarkForCollision);
        if (z % this.CHUNK_SIZE === 0) this.markChunkDirty(x, y, z - 1, alsoMarkForCollision);

        if ((x % this.CHUNK_SIZE) === (this.CHUNK_SIZE - 1)) this.markChunkDirty(x + 1, y, z, alsoMarkForCollision);
        if ((y % this.CHUNK_SIZE) === (this.CHUNK_SIZE - 1)) this.markChunkDirty(x, y + 1, z, alsoMarkForCollision);
        if ((z % this.CHUNK_SIZE) === (this.CHUNK_SIZE - 1)) this.markChunkDirty(x, y, z + 1, alsoMarkForCollision);
    }

    public getVoxel(x: number, y: number, z: number): IWorldBlock | undefined {
        return this.voxelData.get(getVoxelKey(x, y, z));
    }

    private getBlockDefinition(type: string): BlockDefinition | undefined {
        return this.blockDefinitions.get(type);
    }

    public isVoxelSolid(x: number, y: number, z: number): boolean {
        const voxel = this.getVoxel(x, y, z);
        if (!voxel) return false;
        const def = this.getBlockDefinition(voxel.type);
        return def ? def.isSolid : false;
    }

    private getChunkCoordinates(worldX: number, worldY: number, worldZ: number): { cx: number, cy: number, cz: number } {
        const cx = Math.floor(worldX / this.CHUNK_SIZE);
        const cy = Math.floor(worldY / this.CHUNK_SIZE);
        const cz = Math.floor(worldZ / this.CHUNK_SIZE);
        return { cx, cy, cz };
    }

    private markChunkDirty(worldX: number, worldY: number, worldZ: number, alsoMarkForCollision: boolean): void {
        const { cx, cy, cz } = this.getChunkCoordinates(worldX, worldY, worldZ);
        const chunkKey = getChunkKeyFromCoords(cx, cy, cz);
        this.dirtyChunks.add(chunkKey); // Mark for visual update
        if (alsoMarkForCollision && this.scene.getPhysicsEngine()) {
            this.chunkCollisionUpdateQueue.add(chunkKey); // Mark for physics update
        }
    }

    public async update(): Promise<void> {
        if (this.dirtyChunks.size > 0) {
            // console.log(`[WorldMeshBuilder] Rebuilding ${this.dirtyChunks.size} dirty visual chunks.`);
            this.dirtyChunks.forEach(chunkKey => {
                const parts = chunkKey.split(',').map(Number);
                this.rebuildChunk(parts[0], parts[1], parts[2]);
            });
            this.dirtyChunks.clear();
        }

        // Ensure physics processing is awaited
        if (this.scene.getPhysicsEngine() && this.chunkCollisionUpdateQueue.size > 0) {
            await this.processChunkCollisionUpdateQueue();
        }
    }

    private getAutotilePatternInfo(
        worldX: number, worldY: number, worldZ: number, blockDef: BlockDefinition
    ): { uv: BABYLON.Vector4, patternKey: string } | null {
        if (!blockDef.autoTileTop) return null;

        const selfType = blockDef.id;
        let mask = 0;
        const isSameTypeNeighbor = (x: number, y: number, z: number) => this.getVoxel(x, y, z)?.type === selfType;

        if (isSameTypeNeighbor(worldX, worldY, worldZ + 1)) mask |= 1; // N
        if (isSameTypeNeighbor(worldX + 1, worldY, worldZ)) mask |= 2; // E
        if (isSameTypeNeighbor(worldX, worldY, worldZ - 1)) mask |= 4; // S
        if (isSameTypeNeighbor(worldX - 1, worldY, worldZ)) mask |= 8; // W

        const north = (mask & 1) !== 0;
        const east = (mask & 2) !== 0;
        const south = (mask & 4) !== 0;
        const west = (mask & 8) !== 0;

        const northeastOpen = !isSameTypeNeighbor(worldX + 1, worldY, worldZ + 1);
        const southeastOpen = !isSameTypeNeighbor(worldX + 1, worldY, worldZ - 1);
        const southwestOpen = !isSameTypeNeighbor(worldX - 1, worldY, worldZ - 1);
        const northwestOpen = !isSameTypeNeighbor(worldX - 1, worldY, worldZ + 1);

        const { atlasDimensions } = blockDef.autoTileTop;
        let tileCoords: { col: number, row: number } | undefined;
        let cornerKeySuffix: string = '';

        if (north && east && northeastOpen) { cornerKeySuffix = '_itr'; tileCoords = { col: 0, row: 3 }; }
        else if (north && west && northwestOpen) { cornerKeySuffix = '_itl'; tileCoords = { col: 1, row: 3 }; }
        else if (south && east && southeastOpen) { cornerKeySuffix = '_ibr'; tileCoords = { col: 0, row: 4 }; }
        else if (south && west && southwestOpen) { cornerKeySuffix = '_ibl'; tileCoords = { col: 1, row: 4 }; }
        else { tileCoords = AUTOTILE_NESW_TO_COORDS.get(mask); }

        if (!tileCoords) {
            console.warn(`[WorldMeshBuilder] Autotile: No coord mapping for mask ${mask} for block ${selfType}. Defaulting to center tile.`);
            tileCoords = AUTOTILE_NESW_TO_COORDS.get(0); // Fallback to isolated tile
            if (!tileCoords) return null; // Should not happen if AUTOTILE_NESW_TO_COORDS is complete
        }

        const u0 = tileCoords.col / atlasDimensions.tilesWide;
        const v0 = tileCoords.row / atlasDimensions.tilesHigh;
        const u1 = (tileCoords.col + 1) / atlasDimensions.tilesWide;
        const v1 = (tileCoords.row + 1) / atlasDimensions.tilesHigh;

        return { uv: new BABYLON.Vector4(u0, v0, u1, v1), patternKey: mask.toString() + cornerKeySuffix };
    }

    public rebuildChunk(chunkX: number, chunkY: number, chunkZ: number) {
        const chunkKey = getChunkKeyFromCoords(chunkX, chunkY, chunkZ);

        const oldChunkNode = this.chunks.get(chunkKey);
        if (oldChunkNode) {
            oldChunkNode.getChildMeshes(false, node => node instanceof BABYLON.InstancedMesh).forEach(instance => instance.dispose());
            oldChunkNode.dispose();
        }

        const chunkNodeName = `chunk_${chunkX}_${chunkY}_${chunkZ}`;
        const chunkRoot = new BABYLON.TransformNode(chunkNodeName, this.scene);
        // Original pivot logic. If instances are parented with world positions, chunkRoot position could be (0,0,0).
        // If instances were positioned locally, then chunkRoot.position would be world corner of chunk.
        // The original setPivotPoint was likely for rotating the entire chunk visual around its center.
        // Let's keep chunkRoot at (0,0,0) and instances use world coords.
        // chunkRoot.setPivotPoint(new BABYLON.Vector3(this.CHUNK_SIZE / 2 * this.BLOCK_SIZE, this.CHUNK_SIZE / 2 * this.BLOCK_SIZE, this.CHUNK_SIZE / 2 * this.BLOCK_SIZE));
        this.chunks.set(chunkKey, chunkRoot);

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
                        console.warn(`[WorldMeshBuilder] Block definition not found for type: ${block.type} at ${worldX},${worldY},${worldZ}`);
                        continue;
                    }
                    // Skip rendering if block is not solid and not explicitly renderable when non-solid
                    // if (!blockDef.isSolid) continue;


                    if (blockDef.isSolid && // Only cull fully solid blocks
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
                        if (patternInfo) {
                            baseMeshKey += `_auto_${patternInfo.patternKey}`;
                            autotileUVs = patternInfo.uv;
                        }
                    }
                    
                    let baseMesh = this.baseMeshCache.get(baseMeshKey);

                    if (!baseMesh) {
                        const matSide = this.getMaterial(blockDef, 'side');
                        const matTop = this.getMaterial(blockDef, 'top');
                        const matBottom = this.getMaterial(blockDef, 'bottom');
                        const needsMultiMaterial = matTop !== matSide || matBottom !== matSide;

                        const faceUVs = new Array<BABYLON.Vector4>(6);
                        for (let i = 0; i < 6; i++) faceUVs[i] = new BABYLON.Vector4(0, 0, 1, 1);

                        if (autotileUVs) faceUVs[4] = autotileUVs;
                        else if(blockDef.textures.top  && typeof blockDef.textures.top !== 'string') {
                            const tmt = blockDef.textures.top as TileMapTexture;
                            const texture = this.textureCache.get(tmt.texturePath);
                            if (texture) {
                                const tw = 1/(texture.getSize().width/tmt.frameWidth);
                                const th = 1/(texture.getSize().height/tmt.frameHeight);
                                const ix = tmt.frameX / tmt.frameWidth;
                                const iy = tmt.frameY / tmt.frameHeight;
                                faceUVs[4] = new BABYLON.Vector4(ix*tw, iy*th, ix*tw+tw, iy*th+th);
                            }
                        }
                        
                        if(blockDef.textures.side && typeof blockDef.textures.side !== 'string') {
                            const tmt = blockDef.textures.side as TileMapTexture;
                            const texture = this.textureCache.get(tmt.texturePath);
                            if (texture) {
                                const tw = 1/(texture.getSize().width/tmt.frameWidth);
                                const th = 1/(texture.getSize().height/tmt.frameHeight);
                                const ix = tmt.frameX / tmt.frameWidth;
                                const iy = tmt.frameY / tmt.frameHeight;
                                for(let i = 0; i < 4; i++)
                                    faceUVs[i] = new BABYLON.Vector4(ix*tw, iy*th, ix*tw+tw, iy*th+th);
                            }
                        }

                        if(blockDef.textures.bottom  && typeof blockDef.textures.bottom !== 'string') {
                            const tmt = blockDef.textures.bottom as TileMapTexture;
                            const texture = this.textureCache.get(tmt.texturePath);
                            if (texture) {
                                const tw = 1/(texture.getSize().width/tmt.frameWidth);
                                const th = 1/(texture.getSize().height/tmt.frameHeight);
                                const ix = tmt.frameX / tmt.frameWidth;
                                const iy = tmt.frameY / tmt.frameHeight;
                                faceUVs[5] = new BABYLON.Vector4(ix*tw, iy*th, ix*tw+tw, iy*th+th);
                            }
                        }

                        const baseMeshName = "baseMesh_" + baseMeshKey.replace(/[^a-zA-Z0-9_.-]/g, '_'); // Sanitize name
                        baseMesh = BABYLON.MeshBuilder.CreateBox(baseMeshName, {
                            size: this.BLOCK_SIZE,
                            wrap: true,
                            faceUV: faceUVs,
                            updatable: false
                        }, this.scene);

                        baseMesh.receiveShadows = true;
                        baseMesh.layerMask = WORLD_BLOCK_LAYER;

                        if (needsMultiMaterial) {
                            const multiMaterial = new BABYLON.MultiMaterial(baseMeshName + "_multiMat", this.scene);
                            multiMaterial.subMaterials = [matSide, matSide, matSide, matSide, matTop, matBottom];
                            baseMesh.material = multiMaterial;
                            // CreateBox with faceUVs usually handles SubMesh creation for MultiMaterial.
                            // Manual SubMesh creation (as in original) ensures it if there are issues.
                            // Ensure vertex count is correct. For a standard box (24 vertices, 36 indices):
                            const vertexCount = baseMesh.getTotalVertices(); // Should be 24 for a box
                            // const indicesCount = baseMesh.getTotalIndices(); // Should be 36
                            baseMesh.subMeshes = []; // Clear any default submeshes if we are defining them manually
                            // Indices per face for a box is 6
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(0, 0, vertexCount, 0, 6, baseMesh));   // Back
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(1, 0, vertexCount, 6, 6, baseMesh));  // Front
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(2, 0, vertexCount, 12, 6, baseMesh)); // Right
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(3, 0, vertexCount, 18, 6, baseMesh)); // Left
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(4, 0, vertexCount, 24, 6, baseMesh)); // Top
                            baseMesh.subMeshes.push(new BABYLON.SubMesh(5, 0, vertexCount, 30, 6, baseMesh)); // Bottom
                        } else {
                            baseMesh.material = matSide;
                        }

                        baseMesh.setEnabled(false);
                        baseMesh.doNotSyncBoundingInfo = true;
                        baseMesh.isPickable = true;
                        this.baseMeshCache.set(baseMeshKey, baseMesh);
                    }

                    if (baseMesh) {
                        const instanceName = `cubeInstance_${worldX}_${worldY}_${worldZ}`;
                        const instance = baseMesh.createInstance(instanceName);
                        // Center the instance at (worldX * BS, worldY * BS, worldZ * BS)
                        instance.position.set(
                            worldX * this.BLOCK_SIZE + this.BLOCK_SIZE * (blockDef.offset ? blockDef.offset?.x : 0),
                            worldY * this.BLOCK_SIZE + this.BLOCK_SIZE * (blockDef.offset ? blockDef.offset?.y : 0),
                            worldZ * this.BLOCK_SIZE + this.BLOCK_SIZE * (blockDef.offset ? blockDef.offset?.z : 0)
                        );
                        if (block.rotation) {
                            instance.rotation.y = BABYLON.Tools.ToRadians(block.rotation);
                        }
                        if(blockDef.scale) {
                            instance.scaling = new BABYLON.Vector3(blockDef.scale?.x, blockDef.scale?.y, blockDef.scale?.z);
                        }
                        instance.receiveShadows = true;
                        instance.layerMask = WORLD_BLOCK_LAYER;
                        instance.parent = chunkRoot;

                        if(this.shadowGenerator && worldY > 0) this.shadowGenerator.addShadowCaster(instance);

                        instance.cullingStrategy = BABYLON.AbstractMesh.CULLINGSTRATEGY_OPTIMISTIC_INCLUSION;
                    }
                }
            }
        }
        chunkRoot.computeWorldMatrix(true);
    }

    // --- Physics Mesh Generation ---
    private currentCollisionProcessingPromise: Promise<void> | null = null;

    private async processChunkCollisionUpdateQueue(): Promise<void> {
        if (this.isUpdatingChunkCollisions) {
            // If a process is already running, await its completion.
            // This prevents multiple concurrent loops over the queue.
            if (this.currentCollisionProcessingPromise) {
                // console.log("[WorldMeshBuilder] Collision update already in progress, awaiting current batch.");
                await this.currentCollisionProcessingPromise;
            }
            // After awaiting, the queue might have new items, or the previous call handled them.
            // The next check for queue.size > 0 will determine if more work is needed.
        }

        if (this.chunkCollisionUpdateQueue.size === 0) {
            return; // Nothing to do
        }

        const physicsEngine = this.scene.getPhysicsEngine();
        if (!physicsEngine) {
            this.chunkCollisionUpdateQueue.clear(); // Clear queue if no physics engine
            console.warn("[WorldMeshBuilder] No physics engine. Skipping collision mesh generation.");
            return;
        }

        this.isUpdatingChunkCollisions = true;
        // console.log(`[WorldMeshBuilder] Starting to process ${this.chunkCollisionUpdateQueue.size} collision chunks.`);

        // Create a promise that represents the completion of this batch
        this.currentCollisionProcessingPromise = (async () => {
            while (this.chunkCollisionUpdateQueue.size > 0) {
                const chunkKey = this.chunkCollisionUpdateQueue.values().next().value; // Get one
                this.chunkCollisionUpdateQueue.delete(chunkKey!); // Remove it

                // console.log(`[WorldMeshBuilder] Rebuilding collision for chunk: ${chunkKey}`);
                await this.rebuildChunkCollisionMesh(chunkKey!);
                // Yield to the browser to prevent freezing, especially for many chunks
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        })();

        try {
            await this.currentCollisionProcessingPromise;
        } finally {
            this.isUpdatingChunkCollisions = false;
            this.currentCollisionProcessingPromise = null;
            // console.log("[WorldMeshBuilder] Finished processing a batch of collision chunks.");

            // If new items were added to the queue while this batch was processing,
            // recursively call to handle them. This ensures all queued items are processed.
            if (this.chunkCollisionUpdateQueue.size > 0) {
                // console.log("[WorldMeshBuilder] New collision chunks added during processing, running again.");
                await this.processChunkCollisionUpdateQueue();
            }
        }
    }

    private async rebuildChunkCollisionMesh(chunkKey: string): Promise<void> {
        // 1. Dispose old collision mesh and impostor
        const oldCollisionMesh = this.chunkCollisionMeshes.get(chunkKey);
        if (oldCollisionMesh) {
            if (oldCollisionMesh.physicsImpostor) oldCollisionMesh.physicsImpostor.dispose();
            if (oldCollisionMesh.physicsBody) oldCollisionMesh.physicsBody.dispose();

            oldCollisionMesh.dispose();
            this.chunkCollisionMeshes.delete(chunkKey);
        }

        const [chunkXStr, chunkYStr, chunkZStr] = chunkKey.split(',');
        const chunkX = parseInt(chunkXStr), chunkY = parseInt(chunkYStr), chunkZ = parseInt(chunkZStr);
        const tempBoxesForMerging: BABYLON.Mesh[] = [];

        const startGridX = chunkX * this.CHUNK_SIZE;
        const startGridY = chunkY * this.CHUNK_SIZE;
        const startGridZ = chunkZ * this.CHUNK_SIZE;

        for (let x = 0; x < this.CHUNK_SIZE; x++) {
            for (let y = 0; y < this.CHUNK_SIZE; y++) {
                for (let z = 0; z < this.CHUNK_SIZE; z++) {
                    const worldGridX = startGridX + x;
                    const worldGridY = startGridY + y;
                    const worldGridZ = startGridZ + z;

                    if (this.isVoxelSolid(worldGridX, worldGridY, worldGridZ)) {
                        const tempBox = BABYLON.MeshBuilder.CreateBox(`temp_collider_${worldGridX}_${worldGridY}_${worldGridZ}`,
                            { size: this.BLOCK_SIZE }, this.scene);
                        // Position the center of the temp box, consistent with visual blocks
                        tempBox.position.set(
                            worldGridX * this.BLOCK_SIZE,
                            worldGridY * this.BLOCK_SIZE,
                            worldGridZ * this.BLOCK_SIZE
                        );
                        tempBoxesForMerging.push(tempBox);
                    }
                }
            }
        }

        if (tempBoxesForMerging.length === 0) return;

        const mergedChunkCollisionMesh = BABYLON.Mesh.MergeMeshes(tempBoxesForMerging, true, true, undefined, false, true);

        if (!mergedChunkCollisionMesh) {
            console.warn(`[WorldMeshBuilder] Failed to merge collision meshes for chunk ${chunkKey}.`);
            tempBoxesForMerging.forEach(m => m.dispose()); // Ensure cleanup if merge fails
            return;
        }

        mergedChunkCollisionMesh.name = `collision_chunk_${chunkKey}`;
        mergedChunkCollisionMesh.material = this.shadowOnlyMaterial;
        mergedChunkCollisionMesh.visibility = 0;

        mergedChunkCollisionMesh.physicsBody = new BABYLON.PhysicsBody(
            mergedChunkCollisionMesh,              // Node
            BABYLON.PhysicsMotionType.STATIC,      // STATIC for non-moving objects
            false,                                 // isDeterministic
            this.scene
        );

        mergedChunkCollisionMesh.computeWorldMatrix(true);

        const shape = new BABYLON.PhysicsShape({ type: BABYLON.PhysicsShapeType.MESH, parameters: { mesh: mergedChunkCollisionMesh } }, this.scene);

        mergedChunkCollisionMesh.physicsBody.shape = shape;

        this.chunkCollisionMeshes.set(chunkKey, mergedChunkCollisionMesh);
    }

    public dispose(): void {
        this.chunks.forEach(node => {
            node.getChildMeshes(false, m => m instanceof BABYLON.InstancedMesh).forEach(instance => instance.dispose());
            node.dispose();
        });
        this.chunks.clear();

        this.baseMeshCache.forEach(mesh => mesh.dispose());
        this.baseMeshCache.clear();

        this.materialCache.forEach(mat => mat.dispose());
        this.materialCache.clear();
        this.textureCache.forEach(tex => tex.dispose());
        this.textureCache.clear();

        this.chunkCollisionMeshes.forEach(mesh => {
            if (mesh.physicsImpostor) mesh.physicsImpostor.dispose();
            mesh.dispose();
        });
        this.chunkCollisionMeshes.clear();

        this.voxelData.clear();
        this.dirtyChunks.clear();
        this.chunkCollisionUpdateQueue.clear();
        this.isUpdatingChunkCollisions = false;
        console.log("[WorldMeshBuilder] Disposed.");
    }
}