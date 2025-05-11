// client/src/babylon/map/MapRenderer.ts
// Class responsible for rendering a map based on block data within a specific scene.
// Manages base meshes, materials, and thin instances.

import * as B from '@babylonjs/core';
import { AssetService } from '../services/AssetService'; // Optional: For loading models
import { Color3 } from '@babylonjs/core';

// Type for the map data expected by the renderer
// Key: "x,y,z" string, Value: { type: string, ...other optional props }
export type BlockDataMap = Record<string, { type: string; [key: string]: any }>;

// Structure to hold info for thin instance buffers per block type
interface InstanceBufferInfo {
    baseMesh: B.Mesh;
    matrices: B.Matrix[];
    buffer: Float32Array | null;
    needsRebuild: boolean;
}

export class MapRenderer {
    private scene: B.Scene;
    private assetService?: AssetService; // Optional, used only if loading models
    public rootNode: B.TransformNode; // Public root node for the map visuals

    // Instancing Data
    private baseBlockMeshes: Map<string, B.Mesh> = new Map();
    private blockMaterials: Map<string, B.Material> = new Map();
    private instanceBuffersInfo: Map<string, InstanceBufferInfo> = new Map();
    private buffersNeedRebuild: boolean = false;

    // Unique identifier for this renderer instance within the scene metadata
    public readonly rendererId: string;
    private static rendererCounter = 0; // Simple counter for unique IDs

    /**
     * Creates a MapRenderer instance.
     * @param scene - The BabylonJS scene to render the map into.
     * @param assetService - Optional AssetService instance for loading block models.
     * @param rendererId - Optional unique ID for this renderer.
     */
    constructor(scene: B.Scene, assetService?: AssetService, rendererId?: string) {
        this.scene = scene;
        this.assetService = assetService;
        this.rendererId = rendererId || `mapRenderer_${MapRenderer.rendererCounter++}`;
        this.rootNode = new B.TransformNode(`mapRoot_${this.rendererId}`, this.scene);

        // Store this instance in the scene's metadata for easy access
        if (!this.scene.metadata) { this.scene.metadata = {}; }
        if (!this.scene.metadata.mapRenderers) { this.scene.metadata.mapRenderers = {}; }
        this.scene.metadata.mapRenderers[this.rendererId] = this;

        console.log(`[MapRenderer:${this.rendererId}] Initialized.`);

        // Register render loop observer
        this.scene.onBeforeRenderObservable.add(this.updateInstanceBuffers);
    }

    /**
     * Clears existing map visuals and renders a new map from the provided data.
     * @param mapData - The block data object (key: "x,y,z", value: { type: string }).
     */
    public async renderMap(mapData: any & { $items: BlockDataMap } | null): Promise<void> {
        console.log(`[MapRenderer:${this.rendererId}] Request to render map.`);
        this.clearMapVisuals(); // Clear previous visuals first

        mapData = mapData?.$items || null; // Handle optional $items wrapper
        if (!mapData || mapData.size === 0) {
            console.log(`[MapRenderer:${this.rendererId}] No map data provided or empty map.`);
            return;
        }

        console.log("Try render", mapData)
        let blockCount = 0
        console.log(`[MapRenderer:${this.rendererId}] Processing ${mapData.size} blocks...`);

        // --- Aggregate instance matrices per block type ---
        const matricesByType: Map<string, B.Matrix[]> = new Map();
        const baseMeshesToLoad: Set<string> = new Set();

        // First pass: Identify needed meshes and group matrices
        for (const [coordsString, blockInfo] of mapData.entries()) {
            if (!blockInfo || !blockInfo.type) continue;

            const [x, y, z] = coordsString.split(',').map(Number);
            if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

            const blockType = blockInfo.type;
            // typesInThisChunk.add(blockType); // Assuming 'typesInThisChunk' should be declared or managed if needed for other logic
            // Track needed base meshes
            if (!this.baseBlockMeshes.has(blockType)) {
                baseMeshesToLoad.add(blockType);
                 // Initialize buffer info placeholder if loading starts here
                if (!this.instanceBuffersInfo.has(blockType)) {
                    this.instanceBuffersInfo.set(blockType, { baseMesh: null!, matrices: [], buffer: null, needsRebuild: false });
                }
            }

            // Initialize matrix array for this type
            if (!matricesByType.has(blockType)) {
                matricesByType.set(blockType, []);
            }

            // Calculate the world matrix
            const matrix = B.Matrix.Translation(x, y, z);
            // --- TODO: Add Rotation/Scaling if needed based on blockInfo ---
            // const rotationMatrix = B.Matrix.RotationYawPitchRoll(yaw, pitch, roll);
            // const scaleMatrix = B.Matrix.Scaling(scaleX, scaleY, scaleZ);
            // matrix = scaleMatrix.multiply(rotationMatrix).multiply(matrix);
            // --- End TODO ---
            matricesByType.get(blockType)!.push(matrix);
            blockCount++;
        }

        // Load all required base meshes concurrently
        if (baseMeshesToLoad.size > 0) {
            console.log(`[MapRenderer:${this.rendererId}] Loading base meshes for types:`, [...baseMeshesToLoad]);
            await Promise.all([...baseMeshesToLoad].map(type => this.getBaseBlockMesh(type)));
            console.log(`[MapRenderer:${this.rendererId}] Base mesh loading complete.`);
        }

        // --- Update Thin Instance Data ---
        matricesByType.forEach((matrices, blockType) => {
            const bufferInfo = this.instanceBuffersInfo.get(blockType);
            if (!bufferInfo || !bufferInfo.baseMesh) {
                 console.warn(`[MapRenderer:${this.rendererId}] Base mesh missing for ${blockType} when setting matrices.`);
                 return; // Skip if base mesh somehow failed
            }

            // Replace existing matrices and mark for rebuild
            bufferInfo.matrices = matrices;
            bufferInfo.needsRebuild = true;
        });

        // Mark that buffers need an update in the render loop
        this.buffersNeedRebuild = true;
        console.log(`[MapRenderer:${this.rendererId}] Map processed, ${blockCount} blocks queued for rendering.`);
    }

