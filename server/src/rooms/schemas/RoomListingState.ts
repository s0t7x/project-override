import { Schema, type } from "@colyseus/schema";
import { ICharacterSummary, IRoomListing } from "@shared/types";
import { CharacterCustomizationState } from "./CharacterCustomizationState";
import { CharacterEquipmentVisualsState } from "./CharacterEquipmentVisualsState";

// Represents the limited data needed for one character in the selection list
export class RoomListingState extends Schema implements IRoomListing {
    @type("string") roomId: string;
    @type("string") name: string;
    @type("string") ownerName?: string;     // Name of the character who owns the room (if player-owned)
    @type("int32") playerCount: number;
    @type("int32") maxPlayers: number;     // Consider adding if rooms have limits
    @type("boolean") isPublic: boolean;
    @type("string") mapName?: string;
}