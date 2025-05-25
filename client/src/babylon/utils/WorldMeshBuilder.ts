import * as BABYLON from '@babylonjs/core';
import { BlockDefinition } from './BlockDefinition';
import { AutoTileConfig } from './AutoTileConfig';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';

// --- Helper functions for keys ---
function getVoxelKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
}

function getChunkKey(chunkX: number, chunkY: number, chunkZ: number): string {
    return `${chunkX},${chunkY},${chunkZ}`;
}

export class WorldMeshBuilder {
    private scene: BABYLON.Scene;
    private blockDefinitions: Map<string, BlockDefinition>;
    private voxelData: Map<string, IWorldBlock>; // Store IWorldBlock directly

    public readonly CHUNK_SIZE = 16; // Voxels per chunk dimension
    private chunks: Map<string, BABYLON.Mesh>;
    private dirtyChunks: Set<string>;

    private materialCache: Map<string, BABYLON.StandardMaterial>;
    private textureCache: Map<string, BABYLON.Texture>;

    constructor(scene: BABYLON.Scene, blockDefs: BlockDefinition[]) {
        this.scene = scene;
        this.blockDefinitions = new Map();
        blockDefs.forEach(def => this.blockDefinitions.set(def.id, def));

        this.voxelData = new Map();
        this.chunks = new Map();
        this.dirtyChunks = new Set();
        this.materialCache = new Map();
        this.textureCache = new Map();

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
        let materialKey: string;

        if (faceType === 'top') {
            if (blockDef.autoTileTop) {
                texturePath = blockDef.autoTileTop.atlasTexturePath;
                materialKey = `${blockDef.id}_autotile_top_${texturePath}`; // Include path in key for safety
            } else {
                texturePath = blockDef.textures.top || blockDef.textures.side;
                materialKey = `${blockDef.id}_top_${texturePath}`;
            }
        } else if (faceType === 'bottom') {
            texturePath = blockDef.textures.bottom || blockDef.textures.side;
            materialKey = `${blockDef.id}_bottom_${texturePath}`;
        } else { // side
            texturePath = blockDef.textures.side;
            materialKey = `${blockDef.id}_side_${texturePath}`;
        }

        if (!texturePath) {
            console.warn(`No texture path for ${blockDef.id} face ${faceType}. Using fallback.`);
            materialKey = "fallback_magenta";
            if (this.materialCache.has(materialKey)) return this.materialCache.get(materialKey)!;
            const fallbackMat = new BABYLON.StandardMaterial(materialKey, this.scene);
            fallbackMat.diffuseColor = BABYLON.Color3.Magenta();
            this.materialCache.set(materialKey, fallbackMat);
            return fallbackMat;
        }

        if (this.materialCache.has(materialKey)) {
            return this.materialCache.get(materialKey)!;
        }

        const material = new BABYLON.StandardMaterial(materialKey, this.scene);
        const texture = this.textureCache.get(texturePath);

        if (texture) {
            material.diffuseTexture = texture;
            material.specularColor = new BABYLON.Color3(0, 0, 0); // No shininess
            if (texturePath.toLowerCase().endsWith(".png")) { // Basic transparency for PNGs
                 material.diffuseTexture.hasAlpha = true;
                 material.useAlphaFromDiffuseTexture = false;
                 // material.alphaMode = BABYLON.Engine.ALPHA_PREMULTIPLIED_PORTERDUFF; // Or other blend modes if needed
            }
        } else {
            console.warn(`Texture not found in cache: ${texturePath} for ${materialKey}. Using gray fallback.`);
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
        this.markNeighborChunksDirtyOnBoundary(x,y,z);
    }

    public removeBlock(x: number, y: number, z: number): void {
        const key = getVoxelKey(x, y, z);
        if (this.voxelData.has(key)) {
            this.voxelData.delete(key);
            this.markChunkDirty(x, y, z);
            this.markNeighborChunksDirtyOnBoundary(x,y,z);
        }
    }

    public loadInitialWorld(worldBlocks: IWorldBlock[]): void {
        console.log(`Loading initial world with ${worldBlocks.length} blocks.`);
        this.voxelData.clear(); // Clear existing data if any
        const allDirtyChunks = new Set<string>();

        worldBlocks.forEach(block => {
            const { x, y, z } = block.position;
            const key = getVoxelKey(x, y, z);
            this.voxelData.set(key, block);

            const { cx, cy, cz } = this.getChunkCoordinates(x, y, z);
            allDirtyChunks.add(getChunkKey(cx,cy,cz));
            // Note: For initial load, boundary marking between chunks is less critical
            // as all relevant chunks will likely be built anyway.
            // However, if loading sparsely, it might still be relevant.
            // For simplicity here, we just mark the chunk itself.
            // The rebuild will handle culling against neighbors.
        });
        this.dirtyChunks = allDirtyChunks; // Set all chunks containing initial blocks as dirty
        console.log(`Marked ${this.dirtyChunks.size} chunks for initial build.`);
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

public rebuildChunk(chunkX: number, chunkY: number, chunkZ: number) {
    const CHUNK_SIZE = 16;
    const BLOCK_SIZE = 1;

    const chunkId = `chunk_${chunkX}_${chunkY}_${chunkZ}`;
    const chunkRoot = new BABYLON.TransformNode(chunkId, this.scene);

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = chunkX * CHUNK_SIZE + x;
                const worldY = chunkY * CHUNK_SIZE + y;
                const worldZ = chunkZ * CHUNK_SIZE + z;

                const block = this.voxelData.get(getVoxelKey(worldX, worldY, worldZ));
                console.log(block)
                if (!block) continue; // Skip empty

                // Optional: simple greedy meshing check (no visible face = skip)
                if (
                    this.voxelData.get(getVoxelKey(worldX + 1, worldY, worldZ)) &&
                    this.voxelData.get(getVoxelKey(worldX - 1, worldY, worldZ)) &&
                    this.voxelData.get(getVoxelKey(worldX, worldY + 1, worldZ)) &&
                    this.voxelData.get(getVoxelKey(worldX, worldY - 1, worldZ)) &&
                    this.voxelData.get(getVoxelKey(worldX, worldY, worldZ + 1)) &&
                    this.voxelData.get(getVoxelKey(worldX, worldY, worldZ - 1))
                ) continue;

                // Create the base cube only once and hide it
                const typeBaseCubeId = "baseCube_" + block.type;
                if (!this.scene.getMeshByName(typeBaseCubeId)) {
                    const baseCube = BABYLON.MeshBuilder.CreateBox(typeBaseCubeId, { size: BLOCK_SIZE, wrap: true }, this.scene);
                    baseCube.material = this.getMaterial(this.getBlockDefinition(block.type)!, 'side');
                    baseCube.isVisible = false;
                    baseCube.doNotSyncBoundingInfo = true;
                    baseCube.isPickable = false;
                    baseCube.freezeWorldMatrix();
                }

                const baseCube = this.scene.getMeshByName(typeBaseCubeId);

                const instance = new BABYLON.InstancedMesh(`cube_${worldX}_${worldY}_${worldZ}`, baseCube! as BABYLON.Mesh);
                instance.position.set(worldX * BLOCK_SIZE, worldY * BLOCK_SIZE, worldZ * BLOCK_SIZE);
                instance.parent = chunkRoot;
            }
        }
    }

    chunkRoot.freezeWorldMatrix(); // Optimizes chunk transform
}

    public dispose(): void {
        this.chunks.forEach(mesh => mesh.dispose(false, true)); // Dispose geometry and materials
        this.chunks.clear();
        this.materialCache.forEach(mat => mat.dispose());
        this.materialCache.clear();
        this.textureCache.forEach(tex => tex.dispose());
        this.textureCache.clear();
        this.voxelData.clear();
        this.dirtyChunks.clear();
    }
}