// server/src/rooms/schemas/EntityState.ts
// Schema defining the data structure for each entity synchronized to clients.

import { MapSchema, Schema, type } from "@colyseus/schema";
import { EntityType, IEntityState } from "@shared/types"; // Use shared types
import { Vector3Schema } from "./Vector3Schema"; // Import Vector3Schema
import { ComponentState } from "./ComponentState";

export class EntityState extends Schema implements IEntityState { // Implement shared interface
    // Note: Don't use @type for the entityId if it's the map key in GameRoomState
    entityId: string = ""; // Set by GameRoom when adding to MapSchema

    @type("string") ownerSessionId?: string; // SessionID if player-controlled

    @type({ map: ComponentState })
    componentStates = new MapSchema<ComponentState>();
}