// server/src/rooms/schemas/Vector3Schema.ts
// Basic schema for synchronizing a 3D vector.

import { Schema, type } from '@colyseus/schema';
import { IVector3 } from '@shared/types'; // Use shared interface for consistency

export class Vector3Schema extends Schema implements IVector3 { // Implement shared interface
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        super();
        this.x = x;
        this.y = y;
        this.z = z;
    }
}