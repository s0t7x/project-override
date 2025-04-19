// server/src/rooms/schemas/EntityState.ts
// Schema defining the data structure for each entity synchronized to clients.

import { Schema, type } from "@colyseus/schema";
import { EntityType, IEntityState } from "@shared/types"; // Use shared types
import { Vector3Schema } from "./Vector3Schema"; // Import Vector3Schema

export class EntityState extends Schema implements IEntityState { // Implement shared interface
    // Note: Don't use @type for the entityId if it's the map key in GameRoomState
    entityId: string = ""; // Set by GameRoom when adding to MapSchema

    @type("string") ownerSessionId?: string; // SessionID if player-controlled
    @type("string") type: EntityType = EntityType.OBJECT; // Default to OBJECT

    @type(Vector3Schema) position = new Vector3Schema();
    // Use number for simple Y rotation, or create a QuaternionSchema if needed
    @type("number") rotationY: number = 0;

    @type("string") renderId: string = "default_cube"; // Default renderable ID
    // Appearance data can be a simple string initially, or a more complex schema
    // @type("string") appearanceData?: string;

    @type("number") currentHP?: number;
    @type("number") maxHP?: number;

    @type("boolean") isInCombat?: boolean;
    @type("boolean") isPvPEnabled?: boolean; // Relevant for players

    @type("string") ownerCharacterId?: string; // For editable entities

    @type("string") currentActionState?: string; // e.g., "idle", "walking"

    // Constructor can be used to initialize with data from an Entity object
    // constructor(entity: Entity) { // Assuming an Entity class exists
    //     super();
    //     this.entityId = entity.id;
    //     // ... copy data from entity components to schema fields
    // }
}