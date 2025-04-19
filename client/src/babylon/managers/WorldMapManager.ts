// client/src/babylon/managers/WorldMapManager.ts
// Generic manager to render world map chunks using Thin Instances.
// Subscribes to map data and manages visuals.

import * as B from '@babylonjs/core';
import { AssetService } from '@/services/AssetService';
import { IMapChunkState, BlockDataMap } from '@shared/types';
import { Color3 } from '@babylonjs/core'; // Import Color3 specifically

// Define structure for tracking instance data per base mesh
interface InstanceBufferInfo {
    baseMesh: B.Mesh;
    matrices: B.Matrix[]; // Array of matrices before creating buffer
    buffer: Float32Array | null; // The actual buffer for GPU (optional to store)
    needsRebuild: boolean; // Flag if buffer needs update
}

export class WorldMapManager {
    private scene: B.Scene;
    private assetService: AssetService;
    private rootNode: B.TransformNode;

    private baseBlockMeshes: Map<string, B.Mesh> = new Map();
    private blockMaterials: Map<string, B.Material> = new Map();
    private instanceBuffersInfo: Map<string, InstanceBufferInfo> = new Map(); // Renamed for clarity
    private chunkBlockTypes: Map<string, Set<string>> = new Map();
    private blockInstanceIndex: Map<string, { type: string, index: number }> = new Map();
    private buffersNeedRebuild: boolean = false;

    constructor(scene: B.Scene, assetService: AssetService, managerId: string = "worldMap") {
        this.scene = scene;
        this.assetService = assetService;
        this.rootNode = new B.TransformNode(`${managerId}_Root`, this.scene);
        console.log(`[WorldMapManager:${managerId}] Initialized.`);
        this.scene.onBeforeRenderObservable.add(this.updateInstanceBuffers);
    }

    // --- Public method to subscribe manager to a store selector ---
    // Allows using the same manager for background map or game chunks
    public subscribeToData(selector: (state: any) => Record<string, any>) {
         // Unsubscribe from previous if any
         // this.storeUnsubscribe?.(); // Need to import store type if using this

         console.log(`[WorldMapManager:${this.rootNode.name}] Subscribing to data selector...`);
         // Replace with actual store subscription mechanism (e.g., Zustand)
         const store = useWorldStore; // Assuming useWorldStore is accessible or passed in
         const unsubscribe = store.subscribe(
             (currentData: any, previousData: any) => {
                 console.log(`[WorldMapManager:${this.rootNode.name}] Data changed via selector.`);
                 // Basic diffing - assumes the selector returns the map/record directly
                 const chunksToAddUpdate: Record<string, IMapChunkState | BlockDataMap> = {};
                 const chunkIdsToRemove: string[] = [];
                 const currentIds = new Set(Object.keys(currentData || {}));
                 const previousIds = new Set(Object.keys(previousData || {}));

                 currentIds.forEach(id => {
                     if (!previousIds.has(id) || currentData[id] !== previousData[id]) {
                          chunksToAddUpdate[id] = currentData[id];
                     }
                 });
                 previousIds.forEach(id => {
                     if (!currentIds.has(id)) {
                          chunkIdsToRemove.push(id);
                     }
                 });

                 if (Object.keys(chunksToAddUpdate).length > 0 || chunkIdsToRemove.length > 0) {
                     this.updateChunks(chunksToAddUpdate, chunkIdsToRemove);
                 }
             },
             // { equalityFn: shallow } // Add equality function if needed
         );
          // Store unsubscribe function if using Zustand pattern directly
          // this.storeUnsubscribe = unsubscribe;

         // Process initial data from the selector
         const initialData = selector(store.getState());
         if (initialData && Object.keys(initialData).length > 0) {
             console.log(`[WorldMapManager:${this.rootNode.name}] Processing initial data from selector.`);
             this.updateChunks(initialData, []); // Process all as added initially
         }
    }

