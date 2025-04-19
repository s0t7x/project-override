// server/src/rooms/schemas/CharacterSelectState.ts
// Schema defining the state for CharacterSelectRoom (e.g., an array or map of character summaries).

import { Schema, MapSchema, type } from "@colyseus/schema";
import { ICharacterSelectState, ICharacterSummary } from "shared/types"; // Use shared interfaces

// Represents the limited data needed for one character in the selection list
export class CharacterSummarySchema extends Schema implements ICharacterSummary {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("int32") level: number = 1; // Use appropriate Colyseus number type
    // Add other preview fields if needed and decorate with @type
    // @type("string") previewSpriteId?: string;
}

// The main state for the room, containing a map of characters
export class CharacterSelectState extends Schema {
    // Use MapSchema for efficient synchronization of collections
    // Key: Character ID, Value: CharacterSummarySchema
    @type({ map: CharacterSummarySchema })
    characters = new MapSchema<CharacterSummarySchema>();

    // Add other state if needed (e.g., max characters allowed message)
}