    /** Clears all visuals managed by this renderer instance */
    private clearMapVisuals(): void {
        console.log(`[MapRenderer:${this.rendererId}] Clearing map visuals...`);
        this.instanceBuffersInfo.forEach(info => {
            if (info.baseMesh) {
                info.baseMesh.thinInstanceSetBuffer("matrix", null); // Clear GPU buffer
            }
            info.matrices = []; // Clear CPU matrix array
            info.buffer = null;
            info.needsRebuild = false; // Reset flag
        });
        // Note: We keep the base meshes and materials cached unless dispose() is called.
        this.rootNode.dispose(false, true); // Dispose children (old instances if any remained)
        this.rootNode = new B.TransformNode(`mapRoot_${this.rendererId}`, this.scene); // Recreate root
        this.buffersNeedRebuild = false; // Reset flag
    }

    /** Updates the actual thin instance buffers in the render loop if needed */
    private updateInstanceBuffers = () => { // Use arrow function for correct 'this'
        if (!this.buffersNeedRebuild) return;

        // console.log(`[MapRenderer:${this.rendererId}] Updating instance buffers...`);
        let bufferUpdated = false;
        this.instanceBuffersInfo.forEach((bufferInfo, blockType) => {
            // Rebuild only if marked AND if there are matrices to draw
            if (bufferInfo.needsRebuild && bufferInfo.baseMesh && bufferInfo.matrices.length > 0) {
                const matrixBuffer = new Float32Array(bufferInfo.matrices.length * 16);
                for (let i = 0; i < bufferInfo.matrices.length; i++) {
                    bufferInfo.matrices[i].copyToArray(matrixBuffer, i * 16);
                }
                bufferInfo.baseMesh.thinInstanceSetBuffer("matrix", matrixBuffer, 16, false);
                bufferInfo.buffer = matrixBuffer;
                bufferInfo.needsRebuild = false; // Mark as rebuilt
                bufferUpdated = true;
                // console.log(`[MapRenderer:${this.rendererId}] Set buffer for ${blockType} with ${bufferInfo.matrices.length} instances.`);
            } else if (bufferInfo.needsRebuild && bufferInfo.baseMesh && bufferInfo.matrices.length === 0) {
                 // If marked for rebuild but now has no instances, clear the buffer
                 bufferInfo.baseMesh.thinInstanceSetBuffer("matrix", null);
                 bufferInfo.buffer = null;
                 bufferInfo.needsRebuild = false; // Mark as rebuilt (cleared)
                 bufferUpdated = true;
                 console.log(`[MapRenderer:${this.rendererId}] Cleared buffer for ${blockType} (0 instances).`);
            }
        });

        if (bufferUpdated) {
            // console.log(`[MapRenderer:${this.rendererId}] Finished updating instance buffers.`);
        }
        this.buffersNeedRebuild = false; // Reset global flag for next update cycle
    }

