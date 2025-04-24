// server/src/entities/core/Entity.ts
// Base class representing any object in the game world (players, NPCs, items, blocks).
// Manages its components collection. Includes unique ID.

import { generateId } from "colyseus"; // Utility for generating unique IDs
import { Component } from "./Component";
import { EntityState } from "@/rooms/schemas/EntityState"; // Import schema for serialization type
import { GameRoom } from "@/rooms/GameRoom";
import { ComponentFactory } from "../factories/ComponentFactory";
import { ComponentState } from "@/rooms/schemas/ComponentState";

export class Entity {
    public id: string;
    public components: Map<string, Component>; // Map constructor name to component instance

    // Reference to the room, set when added to EntityManager
    public room?: GameRoom;

    public ownerSessionId: string | null

    // Flag to mark for removal
    public markedForRemoval: boolean = false;

    constructor(id: string = generateId(), ownerSessionId: string | null = null) { // Allow providing an ID or generate one
        this.id = id;
        this.ownerSessionId = ownerSessionId;
        this.components = new Map<string, Component>();
    }

    isProxy(): boolean {
        return (this.ownerSessionId != null && this.ownerSessionId.length > 0)
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
        state.entityId = this.id;
        state.ownerSessionId = this.ownerSessionId || undefined;
        for(const [componentKey, component] of this.components) {
            if(component.isSynchronized && component.serialize) {
                const compState = new ComponentState();
                compState.serializedStateJSON = JSON.stringify(component.serialize() || {});
                state.componentStates.set(componentKey, compState);
            }
        }
    }

    deserializeState(state: EntityState): void {
        this.id = state.entityId;
        this.ownerSessionId = state.ownerSessionId || null;
        for(const [componentKey, componentState] of state.componentStates) {
            const comp = ComponentFactory.createComponent(this, componentKey, JSON.parse(componentState.serializedStateJSON));
            if(comp)
                this.components.set(componentKey, comp);
        }
    }

    /** Cleans up all components when the entity is removed. Called by EntityManager. */
    dispose(): void {
         console.log(`[Entity ${this.id}] Disposing...`);
         this.components.forEach(component => component.dispose?.());
         this.components.clear();
    }
}