    /** Updates the managed map by adding, updating, or removing chunks. */
    public async updateChunks(
        chunksToAddOrUpdate: Record<string, IMapChunkState | BlockDataMap>,
        chunkIdsToRemove: string[]
    ): Promise<void> {
        console.log(`[WorldMapManager:${this.rootNode.name}] Updating chunks. Add/Update: ${Object.keys(chunksToAddOrUpdate).length}, Remove: ${chunkIdsToRemove.length}`);
        let needsRebuild = false;

        // 1. Handle removals first (update instance data)
        for (const chunkId of chunkIdsToRemove) {
            if (this.removeChunkBlocks(chunkId)) { // removeChunkBlocks now returns true if changes were made
                needsRebuild = true;
            }
            this.chunkBlockTypes.delete(chunkId);
        }

        // 2. Handle additions/updates (prepare instance data)
        const prepPromises: Promise<boolean>[] = []; // Promise resolves true if changes made
        for (const chunkId in chunksToAddOrUpdate) {
            prepPromises.push(this.prepareChunkData(chunkId, chunksToAddOrUpdate[chunkId]));
        }
        // Wait for all preparations (including async mesh loading)
        const prepResults = await Promise.all(prepPromises);
        if (prepResults.some(changed => changed)) { // Check if any prep step caused changes
            needsRebuild = true;
        }

        // 3. Mark buffers for rebuild globally if any changes occurred
        if (needsRebuild) {
            console.log(`[WorldMapManager:${this.rootNode.name}] Marking buffers for rebuild.`);
            this.buffersNeedRebuild = true;
        }
    }

    /** Prepares instance data for a chunk, returns true if changes were made */
    private async prepareChunkData(chunkId: string, chunkData: IMapChunkState | BlockDataMap): Promise<boolean> {
        let changed = false;
        // Remove old blocks first IF this chunk existed before
        if (this.chunkBlockTypes.has(chunkId)) {
            changed = this.removeChunkBlocks(chunkId) || changed; // Clear previous instance data
        }

        const blockData = (chunkData as IMapChunkState).blockData ?? chunkData as BlockDataMap;
        if (!blockData || typeof blockData !== 'object') return changed;

        const baseMeshesToLoad: Set<string> = new Set(); // Track types needing mesh load
        const typesInThisChunk = new Set<string>();

        // First pass: Identify needed base meshes
        for (const coordsString in blockData) {
             const blockInfo = blockData[coordsString];
             if (!blockInfo || !blockInfo.type) continue;
             typesInThisChunk.add(blockInfo.type);
             if (!this.baseBlockMeshes.has(blockInfo.type)) {
                 baseMeshesToLoad.add(blockInfo.type);
             }
        }

        // Load necessary base meshes concurrently
        if (baseMeshesToLoad.size > 0) {
             console.log(`[WorldMapManager:${this.rootNode.name}] Chunk ${chunkId} requires loading base meshes for types:`, [...baseMeshesToLoad]);
             await Promise.all([...baseMeshesToLoad].map(type => this.getBaseBlockMesh(type)));
        }

        // Second pass: Add new instance data
        for (const coordsString in blockData) {
            const blockInfo = blockData[coordsString];
            if (!blockInfo || !blockInfo.type) continue;
            const [x, y, z] = coordsString.split(',').map(Number);
            if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

            // Get the buffer info (should exist now after getBaseBlockMesh)
            const bufferInfo = this.instanceBuffersInfo.get(blockInfo.type);
            if (!bufferInfo || !bufferInfo.baseMesh) {
                 console.warn(`[WorldMapManager:${this.rootNode.name}] Base mesh for type ${blockInfo.type} STILL missing. Cannot add instance at ${coordsString} in chunk ${chunkId}.`);
                 continue;
            }

            const matrix = B.Matrix.Translation(x, y, z);
            const instanceIndex = bufferInfo.matrices.push(matrix) - 1;
            bufferInfo.needsRebuild = true;
            changed = true;

            const blockKey = `${chunkId}|${coordsString}`;
            this.blockInstanceIndex.set(blockKey, { type: blockInfo.type, index: instanceIndex });
        }
        this.chunkBlockTypes.set(chunkId, typesInThisChunk);
        return changed;
    }

