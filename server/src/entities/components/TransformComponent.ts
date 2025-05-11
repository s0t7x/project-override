// server/src/entities/components/TransformComponent.ts
// Manages entity's position, rotation, and potentially scale in the game world.
// Can be updated by physics, player input, or AI.

import { Component } from "../core/Component";
import { Entity } from "../core/Entity";
import { GameRoom } from "../../rooms/GameRoom"; // Room reference might be needed for interpolation triggers etc.
import { IVector3, IQuaternion } from "@shared/types"; // Use shared types

export class TransformComponent extends Component {
    public position: IVector3;
    public rotationY: number;
    public scale: IVector3;

    constructor(
        entity: Entity, 
        initialPosition: IVector3 = { x: 0, y: 0, z: 0 }, 
        initialRotationY: number = 0, 
        initialScale: IVector3 = { x: 1, y: 1, z: 1 }
    ) {
        super(entity);
        this.position = { ...initialPosition };
        this.rotationY = initialRotationY;
        this.scale = { ...initialScale };
    }

    update(deltaTime: number, room: GameRoom): void {

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