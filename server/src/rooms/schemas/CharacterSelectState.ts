// server/src/rooms/schemas/CharacterSelectState.ts
// Schema defining the state for CharacterSelectRoom (e.g., an array or map of character summaries).

import { Schema, MapSchema, type } from "@colyseus/schema";
import { ICharacterSelectState, ICharacterSummary } from "shared/types"; // Use shared interfaces
import { CharacterSummaryState } from "./CharacterSummaryState";

// The main state for the room, containing a map of characters
export class CharacterSelectState extends Schema {
    @type({ map: CharacterSummaryState })
    characters = new MapSchema<CharacterSummaryState>();

    // Add other state if needed (e.g., max characters allowed message)
}