    /** Removes instance data for a chunk, returns true if changes were made */
    private removeChunkBlocks(chunkId: string): boolean {
        const typesAffected = this.chunkBlockTypes.get(chunkId);
        if (!typesAffected || typesAffected.size === 0) return false; // No blocks existed

        console.log(`[WorldMapManager:${this.rootNode.name}] Removing block data for chunk ${chunkId}`);
        let changed = false;
        const keysToRemove: string[] = [];
        const indicesToRemoveByType: Map<string, number[]> = new Map();

        // Collect keys and indices to remove
        this.blockInstanceIndex.forEach((info, key) => {
             if (key.startsWith(`${chunkId}|`)) {
                 keysToRemove.push(key);
                 if (!indicesToRemoveByType.has(info.type)) {
                     indicesToRemoveByType.set(info.type, []);
                 }
                 indicesToRemoveByType.get(info.type)!.push(info.index);
             }
        });

        if (keysToRemove.length === 0) return false; // Nothing actually found to remove

        // Remove from the main index map
        keysToRemove.forEach(key => this.blockInstanceIndex.delete(key));

        // --- Update the matrices array and remap indices ---
        indicesToRemoveByType.forEach((indicesToRemove, type) => {
             const bufferInfo = this.instanceBuffersInfo.get(type);
             if (!bufferInfo) return;

             // Sort indices descending to avoid shifting issues during removal
             indicesToRemove.sort((a, b) => b - a);

             // Remove matrices by index
             for (const indexToRemove of indicesToRemove) {
                 if (indexToRemove >= 0 && indexToRemove < bufferInfo.matrices.length) {
                     bufferInfo.matrices.splice(indexToRemove, 1); // Remove the matrix
                     changed = true;
                 }
             }

             // --- Remap remaining indices for this type ---
             // This is crucial but complex. We need to update blockInstanceIndex
             // for all blocks of this type whose original index was > the removed indices.
             // Create a map of oldIndex -> newIndex for this type after removal
             const indexRemapping: Map<number, number> = new Map();
             let newIndex = 0;
             for (let oldIndex = 0; oldIndex < bufferInfo.matrices.length + indicesToRemove.length /* Original length estimate */; oldIndex++) {
                  // Check if this old index was removed
                  if (!indicesToRemove.includes(oldIndex)) {
                       indexRemapping.set(oldIndex, newIndex);
                       newIndex++;
                  }
             }
              // Apply remapping to blockInstanceIndex
              this.blockInstanceIndex.forEach((info, key) => {
                   if (info.type === type) {
                        const remappedIndex = indexRemapping.get(info.index);
                        if (remappedIndex !== undefined) {
                             info.index = remappedIndex;
                        } else {
                             // This should not happen if logic is correct, but handle defensively
                             console.warn(`[WorldMapManager:${this.rootNode.name}] Could not remap index for key ${key} (Type: ${type}, OldIndex: ${info.index})`);
                              // Maybe delete the entry?
                             this.blockInstanceIndex.delete(key);
                        }
                   }
              });


             bufferInfo.needsRebuild = true; // Mark buffer for rebuild
        });

        return changed;
    }


    /** Updates the actual thin instance buffers in the render loop */
    private updateInstanceBuffers = () => {
        if (!this.buffersNeedRebuild) return;

        // console.log(`[WorldMapManager:${this.rootNode.name}] Updating instance buffers...`);
        let bufferUpdated = false;
        this.instanceBuffersInfo.forEach((bufferInfo, blockType) => {
            if (bufferInfo.needsRebuild && bufferInfo.baseMesh) {
                // --- Correct way to get Float32Array from Matrices ---
                const matrixBuffer = new Float32Array(bufferInfo.matrices.length * 16);
                for (let i = 0; i < bufferInfo.matrices.length; i++) {
                    const matrix = bufferInfo.matrices[i];
                    matrix.copyToArray(matrixBuffer, i * 16);
                }
                // --- End Correction ---

                bufferInfo.baseMesh.thinInstanceSetBuffer("matrix", matrixBuffer, 16, false);
                bufferInfo.buffer = matrixBuffer; // Store if needed
                bufferInfo.needsRebuild = false;
                bufferUpdated = true;
                // console.log(`[WorldMapManager:${this.rootNode.name}] Set buffer for ${blockType} with ${bufferInfo.matrices.length} instances.`);
            }
        });

        if(bufferUpdated) {
             // console.log(`[WorldMapManager:${this.rootNode.name}] Finished updating instance buffers.`);
        }
        this.buffersNeedRebuild = false; // Reset global flag
    }

