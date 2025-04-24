// server/src/managers/EntityManager.ts

import { GameRoom } from "@/rooms/GameRoom";
import { Entity } from "./Entity";
import { GameRoomState } from "@/rooms/schemas/GameRoomState"; // Assuming your main room state schema is here
import { EntityState } from "@/rooms/schemas/EntityState";
import { Component } from "@/entities/core/Component";
import { MapSchema } from "@colyseus/schema"; // Import MapSchema

export class EntityManager {
    private room: GameRoom;
    private entities: Map<string, Entity>; // Map<entityId, Entity instance>
    private entitiesToRemove: Set<string>; // Set of entity IDs marked for removal

    constructor(room: GameRoom) {
        this.room = room;
        this.entities = new Map<string, Entity>();
        this.entitiesToRemove = new Set<string>();
        console.log(`[EntityManager] Initialized for room ${room.roomId}`);
    }

    /**
     * Adds an entity to the manager.
     * Sets the entity's room reference and initializes its components.
     * @param entity The entity instance to add.
     * @returns The added entity.
     */
    addEntity(entity: Entity): Entity {
        if (this.entities.has(entity.id)) {
            console.warn(`[EntityManager] Entity with ID ${entity.id} already exists. Skipping add.`);
            return this.entities.get(entity.id)!; // Return existing one
        }

        entity.room = this.room; // **Crucial: Set room reference**
        this.entities.set(entity.id, entity);
        entity.initializeComponents(); // Initialize components *after* being added and having room ref

        console.log(`[EntityManager] Added Entity ${entity.id} (Owner: ${entity.ownerSessionId || 'None'})`);
        // Optional: Immediately add to state if needed, or wait for syncState
        // this.syncEntityState(entity);

        return entity;
    }

    /**
     * Marks an entity for removal at the end of the current update cycle.
     * This prevents issues with modifying the collection while iterating.
     * @param entityId The ID of the entity to mark for removal.
     */
    markEntityForRemoval(entityId: string): void {
        if (this.entities.has(entityId) && !this.entitiesToRemove.has(entityId)) {
             const entity = this.entities.get(entityId);
             if (entity) {
                 console.log(`[EntityManager] Marking Entity ${entityId} for removal.`);
                 entity.markedForRemoval = true; // Set the flag on the entity itself
                 this.entitiesToRemove.add(entityId);
             }
        }
    }

    /**
     * Immediately removes an entity and cleans up its resources.
     * Prefer `markEntityForRemoval` during the update loop.
     * @param entityId The ID of the entity to remove.
     * @returns True if the entity was found and removed, false otherwise.
     */
    private removeEntityImmediate(entityId: string): boolean {
        const entity = this.entities.get(entityId);
        if (entity) {
            console.log(`[EntityManager] Removing Entity ${entityId}.`);
            entity.dispose(); // Clean up components
            this.entities.delete(entityId);

            // Also remove from the Colyseus state immediately
            if (this.room.state.entities.has(entityId)) {
                this.room.state.entities.delete(entityId);
                console.log(`[EntityManager] Removed EntityState ${entityId} from room state.`);
            }
            return true;
        }
        return false;
    }

    /**
     * Retrieves an entity by its unique ID.
     * @param entityId The ID of the entity to find.
     * @returns The entity instance or undefined if not found.
     */
    getEntityById(entityId: string): Entity | undefined {
        return this.entities.get(entityId);
    }

    /**
     * Retrieves all entities currently managed.
     * @returns An array of all entity instances.
     */
    getAllEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    /**
     * Retrieves all entities that have a specific component.
     * @param componentClass The class of the component to look for.
     * @returns An array of entities possessing the specified component.
     */
    getEntitiesByComponent<T extends Component>(componentClass: { new(...args: any[]): T }): Entity[] {
        const results: Entity[] = [];
        for (const entity of this.entities.values()) {
            if (entity.hasComponent(componentClass)) {
                results.push(entity);
            }
        }
        return results;
    }

