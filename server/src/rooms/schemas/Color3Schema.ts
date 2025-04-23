// server/src/rooms/schemas/Vector3Schema.ts
// Basic schema for synchronizing a 3D vector.

import { Schema, type } from '@colyseus/schema';
import { IColor3, IVector3 } from '@shared/types'; // Use shared interface for consistency

export class Color3Schema extends Schema implements IColor3 { // Implement shared interface
    @type("number") r: number = 0;
    @type("number") g: number = 0;
    @type("number") b: number = 0;

    constructor(r: number = 0, g: number = 0, b: number = 0) {
        super();
        this.r = r;
        this.g = g;
        this.b = b;
    }
}