// client/src/babylon/managers/WorldManager.ts
// Subscribes to map data changes (from worldStore) and creates, updates,
// or removes BabylonJS Meshes representing world blocks/terrain in the active scene.
// May use instancing for performance.

import * as B from '@babylonjs/core';
import { AssetService } from '@/services/AssetService';
import { useWorldStore } from '@/state/worldStore'; // To get map data
import { IMapChunkState } from '@shared/types'; // Shared type

export class WorldManager {
    private scene: B.Scene;
    private assetService: AssetService;

    // Store references to created chunk meshes or instance managers
    private chunkNodes: Map<string, B.Node> = new Map(); // Map chunkId to root node for the chunk

    private storeUnsubscribe: (() => void) | null = null;

    constructor(scene: B.Scene, assetService: AssetService) {
        this.scene = scene;
        this.assetService = assetService;
        console.log("[WorldManager] Initialized.");

        this.subscribeToWorldState();
    }

    private subscribeToWorldState(): void {
         console.log("[WorldManager] Subscribing to map chunk state...");
         this.storeUnsubscribe = useWorldStore.subscribe(
            state => state.mapChunks,
            (mapChunks, previousMapChunks) => {
                 this.syncMapChunks(mapChunks, previousMapChunks);
            },
            { equalityFn: shallow } // Use shallow comparison for the mapChunks object
         );

          // Handle initial state
          const initialChunks = useWorldStore.getState().mapChunks;
          if (Object.keys(initialChunks).length > 0) {
              console.log("[WorldManager] Processing initial map chunks from store.");
              this.syncMapChunks(initialChunks, {});
          }
    }

     /** Compares current map chunk state with previous state and updates BJS scene */
     private syncMapChunks(currentChunks: Record<string, IMapChunkState>, previousChunks: Record<string, IMapChunkState>) {
        const currentIds = new Set(Object.keys(currentChunks));
        const previousIds = new Set(Object.keys(previousChunks));

         // Handle added/updated chunks
        currentIds.forEach(id => {
            if (!previousIds.has(id)) {
                // Chunk added
                this.createChunkVisuals(id, currentChunks[id]);
            } else if (currentChunks[id] !== previousChunks[id]) {
                // Chunk updated (blocks changed)
                this.updateChunkVisuals(id, currentChunks[id], previousChunks[id]);
            }
        });

        // Handle removed chunks
        previousIds.forEach(id => {
            if (!currentIds.has(id)) {
                this.removeChunkVisuals(id);
            }
        });
     }

    private createChunkVisuals(chunkId: string, chunkState: IMapChunkState) {
        console.log(`[WorldManager] Creating visuals for chunk: ${chunkId}`);
        if (this.chunkNodes.has(chunkId)) return; // Already exists

        // Create a root node for this chunk
        const chunkRoot = new B.TransformNode(`chunk_${chunkId}`, this.scene);
        this.chunkNodes.set(chunkId, chunkRoot);

        // TODO: Implement block creation logic based on chunkState.blockData
        // - Iterate through chunkState.blockData (mapping local coords to blockTypeId)
        // - Determine world position based on chunkId and local coords
        // - Load/get block mesh template (e.g., using AssetService) based on blockTypeId
        // - Create instances of block meshes and parent them to chunkRoot
        // - Use Thin Instances or Solid Particle System for performance with many blocks

         // Example placeholder: Create a single large box representing the chunk bounds
         const chunkSize = 16; // Assuming a chunk size
         const [cx, cy, cz] = chunkId.split('_').map(Number);
         const centerOffset = chunkSize / 2 - 0.5; // Center box in chunk
         const placeholder = B.MeshBuilder.CreateBox(`chunk_${chunkId}_placeholder`, {size: chunkSize}, this.scene);
         placeholder.position = new B.Vector3(cx * chunkSize + centerOffset, cy * chunkSize + centerOffset, cz * chunkSize + centerOffset);
         placeholder.isPickable = false;
         placeholder.visibility = 0.3; // Make it semi-transparent
         placeholder.parent = chunkRoot;
         // --- End Placeholder ---

        console.log(`[WorldManager] Finished creating visuals for chunk: ${chunkId}`);
    }

    private updateChunkVisuals(chunkId: string, currentState: IMapChunkState, previousState: IMapChunkState) {
         console.log(`[WorldManager] Updating visuals for chunk: ${chunkId}`);
         // This is complex if using instancing. Needs diffing logic.
         // 1. Find blocks that changed type/owner between previousState and currentState.
         // 2. Update the corresponding instances (material, matrix).
         // 3. Add instances for new blocks.
         // 4. Remove instances for deleted blocks.

         // Simple approach: Dispose old and recreate (inefficient for small changes)
         this.removeChunkVisuals(chunkId);
         this.createChunkVisuals(chunkId, currentState);
    }


    private removeChunkVisuals(chunkId: string) {
        console.log(`[WorldManager] Removing visuals for chunk: ${chunkId}`);
        const chunkRoot = this.chunkNodes.get(chunkId);
        if (chunkRoot) {
            chunkRoot.dispose(false, true); // Dispose node and its children
            this.chunkNodes.delete(chunkId);
        }
    }


    public dispose(): void {
        console.log("[WorldManager] Disposing...");
        this.storeUnsubscribe?.();
        this.storeUnsubscribe = null;
        this.chunkNodes.forEach(node => node.dispose(false, true));
        this.chunkNodes.clear();
    }
}

// Helper for store subscription (reuse from ClientEntityManager or put in utils)
function shallow(objA: any, objB: any): boolean {
     if (Object.is(objA, objB)) return true;
    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
        return false;
    }
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) {
            return false;
        }
    }
    return true;
}