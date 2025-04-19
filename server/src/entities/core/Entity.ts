// server/src/entities/core/Entity.ts
// Base class representing any object in the game world (players, NPCs, items, blocks).
// Manages its components collection. Includes unique ID.

import { Component } from "./Component";
import { EntityState } from "@/rooms/schemas/EntityState"; // Import schema for serialization type
import { GameRoom } from "@/rooms/GameRoom";
import { generateId } from "colyseus"; // Utility for generating unique IDs

export class Entity {
    public readonly id: string;
    public type: string = "ENTITY"; // Assign a specific type string or use EntityType enum
    public components: Map<string, Component>; // Map constructor name to component instance

    // Reference to the room, set when added to EntityManager
    public room?: GameRoom;

    // Flag to mark for removal
    public markedForRemoval: boolean = false;

    constructor(id: string = generateId()) { // Allow providing an ID or generate one
        this.id = id;
        this.components = new Map<string, Component>();
    }

    /** Adds a component instance to this entity. */
    addComponent(component: Component): void {
        const componentName = component.constructor.name;
        if (this.components.has(componentName)) {
            console.warn(`[Entity ${this.id}] Component ${componentName} already exists. Overwriting.`);
        }
        this.components.set(componentName, component);
        // console.log(`[Entity ${this.id}] Added component: ${componentName}`);
    }

    /** Gets a component instance by its class name. */
    getComponent<T extends Component>(componentClass: { new(...args: any[]): T }): T | undefined {
        return this.components.get(componentClass.name) as T | undefined;
    }

    /** Checks if the entity has a component of a specific class. */
    hasComponent<T extends Component>(componentClass: { new(...args: any[]): T }): boolean {
         return this.components.has(componentClass.name);
    }

    /** Removes a component by its class name. */
    removeComponent<T extends Component>(componentClass: { new(...args: any[]): T }): void {
        const componentName = componentClass.name;
        const component = this.components.get(componentName);
        if (component) {
            component.dispose?.(); // Call dispose if it exists
            this.components.delete(componentName);
            // console.log(`[Entity ${this.id}] Removed component: ${componentName}`);
        }
    }

    /** Initializes all added components (called by EntityManager after creation). */
    initializeComponents(): void {
        this.components.forEach(component => component.initialize?.());
    }

    /** Updates all components attached to this entity. Called by EntityManager. */
    update(deltaTime: number): void {
        if (!this.room) {
             console.warn(`[Entity ${this.id}] Update called without room reference!`);
             return;
        }
        // Iterate using values() to avoid issues if a component removes another during update
        for (const component of this.components.values()) {
            try {
                component.update(deltaTime, this.room);
            } catch (error) {
                console.error(`[Entity ${this.id}] Error updating component ${component.constructor.name}:`, error);
            }
        }
    }

    /** Populates an EntityState schema object with data from this entity's components. */
    serializeState(state: EntityState): void {
        // This needs specific logic based on your components and what EntityState requires
        state.entityId = this.id;
        state.type = this.type as any; // Assuming EntityType enum matches type string

        // Example: Get data from TransformComponent
        const transform = this.getComponent(TransformComponent); // Assumes TransformComponent exists
        if (transform) {
            state.position.x = transform.position.x;
            state.position.y = transform.position.y;
            state.position.z = transform.position.z;
            state.rotationY = transform.rotationY; // Assuming simple Y rotation
        }

        // Example: Get data from RenderableComponent
        // const renderable = this.getComponent(RenderableComponent);
        // if (renderable) {
        //    state.renderId = renderable.renderId;
        // }

        // ... serialize data from other components (Vitals, etc.) into the state object
    }

    /** Cleans up all components when the entity is removed. Called by EntityManager. */
    dispose(): void {
         console.log(`[Entity ${this.id}] Disposing...`);
         this.components.forEach(component => component.dispose?.());
         this.components.clear();
    }
}

// --- Concrete Component Example (Requires TransformComponent file) ---
// This is just to show how serializeState might use a component.
// Put the actual TransformComponent class in its own file.
import { IVector3 } from "@shared/types";
class TransformComponent extends Component {
    public position: IVector3 = { x: 0, y: 0, z: 0 };
    public rotationY: number = 0;
    update(deltaTime: number, room: GameRoom): void { /* Update logic */ }
}
// --- End Concrete Component Example ---