    /** Gets or creates a base mesh (template) for a block type */
    private async getBaseBlockMesh(blockType: string): Promise<B.Mesh | null> {
        if (this.baseBlockMeshes.has(blockType)) {
            return this.baseBlockMeshes.get(blockType)!;
        }
        // Check if already loading/placeholder exists
        if (this.instanceBuffersInfo.has(blockType)) {
             // If mesh already exists on placeholder, return it
             if(this.instanceBuffersInfo.get(blockType)?.baseMesh) {
                 return this.instanceBuffersInfo.get(blockType)!.baseMesh;
             }
             // Otherwise, still loading, await below will handle
        } else {
            // Create placeholder buffer info if loading starts here
            this.instanceBuffersInfo.set(blockType, { baseMesh: null!, matrices: [], buffer: null, needsRebuild: false });
        }

        console.log(`[WorldMapManager:${this.rootNode.name}] Loading base mesh for type: ${blockType}`);
        let mesh: B.Mesh | null = null;

        try { /* ... try loading model ... */
            // const modelPath = `/assets/models/blocks/${blockType}.glb`;
            const loadedMeshes = [B.CreateBox('base', { size: 1 })];
            if (loadedMeshes && loadedMeshes.length > 0) {
                mesh = loadedMeshes[0] as B.Mesh;
                mesh.name = `base_${blockType}`;
                // ... configure mesh for instancing (isVisible=true, isEnabled=true, parent=rootNode etc) ...
                mesh.isVisible = true; mesh.setEnabled(true); mesh.isPickable = false;
                mesh.doNotSyncBoundingInfo = true; mesh.cullingStrategy = B.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
                mesh.position = B.Vector3.Zero(); mesh.rotationQuaternion = null; mesh.rotation = B.Vector3.Zero(); mesh.scaling = B.Vector3.One();
                if (!mesh.material) mesh.material = this.getBlockMaterial(blockType);
                else this.blockMaterials.set(blockType, mesh.material);
                 mesh.parent = this.rootNode;
            } else { console.warn(`[WorldMapManager:${this.rootNode.name}] Model loading returned no meshes for ${blockType}.`);}
        } catch (e) { console.error(`[WorldMapManager:${this.rootNode.name}] Error loading block model ${blockType}:`, e); }

        if (!mesh) { /* ... create placeholder box ... */
            mesh = B.MeshBuilder.CreateBox(`base_${blockType}_placeholder`, { size: 1 }, this.scene);
            mesh.material = this.getBlockMaterial(blockType);
            mesh.isVisible = true; mesh.setEnabled(true); mesh.isPickable = false;
            mesh.doNotSyncBoundingInfo = true; mesh.cullingStrategy = B.AbstractMesh.CULLINGSTRATEGY_BOUNDINGSPHERE_ONLY;
            mesh.parent = this.rootNode;
        }

        // Store the base mesh and update buffer info
        this.baseBlockMeshes.set(blockType, mesh);
        const bufferInfo = this.instanceBuffersInfo.get(blockType);
        if (bufferInfo) bufferInfo.baseMesh = mesh;
        else this.instanceBuffersInfo.set(blockType, { baseMesh: mesh, matrices: [], buffer: null, needsRebuild: false }); // Should not happen if logic correct

        return mesh;
    }

    /** Gets or creates a simple material for a block type */
    private getBlockMaterial(blockType: string): B.Material {
        // (Same as before)
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

    public dispose(): void {
        console.log(`[WorldMapManager:${this.rootNode.name}] Disposing...`);
        this.scene.onBeforeRenderObservable.removeCallback(this.updateInstanceBuffers);
        // this.storeUnsubscribe?.(); // Unsubscribe if store ref is held
        this.baseBlockMeshes.forEach(mesh => mesh.dispose());
        this.baseBlockMeshes.clear();
        this.blockMaterials.forEach(mat => mat.dispose());
        this.blockMaterials.clear();
        this.rootNode.dispose(false, true);
        this.instanceBuffersInfo.clear();
        this.chunkBlockTypes.clear();
        this.blockInstanceIndex.clear();
        console.log(`[WorldMapManager:${this.rootNode.name}] Disposed.`);
    }
}

// Make sure Zustand is imported if using the subscribe method directly here
import { useWorldStore } from '../../state/worldStore';