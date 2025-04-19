// client/src/state/worldStore.ts
// Zustand store slice mirroring the relevant synchronized state from the Colyseus GameRoom:
// entity data, player data, map block data. Updated by NetworkService, read by UI and Babylon managers.

import { create } from 'zustand';
import { IEntityState, IPlayerState, IMapChunkState, IQuestLogEntry, IItemStack, ItemSlot } from 'shared/types'; // Import shared interfaces

// Define the shape of the store's state
interface WorldState {
    // Use Record for easier lookup by ID
    entities: Record<string, IEntityState>;
    players: Record<string, IPlayerState>; // Keyed by sessionId
    mapChunks: Record<string, IMapChunkState>; // Keyed by chunkId (e.g., "0_0_0")

    // Local player specific game state subsets (synced or derived)
    localPlayerSessionId: string | null; // SessionID of the current client
    localPlayerCharacterId: string | null; // CharacterID of the current client's player
    inventory: IItemStack[];
    equipment: Partial<Record<ItemSlot, IItemStack>>; // Use Partial as not all slots might be filled
    quests: Record<string, IQuestLogEntry>; // Keyed by questId

    // Actions
    clearWorldState: () => void; // Reset when leaving a room
    setLocalPlayer: (sessionId: string | null, characterId: string | null) => void;
    // Actions to update state based on Colyseus patches
    patchEntities: (changes: Array<{ field: string | number; value: any; previousValue: any; }>, statePatch: Record<string, IEntityState>) => void;
    addEntity: (id: string, entity: IEntityState) => void;
    removeEntity: (id: string) => void;
    patchPlayers: (changes: Array<{ field: string | number; value: any; previousValue: any; }>, statePatch: Record<string, IPlayerState>) => void;
    addPlayer: (id: string, player: IPlayerState) => void;
    removePlayer: (id: string) => void;
    patchMapChunks: (changes: Array<{ field: string | number; value: any; previousValue: any; }>, statePatch: Record<string, IMapChunkState>) => void;
    addMapChunk: (id: string, chunk: IMapChunkState) => void;
    removeMapChunk: (id: string) => void;
    // Actions for local player state updates (inventory, quests etc.)
    updateInventory: (items: IItemStack[]) => void;
    updateEquipment: (equipment: Partial<Record<ItemSlot, IItemStack>>) => void;
    updateQuests: (quests: Record<string, IQuestLogEntry>) => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
    // --- Initial State ---
    entities: {},
    players: {},
    mapChunks: {},
    localPlayerSessionId: null,
    localPlayerCharacterId: null,
    inventory: [],
    equipment: {},
    quests: {},

    // --- Actions ---
    clearWorldState: () => set({
        entities: {},
        players: {},
        mapChunks: {},
        localPlayerSessionId: null,
        localPlayerCharacterId: null,
        inventory: [],
        equipment: {},
        quests: {},
    }),

    setLocalPlayer: (sessionId, characterId) => set({
        localPlayerSessionId: sessionId,
        localPlayerCharacterId: characterId,
    }),

    // --- State Update Actions (Called by NetworkService on Colyseus changes) ---

    // Example generic patcher - Colyseus schema listeners might need more specific updates
    // Note: Colyseus provides .onAdd, .onChange, .onRemove which are generally preferred
    // over direct patching of the entire state object from onStateChange.
    // These add/remove/patch methods below assume you are processing ADD/REMOVE/CHANGE events.

    addEntity: (id, entity) => set(state => ({
        entities: { ...state.entities, [id]: entity }
    })),

    removeEntity: (id) => set(state => {
        const newEntities = { ...state.entities };
        delete newEntities[id];
        return { entities: newEntities };
    }),

    patchEntities: (changes, newState) => set(state => {
         // More sophisticated patching might be needed depending on how onChange works
         // For simplicity here, we just merge the new state chunk
         // A better approach updates only changed fields within an entity
         return { entities: { ...state.entities, ...newState }};
    }),

    addPlayer: (id, player) => set(state => ({
        players: { ...state.players, [id]: player }
    })),

    removePlayer: (id) => set(state => {
        const newPlayers = { ...state.players };
        delete newPlayers[id];
        return { players: newPlayers };
    }),

     patchPlayers: (changes, newState) => set(state => ({
         players: { ...state.players, ...newState }
     })),

     // Similar add/remove/patch for mapChunks...
     addMapChunk: (id, chunk) => set(state => ({
        mapChunks: { ...state.mapChunks, [id]: chunk }
     })),
     removeMapChunk: (id) => set(state => {
        const newChunks = { ...state.mapChunks };
        delete newChunks[id];
        return { mapChunks: newChunks };
     }),
     patchMapChunks: (changes, newState) => set(state => ({
         mapChunks: { ...state.mapChunks, ...newState }
     })),


    // --- Local Player State Updates ---
    updateInventory: (items) => set({ inventory: items }),
    updateEquipment: (equipment) => set({ equipment: equipment }),
    updateQuests: (quests) => set({ quests: quests }),

}));

// Selectors for convenience
export const selectEntities = (state: WorldState) => state.entities;
export const selectLocalPlayerEntity = (state: WorldState): IEntityState | undefined => {
    const localPlayer = state.players[state.localPlayerSessionId ?? ''];
    return localPlayer ? state.entities[localPlayer.characterId] : undefined;
};
export const selectEntityById = (id: string | undefined) => (state: WorldState): IEntityState | undefined => {
     return id ? state.entities[id] : undefined;
}