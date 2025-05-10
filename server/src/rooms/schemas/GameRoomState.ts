// The main schema for the core ProjectOverride game room. 
// Contains MapSchema<EntityState> for entities, MapSchema<PlayerState> for players, 
import { Schema, MapSchema, type } from "@colyseus/schema";
import { IGameRoomState } from "@shared/types";
import { PlayerState } from "./PlayerState";
import { EntityState } from "./EntityState";

// and potentially MapSchema<MapChunkState> or similar for world block data.
export class GameRoomState extends Schema { // Optionally implement shared interface
    @type("string") mapId: string = "default_map"; // ID of the current map/scene
    @type("number") serverTime: number = 0; // Server clock time

    // Collections of synchronized objects
    @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
    @type({ map: EntityState }) entities = new MapSchema<EntityState>();

    // Add other global room state fields as needed
    // @type("string") weather: string = "sunny";
}
