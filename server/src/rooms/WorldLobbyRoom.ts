import { Room, Client, matchMaker } from 'colyseus';
import { WorldLobbyState } from './schemas/WorldLobbyState';
import { CharacterSummaryState } from './schemas/CharacterSummaryState';

import { authService, AuthService } from '../services/AuthService';
import { characterRepository, CharacterRepository } from '../db/repositories/CharacterRepository';

import {
    ServerMessageType,
} from 'shared/types';
import { roomRepository } from '../db/repositories/RoomRepository';
import { MapSchema } from '@colyseus/schema';
import { RoomListingState } from './schemas/RoomListingState';

export class WorldLobbyRoom extends Room<WorldLobbyState> {
    private clientData = new Map<string, { sessionId: string, character: CharacterSummaryState | null }>();

    // Inject services/repositories (using singletons here)
    private authService: AuthService = authService;
    private characterRepo: CharacterRepository = characterRepository;

    private async refreshRooms() {
        this.state.publicRooms = new MapSchema<RoomListingState>();
        this.state.playerRooms = new MapSchema<RoomListingState>();

        const pubRooms = await roomRepository.findPublicRooms()
        pubRooms.forEach(room => 
            {
                const listing = roomRepository.getRoomListing(room);
                const listingState = new RoomListingState()
                listingState.assign({...listing})
                this.state.publicRooms.set(room.id, listingState)
            }
        )

        const pRooms = await roomRepository.findPlayerRooms()
        pRooms.forEach(room => 
            {
                const listing = roomRepository.getRoomListing(room);
                const listingState = new RoomListingState()
                listingState.assign({...listing})
                this.state.playerRooms.set(room.id, listingState)
            }
        )
    }

    async onCreate(options: any) {
        console.log(`[WorldLobbyRoom ${this.roomId}] Room created.`);
        this.state = new WorldLobbyState(); // Initialize state

        // --- Message Handlers ---
        this.onMessage("refreshRooms", (client, message) => {
            this.refreshRooms();
        })
        
        // Catch-all for unhandled message types
        this.onMessage("*", (client, type, message) => {
            const data = this.clientData.get(client.sessionId);
            const clientIdDesc = data ? `User ${data.sessionId}` : `Client ${client.sessionId}`;
            console.warn(`[WorldLobbyRoom ${this.roomId}] Received unhandled message type "${type}" from ${clientIdDesc}`);
            client.send(ServerMessageType.ERROR_MESSAGE, { message: `Character Select does not handle message type: ${type}`});
        });

    }

    // Authenticate client using JWT passed in options
    async onAuth(client: Client, options: any, request?: any): Promise<any> {
        console.log(`[WorldLobbyRoom ${this.roomId}] onAuth attempt from ${client.sessionId}`);
        if (!options || !options.token) {
            throw new Error("Auth token missing.");
        }

        const userData = this.authService.verifyJwt(options.token);
        if (!userData || !userData.userId) {
            throw new Error("Invalid auth token.");
        }

        if (!options || !options.characterId) {
            throw new Error("CharacterId missing.");
        }
        const charData = await characterRepository.findById(options.characterId)
        if (!charData || !charData.id || userData.userId !== charData.userId ) {
            throw new Error("Invalid characterId.");
        }

        console.log(`[WorldLobbyRoom ${this.roomId}] Client ${client.sessionId} authenticated as user ${userData.userId} with char ${charData.id}`);

        return { userId: userData.userId, token: options.token, character: charData };
    }

    // Called after successful onAuth
    async onJoin(client: Client, options?: any, authData?: any) {
        // authData contains the object returned from onAuth
        const userId = authData?.userId;
        const character = authData?.character;
        if (!userId || !character) {
            console.error(`[WorldLobbyRoom ${this.roomId}] AuthData missing in onJoin for client ${client.sessionId}. Disconnecting.`);
            client.leave(1001, "Authentication data missing.");
            return;
        }

        console.log(`[WorldLobbyRoom ${this.roomId}] Client ${client.sessionId} (Character ${character.id}) joined.`);
        
        // Load character for this user
        try {
            const characterSummary = await this.characterRepo.getSummary(character);
            if(!characterSummary) throw Error('Character not found');
            this.clientData.set(client.sessionId, { sessionId: userId, character: characterSummary }); // Store userId for this session
            this.state.characterSummary = characterSummary;
            this.refreshRooms();
        } catch (error) {
            console.error(`[WorldLobbyRoom ${this.roomId}] Error fetching character for user ${userId} with Id ${character.id}:`, error);
            client.leave(1001, "Error fetching character data.");
        }
    }

    async onLeave(client: Client, consented: boolean) {
        const data = this.clientData.get(client.sessionId);
        const userIdDesc = data ? `User ${data.sessionId}` : 'Unknown User';
        console.log(`[WorldLobbyRoom ${this.roomId}] Client ${client.sessionId} (${userIdDesc}) left (${consented ? 'consented' : 'unexpected'}).`);

        // Clean up client data mapping
        this.clientData.delete(client.sessionId);
    }

    async onDispose() {
        console.log(`[WorldLobbyRoom ${this.roomId}] Room disposing.`);
        this.clientData.clear();
    }
}