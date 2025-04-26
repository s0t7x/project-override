// INTERFACES defining the expected data structure of Colyseus states for type checking.
// These mirror the structure of the actual Colyseus Schema definitions found on the server.
// They help ensure client and server logic agree on the shape of synchronized data.

import { EntityType, ItemSlot, QuestStatus, CurrencyType, GuildRank, InteractionType } from './enums';
import { IVector3, IQuaternion, ICharacterStats, IItemStack, ICharacterCustomization, ICharacterEquipmentVisuals } from './data';

/** Data structure for a simplified character summary, used in CharacterSelectState. */
export interface ICharacterSummary {
    id: string;
    name: string;
    level: number;
    // Add appearance preview data if needed (e.g., sprite ID, main colors)
    previewSpriteId?: string;
    customization?: ICharacterCustomization;
    equipmentVisuals?: ICharacterEquipmentVisuals;
}

/** State synchronized for the Character Selection Room. */
export interface ICharacterSelectState {
    characters: { [characterId: string]: ICharacterSummary }; // Map characterId -> summary
}

/** Data structure for a simplified room listing, used in WorldLobbyState. */
export interface IRoomListing {
    roomId: string;         // Colyseus room instance ID
    name: string;
    ownerName?: string;     // Name of the character who owns the room (if player-owned)
    playerCount: number;
    maxPlayers: number;     // Consider adding if rooms have limits
    isPublic: boolean;
    // Add other relevant info: map name, description snippet?
    mapName?: string;
}

/** State synchronized for the World Lobby Room. */
export interface IWorldLobbyState {
    publicRooms: { [roomId: string]: IRoomListing }; // Map roomId -> listing
    playerRooms: { [roomId: string]: IRoomListing }; // Map roomId -> listing (owned or whitelisted for the current player)
}

/** Base structure for synchronized entity state. */
export interface IEntityState {
    entityId: string;       // The unique ID of this entity instance
    ownerSessionId?: string;// Colyseus client.sessionId if player controlled, otherwise undefined
    componentStates?: { [componentKey: string]: any }
}

/** Structure for synchronized player-specific state, often extending or including entity state. */
export interface IPlayerState extends IEntityState {
    // Player specific data not in base IEntityState
    sessionId: string;      // Colyseus client.sessionId (duplicates ownerSessionId for clarity)
    characterId: string;
    characterName: string;
    level: number;
    // currencies: { [key in CurrencyType]?: number }; // e.g., { BYTES: 100, HACK_CHIPS: 5 }
    guildId?: string;
    guildName?: string;
    guildRank?: GuildRank;
    // Potentially include simplified equipment view for visuals?
    // equippedVisuals: { [slot in ItemSlot]?: string }; // e.g., { HAND_PRIMARY: 'iron_sword_model' }
}

/** Structure for synchronizing data about a chunk of the map's blocks. */
export interface IMapChunkState {
    chunkId: string; // Unique identifier for this chunk (e.g., "0_0_0")
    // Store block data efficiently. Mapping coordinates within the chunk to block type ID.
    // Example: blockData["1_5_3"] = "grass_block_id"
    // Ownership might be tracked separately or included if space permits and needed often.
    blockData: { [localCoords: string]: string }; // Map "x_y_z" relative to chunk origin -> blockTypeId
    blockOwners?: { [localCoords: string]: string }; // Optional: Map "x_y_z" -> ownerCharacterId
}

/** The overall state synchronized for the main Game Room. */
export interface IGameRoomState {
    entities: { [entityId: string]: IEntityState }; // Map entityId -> state
    players: { [sessionId: string]: IPlayerState };   // Map sessionId -> state
    // mapChunks: { [chunkId: string]: IMapChunkState }; // Map chunkId -> state
    // Other global room state? e.g., time of day, weather
    worldTime?: number; // Example: cycle from 0 to 1
    currentWeather?: string; // Example: "sunny", "rainy"
}

/** Structure for a single quest entry in the player's log. */
export interface IQuestLogEntry {
    questId: string;
    status: QuestStatus;
    // Simplified objective progress summary for UI display
    objectiveProgress: { [objectiveKey: string]: { current: number; required: number; description: string } };
    // Maybe quest title/description snippet? Title is likely sufficient.
    title: string;
}

/** Structure for the player's entire quest log state (could be part of PlayerState or separate). */
export interface IPlayerQuestState {
    quests: { [questId: string]: IQuestLogEntry };
}

/** Structure for player inventory (could be part of PlayerState or separate). */
export interface IPlayerInventoryState {
    items: IItemStack[]; // Simple list of items
    capacity: number;
}

/** Structure for player equipment (could be part of PlayerState or separate). */
export interface IPlayerEquipmentState {
    slots: { [key in ItemSlot]?: IItemStack }; // Map slot enum -> equipped item stack (usually quantity 1)
}

// Consider if states like AuthRoomState need specific interfaces, often they are minimal (e.g., just a status string).
export interface IAuthRoomState {
    statusMessage?: string; // e.g., "Authenticating...", "Success", "Error: Invalid Credentials"
}