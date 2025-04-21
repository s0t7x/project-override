// server/src/entities/core/Component.ts
// Abstract base class for all components. Defines the 'update' method interface
// and holds a reference to its parent Entity.

import { TransformComponent } from "../components/TransformComponent";
import { Entity } from "./Entity"; // Use Entity type
import { GameRoom } from "@/rooms/GameRoom"; // Import GameRoom for context in update

export abstract class Component {
    protected entity: Entity;

    public isSynchronized: boolean;

    constructor(entity: Entity, isSynchronized: boolean = true) {
        this.entity = entity;
        this.isSynchronized = isSynchronized;
    }

    /**
     * Called every game tick (simulation interval) to update the component's state or logic.
     * @param deltaTime - Time elapsed since the last update, in seconds.
     * @param room - Reference to the GameRoom containing this entity/component.
     */
    abstract update(deltaTime: number, room: GameRoom): void;

    deserialize?(options: any): void {
        const myKeys = Object.keys(this);
        for (const key of Object.keys(options)) {
            if (myKeys.includes(key))
                (this as any)[key] = options[key];
        }
    }

    serialize?(): any {
        const serializedObject: any = {}
        const myKeys = Object.keys(this);
        for (const key of myKeys) {
            if(typeof (this as any)[key] != typeof Function)
                serializedObject[key] = (this as any)[key];
        }
    };

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