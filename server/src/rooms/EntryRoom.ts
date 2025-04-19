// server/src/rooms/EntryRoom.ts
// Handles initial anonymous connections, provides server info/background map,
// and directs clients towards authentication (e.g., tells them to join AuthRoom).

import { Room, Client } from 'colyseus';
import { EntryRoomState } from './schemas/EntryRoomState'; // <<< IMPORT State
import { worldService, WorldService } from '../services/WorldService'; // <<< IMPORT WorldService
import { ServerMessageType } from 'shared/types'; // For sending messages

export class EntryRoom extends Room<EntryRoomState> { // <<< Use State
    private worldService: WorldService = worldService;

    onCreate(options: any) {
        console.log(`[EntryRoom ${this.roomId}] Room created.`);
        this.setState(new EntryRoomState()); // <<< Initialize state

        // --- Load and set background map data ---
        (async () => {
            try {
                console.log(`[EntryRoom ${this.roomId}] Loading background map data...`);
                const blockData = await this.worldService.getMapDataById('entry_map'); // Uses cached data if preloaded
                if (blockData && typeof blockData === 'object') {
                    this.state.mapDataJson = JSON.stringify(blockData); // Stringify the JSON
                    console.log(`[EntryRoom ${this.roomId}] Set background map data on state.`);
                } else {
                    console.warn(`[EntryRoom ${this.roomId}] Could not load or invalid block data for background map. State will be null.`);
                    // Attempt to fetch again if cache miss? (WorldService handles caching)
                    this.worldService.getMapDataById(this.worldService.PREDEFINED_MAP_IDS.ENTRY_BACKGROUND)
                    .then(mapData => {
                        if(mapData && typeof mapData.blockData === 'object' && mapData.blockData !== null) {
                            this.state.mapDataJson = JSON.stringify(mapData.blockData);
                            console.log(`[EntryRoom ${this.roomId}] Background map data set after re-fetch.`);
                        }
                    });
                }
            } catch(error) {
                console.error(`[EntryRoom ${this.roomId}] Error loading background map data:`, error);
            }
        })();

        // Example: Set up message handlers if this room does anything specific
        this.onMessage("*", (client, type, message) => {
            console.log(`[EntryRoom ${this.roomId}] Received message type "${type}" from ${client.sessionId}:`, message);
            // For now, just log any messages received
            client.send(ServerMessageType.ERROR_MESSAGE, { message: `EntryRoom does not handle message type: ${type}. Please connect to AuthRoom for login/register.`});
        });
    }

    // No authentication needed to JOIN this room
    // onAuth(...)

    onJoin(client: Client, options?: any) {
        console.log(`[EntryRoom ${this.roomId}] Client ${client.sessionId} joined.`);
        // Client receives the state (including mapDataJson) automatically on join.
        // Send instructions
        client.send("welcome", {
             message: "Welcome to ProjectOverride! Please proceed to AuthRoom for login/registration.",
             // Optionally send room name needed for next step
             authRoomName: "auth_room"
        });
    }

    onLeave(client: Client, consented?: boolean) {
        console.log(`[EntryRoom ${this.roomId}] Client ${client.sessionId} left.`);
    }

    onDispose() {
        console.log(`[EntryRoom ${this.roomId}] Room ${this.roomId} disposing.`);
    }
}