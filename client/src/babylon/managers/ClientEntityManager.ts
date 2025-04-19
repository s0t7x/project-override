// client/src/babylon/managers/ClientEntityManager.ts
// Subscribes to entity state changes (from worldStore) and creates, updates
// (position interpolation, appearance), or removes BabylonJS Nodes (Meshes/Sprites)
// in the active scene to visually represent server state.

import * as B from '@babylonjs/core';
import { AssetService } from '@/services/AssetService';
// import { CameraManager } from './CameraManager'; // Needed if attaching camera target
import { useWorldStore } from '@/state/worldStore'; // To get entity data
import { IEntityState } from '@shared/types'; // Shared type

export class ClientEntityManager {
    private scene: B.Scene;
    private assetService: AssetService;
    // private cameraManager: CameraManager;

    // Store mapping from entity ID to BabylonJS node (Mesh, TransformNode, Sprite)
    private entityNodes: Map<string, B.Node> = new Map();

    private storeUnsubscribe: (() => void) | null = null; // Function to unsubscribe from store

    constructor(scene: B.Scene, assetService: AssetService /*, cameraManager: CameraManager*/) {
        this.scene = scene;
        this.assetService = assetService;
        // this.cameraManager = cameraManager;
        console.log("[ClientEntityManager] Initialized.");

        this.subscribeToWorldState();
    }

    private subscribeToWorldState(): void {
        console.log("[ClientEntityManager] Subscribing to world state...");
        // Subscribe to the entities part of the world store
        this.storeUnsubscribe = useWorldStore.subscribe(
            // Selector: return the entities object
            (state) => state.entities,
            // Handler: process the changes
            (entities, previousEntities) => {
                this.syncEntities(entities, previousEntities);
            },
            // Optional: Use shallow equality for the top-level entities object reference
            { equalityFn: shallow }
        );

         // Handle initial state if store already populated
         const initialEntities = useWorldStore.getState().entities;
         if (Object.keys(initialEntities).length > 0) {
             console.log("[ClientEntityManager] Processing initial entities from store.");
             this.syncEntities(initialEntities, {}); // Process initial state against empty previous state
         }
    }

    /** Compares current entities state with previous state and updates BJS scene */
    private syncEntities(currentEntities: Record<string, IEntityState>, previousEntities: Record<string, IEntityState>) {
         // console.log("[ClientEntityManager] Syncing entities..."); // Can be noisy

        const currentIds = new Set(Object.keys(currentEntities));
        const previousIds = new Set(Object.keys(previousEntities));

        // 1. Handle added entities
        currentIds.forEach(id => {
            if (!previousIds.has(id)) {
                this.createEntityVisuals(id, currentEntities[id]);
            }
        });

        // 2. Handle removed entities
        previousIds.forEach(id => {
            if (!currentIds.has(id)) {
                this.removeEntityVisuals(id);
            }
        });

         // 3. Handle updated entities (those present in both)
         currentIds.forEach(id => {
             if (previousIds.has(id)) {
                 // Check if data actually changed before updating visuals
                 if (currentEntities[id] !== previousEntities[id]) {
                     this.updateEntityVisuals(id, currentEntities[id], previousEntities[id]);
                 }
             }
         });
    }

