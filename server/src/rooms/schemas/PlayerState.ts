// Schema defining the data structure for each player entry within GameRoomState. Includes essential data like character name, ID, potentially guild tag, alongside EntityState data.
import { Schema, MapSchema, type } from "@colyseus/schema";
import { IPlayerState } from "@shared/types";
export class PlayerState extends Schema implements IPlayerState { // Optionally implement shared interface
    @type("string") sessionId: string; // Colyseus client session ID
    @type("string") characterId: string; // Link to the Character ID
    @type("string") entityId: string; // Link to entity ID
    @type("string") characterName: string = "Unknown";
    @type("number") level: number = 1;
    // Add other player-specific, non-component data here (e.g., account flags, maybe currency summary)
    // @type({ map: "number" }) currencies = new MapSchema<number>();
    // @type("boolean") isAdmin: boolean = false;

    // You might not need syncWithEntity if clients can look up the EntityState
    // using characterId (which is the entityId for players in your setup).
    // Removing it simplifies state management. Clients can observe both
    // PlayerState changes and the corresponding EntityState changes.
    /*
    syncWithEntity(entityState: EntityState): void {
        // Example: If you needed to copy transform data directly to PlayerState
        // const transformState = entityState.componentStates.get(TransformComponent.name);
        // if (transformState) {
        //     const data = JSON.parse(transformState.serializedStateJSON);
        //     this.x = data.position?.x;
        //     this.y = data.position?.y;
        //     this.z = data.position?.z;
        // }
    }
    */
}