    /**
     * Retrieves all entities owned by a specific session ID.
     * @param ownerSessionId The session ID of the owner.
     * @returns An array of entities owned by the specified session.
     */
    getEntitiesByOwner(ownerSessionId: string): Entity[] {
        const results: Entity[] = [];
        for (const entity of this.entities.values()) {
            if (entity.ownerSessionId === ownerSessionId) {
                results.push(entity);
            }
        }
        return results;
    }

    /**
     * Updates all managed entities. Called every game tick.
     * Also processes entities marked for removal.
     * @param deltaTime Time elapsed since the last update in seconds.
     */
    update(deltaTime: number): void {
        // 1. Update all active entities
        for (const entity of this.entities.values()) {
            // Skip updating entities already marked for removal
            if (!this.entitiesToRemove.has(entity.id)) {
                try {
                    entity.update(deltaTime);
                } catch (error) {
                    console.error(`[EntityManager] Error updating entity ${entity.id}:`, error);
                    // Optional: Mark entity for removal on error?
                    // this.markEntityForRemoval(entity.id);
                }
            }
        }

        // 2. Process removals
        if (this.entitiesToRemove.size > 0) {
             this.processRemovals();
        }
    }

    /**
     * Performs the actual removal of entities marked for deletion.
     * Called at the end of the update cycle.
     */
    private processRemovals(): void {
        console.log(`[EntityManager] Processing ${this.entitiesToRemove.size} removals.`);
        this.entitiesToRemove.forEach(entityId => {
            this.removeEntityImmediate(entityId);
        });
        this.entitiesToRemove.clear(); // Clear the set for the next cycle
    }

    /**
     * Synchronizes the state of managed entities with the Colyseus RoomState.
     * Creates, updates, or prepares EntityState objects for removal.
     * This should be called typically *before* `room.state.encode()`.
     * @param gameRoomState The main RoomState object from the GameRoom.
     */
    syncState(roomState: GameRoomState): void {
        // Use the MapSchema provided in the room state
        const stateEntities = roomState.entities as MapSchema<EntityState>;

        // 1. Update or Add entities present in the EntityManager
        for (const [entityId, entity] of this.entities.entries()) {
            // Skip entities marked for removal, they will be handled by the cleanup phase
            if (entity.markedForRemoval) continue;

            let entityState = stateEntities.get(entityId);

            // If entity state doesn't exist in the schema, create it
            if (!entityState) {
                entityState = new EntityState();
                stateEntities.set(entityId, entityState);
                 console.log(`[EntityManager] Creating new EntityState for ${entityId} in room state.`);
            }

            // Serialize the entity's current state into the schema object
            // The Entity class handles serializing its components
            entity.serializeState(entityState);
        }

        // 2. Remove entities from state that are no longer in the EntityManager
        // (This is implicitly handled by `removeEntityImmediate` which deletes from `roomState.entities`)
        // However, if an entity was removed *without* calling `removeEntityImmediate` or `markEntityForRemoval`
        // (which shouldn't happen with this design), this cleanup step would be needed:
        /*
        for (const entityIdInState of Array.from(stateEntities.keys())) {
            if (!this.entities.has(entityIdInState)) {
                console.warn(`[EntityManager] Found orphaned EntityState ${entityIdInState} in room state. Removing.`);
                stateEntities.delete(entityIdInState);
            }
        }
        */
    }

    /**
     * Disposes of all managed entities. Called when the room is disposed.
     */
    dispose(): void {
        console.log(`[EntityManager] Disposing all entities for room ${this.room.roomId}...`);
        for (const entityId of Array.from(this.entities.keys())) {
            // Use immediate removal as the room is shutting down
            this.removeEntityImmediate(entityId);
        }
        this.entities.clear();
        this.entitiesToRemove.clear();
        console.log(`[EntityManager] Disposal complete for room ${this.room.roomId}.`);
    }
}