    /** Gets or creates a base mesh (template) for a block type */
    private async getBaseBlockMesh(blockType: string): Promise<B.Mesh | null> {
        if (this.baseBlockMeshes.has(blockType)) {
            return this.baseBlockMeshes.get(blockType)!;
        }
         const loadingBufferInfo = this.instanceBuffersInfo.get(blockType);
         if (loadingBufferInfo?.baseMesh) return loadingBufferInfo.baseMesh;

        console.log(`[MapRenderer:${this.rendererId}] Getting/Loading base mesh for type: ${blockType}`);
        let mesh: B.Mesh | null = null;

        // --- Attempt to load model (Requires AssetService) ---
        if (this.assetService) {
            try {
                // const modelPath = `/assets/models/blocks/${blockType}.glb`; // Adjust path
                // const loadedMeshes = await this.assetService.loadMesh(modelPath);
                const loadedMeshes = [B.CreateBox('unnamed_box')]
                if (loadedMeshes && loadedMeshes.length > 0) {
                    mesh = loadedMeshes[0] as B.Mesh;
                    mesh.name = `base_${blockType}`;
                    // Configure mesh for instancing...
                    mesh.isVisible = true; mesh.setEnabled(true); mesh.isPickable = false;
                    // mesh.doNotSyncBoundingInfo = true; mesh.cullingStrategy = B.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
                    mesh.position = B.Vector3.Zero(); mesh.rotationQuaternion = null; mesh.rotation = B.Vector3.Zero(); mesh.scaling = B.Vector3.One();
                    if (!mesh.material) mesh.material = this.getBlockMaterial(blockType);
                    else this.blockMaterials.set(blockType, mesh.material);
                    mesh.parent = this.rootNode;
                     console.log(`[MapRenderer:${this.rendererId}] Loaded model for ${blockType}.`);
                } else { console.warn(`[MapRenderer:${this.rendererId}] Model loading returned no meshes for ${blockType}.`); }
            } catch (e) { console.error(`[MapRenderer:${this.rendererId}] Error loading block model ${blockType}:`, e); }
        }
        // --- End Load Model ---

        // --- Fallback or Default: Placeholder Box ---
        if (!mesh) {
            mesh = B.MeshBuilder.CreateBox(`base_${blockType}_placeholder`, { size: 1 }, this.scene);
            mesh.material = this.getBlockMaterial(blockType);
            // Configure for instancing...
            mesh.isVisible = true; mesh.setEnabled(true); mesh.isPickable = false;
            mesh.parent = this.rootNode;
        }
        // --- End Fallback ---

        // Store base mesh and update buffer info
        this.baseBlockMeshes.set(blockType, mesh);
        const bufferInfo = this.instanceBuffersInfo.get(blockType);
        if (bufferInfo) bufferInfo.baseMesh = mesh;
        else this.instanceBuffersInfo.set(blockType, { baseMesh: mesh, matrices: [], buffer: null, needsRebuild: false });

        return mesh;
    }

    /** Gets or creates a simple material for a block type */
    private getBlockMaterial(blockType: string): B.Material {
        // (Same implementation as before - caches materials)
        if (this.blockMaterials.has(blockType)) return this.blockMaterials.get(blockType)!;
        const material = new B.StandardMaterial(`mat_${blockType}`, this.scene);
        switch (blockType.toLowerCase()) {
             case 'stone': material.diffuseColor = new Color3(0.5, 0.5, 0.5); break;
             case 'grass': material.diffuseColor = new Color3(0.2, 0.6, 0.2); break;
             case 'dirt': material.diffuseColor = new Color3(0.6, 0.4, 0.2); break;
             case 'water': material.diffuseColor = new Color3(0.3, 0.5, 0.9); material.alpha = 0.7; break;
             default: material.diffuseColor = Color3.Magenta();
         }
        material.specularColor = new Color3(0.1, 0.1, 0.1);
        material.backFaceCulling = true;
        this.blockMaterials.set(blockType, material);
        return material;
    }

    /** Cleans up all resources used by this map renderer */
    public dispose(): void {
        console.log(`[MapRenderer:${this.rendererId}] Disposing...`);
        this.scene.onBeforeRenderObservable.removeCallback(this.updateInstanceBuffers);
        this.baseBlockMeshes.forEach(mesh => mesh.dispose());
        this.baseBlockMeshes.clear();
        this.blockMaterials.forEach(mat => mat.dispose());
        this.blockMaterials.clear();
        this.rootNode.dispose(false, true); // Dispose root and instances
        this.instanceBuffersInfo.clear();

        // Remove self from scene metadata
        if (this.scene.metadata?.mapRenderers?.[this.rendererId]) {
            delete this.scene.metadata.mapRenderers[this.rendererId];
        }
        console.log(`[MapRenderer:${this.rendererId}] Disposed.`);
    }
}

// Helper type declaration assuming BlockDataMap is defined above or imported
declare module '@babylonjs/core/scene' {
    export interface Scene {
        metadata: any; // Keep the original type and extend it dynamically
    }
}

// Helper variable assumed to be declared in scope or imported
declare var typesInThisChunk: Set<string>;