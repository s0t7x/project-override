// server/src/entities/core/Component.ts
// Abstract base class for all components. Defines the 'update' method interface
// and holds a reference to its parent Entity.

import { Entity } from "./Entity"; // Use Entity type
import { GameRoom } from "@/rooms/GameRoom"; // Import GameRoom for context in update

export abstract class Component {
    // Reference to the entity this component is attached to.
    // Marked protected so subclasses can access it directly if needed.
    protected entity: Entity;

    constructor(entity: Entity) {
        this.entity = entity;
    }

    /**
     * Called every game tick (simulation interval) to update the component's state or logic.
     * @param deltaTime - Time elapsed since the last update, in seconds.
     * @param room - Reference to the GameRoom containing this entity/component.
     */
    abstract update(deltaTime: number, room: GameRoom): void;

    /**
     * Optional: Called when the component is removed from the entity.
     * Useful for cleanup (e.g., removing physics bodies).
     */
    dispose?(): void;

     /**
      * Optional: Called after all components are added during entity creation.
      * Useful for initialization that depends on other components.
      */
     initialize?(): void;
}