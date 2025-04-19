// server/src/entities/components/TransformComponent.ts
// Manages entity's position, rotation, and potentially scale in the game world.
// Can be updated by physics, player input, or AI.

import { Component } from "@/entities/core/Component";
import { Entity } from "@/entities/core/Entity";
import { GameRoom } from "@/rooms/GameRoom"; // Room reference might be needed for interpolation triggers etc.
import { IVector3, IQuaternion } from "@shared/types"; // Use shared types
import { Vector3Schema } from "@/rooms/schemas/Vector3Schema"; // For convenience if needed

export class TransformComponent extends Component {

    // Public properties directly representing the state
    public position: IVector3;
    // Use a simple yaw for now, expand to Quaternion if needed
    public rotationY: number;
    // Add scale if needed: public scale: IVector3 = { x: 1, y: 1, z: 1 };

    // Internal state for interpolation or physics sync if needed later
    // private _previousPosition: IVector3;

    constructor(entity: Entity, initialPosition: IVector3 = { x: 0, y: 0, z: 0 }, initialRotationY: number = 0) {
        super(entity);
        this.position = { ...initialPosition }; // Create copy
        this.rotationY = initialRotationY;
        // this._previousPosition = { ...initialPosition };
    }

    // The update loop here might not do much if physics/input directly set position.
    // It *could* be used for server-side interpolation logic if desired, but often
    // physics engine updates are read directly when serializing state.
    update(deltaTime: number, room: GameRoom): void {
        // Example: Simple interpolation logic (if not driven by physics)
        // const lerpFactor = 0.1; // Adjust as needed
        // this.position.x = lerp(this._previousPosition.x, this.targetPosition.x, lerpFactor);
        // ... etc ...
        // this._previousPosition = { ...this.position };

        // Or, this might be empty if PhysicsComponent directly updates position before state serialization.
    }

    // Helper methods to modify transform could be added here
    public setPosition(x: number, y: number, z: number): void {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        // Trigger state update or mark dirty if necessary
    }

    public setRotationY(yaw: number): void {
        this.rotationY = yaw;
        // Trigger state update or mark dirty if necessary
    }

    // Override dispose if needed (usually not for Transform)
    // dispose(): void { }

    // Override initialize if needed (usually not for Transform)
    // initialize(): void { }
}

// Helper (if needed for lerp example)
// function lerp(start: number, end: number, amt: number): number {
//     return (1 - amt) * start + amt * end;
// }