    private async createEntityVisuals(id: string, entityState: IEntityState) {
        console.log(`[ClientEntityManager] Creating visuals for entity: ${id}`);
        if (this.entityNodes.has(id)) {
            console.warn(`[ClientEntityManager] Attempted to create visuals for existing entity: ${id}`);
            return; // Already exists
        }

        // Example: Create a simple box placeholder or load actual model
        let node: B.Node | null = null;

        // TODO: Replace with logic based on entityState.type and entityState.renderId
        // Example loading a model based on renderId
        if (entityState.renderId && entityState.renderId !== 'default_cube') {
            try {
                // This assumes loadMesh returns the root node or first mesh
                const loadedMeshes = await this.assetService.loadMesh(`/assets/models/${entityState.renderId}.glb`); // Adjust path as needed
                if (loadedMeshes && loadedMeshes.length > 0) {
                    node = loadedMeshes[0]; // Use the first mesh as the main node
                    node.name = `entity_${id}`;
                    // Parent other meshes to the root if multiple were loaded
                    for (let i = 1; i < loadedMeshes.length; i++) {
                        loadedMeshes[i].parent = node;
                    }
                     console.log(`[ClientEntityManager] Loaded model ${entityState.renderId} for entity ${id}`);
                } else {
                     console.warn(`[ClientEntityManager] Failed to load model for ${id}, using placeholder.`);
                }
            } catch (error) {
                 console.error(`[ClientEntityManager] Error loading model for ${id}:`, error);
            }
        }

         // Fallback to placeholder if loading failed or no renderId specified
         if (!node) {
            const mesh = B.MeshBuilder.CreateBox(`entity_${id}_placeholder`, { size: 1 }, this.scene);
            mesh.material = new B.StandardMaterial(`mat_${id}`, this.scene);
            (mesh.material as B.StandardMaterial).diffuseColor = B.Color3.Random(); // Random color placeholder
             node = mesh;
         }

         // Set initial position and rotation (without interpolation)
         node.position.set(entityState.position.x, entityState.position.y, entityState.position.z);
         node.rotation.y = entityState.rotationY ?? 0; // Assuming simple Y rotation

         // Enable the mesh/node
         node.setEnabled(true);

        this.entityNodes.set(id, node);

        // Special handling for local player (e.g., set camera target)
        const localPlayerCharId = useWorldStore.getState().localPlayerCharacterId;
        if (id === localPlayerCharId && node instanceof B.AbstractMesh) {
             console.log(`[ClientEntityManager] Attaching camera target to local player: ${id}`);
             // this.cameraManager.setTarget(node); // Uncomment when CameraManager is integrated
        }
    }

    private removeEntityVisuals(id: string) {
         console.log(`[ClientEntityManager] Removing visuals for entity: ${id}`);
        const node = this.entityNodes.get(id);
        if (node) {
            node.dispose(); // Dispose the BabylonJS node and its children/materials
            this.entityNodes.delete(id);
        } else {
             console.warn(`[ClientEntityManager] Could not find node to remove for entity: ${id}`);
        }
    }

    // Called when an entity's state changes in the store
    private updateEntityVisuals(id: string, currentState: IEntityState, previousState: IEntityState) {
        // console.log(`[ClientEntityManager] Updating visuals for entity: ${id}`); // Noisy
        const node = this.entityNodes.get(id);
        if (!node) {
             console.warn(`[ClientEntityManager] Could not find node to update for entity: ${id}`);
             // Attempt to recreate if node is missing but state exists?
             // this.createEntityVisuals(id, currentState);
             return;
        }

        // --- Interpolate Position ---
        // TODO: Implement smooth interpolation instead of direct setting
        node.position.set(currentState.position.x, currentState.position.y, currentState.position.z);

        // --- Update Rotation ---
        // TODO: Interpolate rotation smoothly if needed (esp. for Quaternions)
         if (node.rotationQuaternion) {
             // Logic for quaternion rotation if using it
         } else {
              node.rotation.y = currentState.rotationY ?? 0;
         }


        // --- Update Appearance ---
        // TODO: Check if renderId or appearanceData changed and update material/mesh/sprite
         // if (currentState.renderId !== previousState.renderId) { ... reload mesh ... }
         // if (currentState.appearanceData !== previousState.appearanceData) { ... update material ... }


        // --- Update Action State ---
        // TODO: Trigger animations based on currentState.currentActionState
        // if (currentState.currentActionState !== previousState.currentActionState) { ... play animation ... }

    }

    /** Called when the manager should clean up (e.g., scene disposal). */
    public dispose(): void {
        console.log("[ClientEntityManager] Disposing...");
        // Unsubscribe from the store to prevent memory leaks
        this.storeUnsubscribe?.();
        this.storeUnsubscribe = null;

        // Dispose all created BabylonJS nodes
        this.entityNodes.forEach(node => node.dispose());
        this.entityNodes.clear();
    }
}

// Helper for store subscription (can put in a utils file)
// Replace with actual shallow import from zustand/shallow if needed
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