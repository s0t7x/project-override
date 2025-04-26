// server/src/rooms/CharacterSelectRoom.ts
// Requires JWT auth. Fetches character list for the authenticated user,
// handles character creation and selection messages, updates CharacterSelectState.

import { Room, Client, matchMaker } from 'colyseus';
import { CharacterSelectState } from './schemas/CharacterSelectState'; // Import room's schema
import { CharacterSummaryState } from './schemas/CharacterSummaryState';

// Import services and repositories
import { authService, AuthService } from '../services/AuthService';
import { characterRepository, CharacterRepository } from '../db/repositories/CharacterRepository';

// Import shared types for messages and enums
import {
    ICreateCharacterPayload,
    ISelectCharacterPayload,
    ServerMessageType,
    IErrorMessagePayload,
    IInfoMessagePayload
} from 'shared/types';
import { CharacterCustomizationState } from './schemas/CharacterCustomizationState';
import { Color3Schema } from './schemas/Color3Schema';
import { CharacterEquipmentVisualsState } from './schemas/CharacterEquipmentVisualsState';

export class CharacterSelectRoom extends Room<CharacterSelectState> {
    // Max characters per user (example)
    maxCharactersPerUser: number = 5;

    // Store userId associated with client session for easy access in messages
    private clientData = new Map<string, { userId: string }>();

    // Inject services/repositories (using singletons here)
    private authService: AuthService = authService;
    private characterRepo: CharacterRepository = characterRepository;

    async onCreate(options: any) {
        console.log(`[CharSelectRoom ${this.roomId}] Room created.`);
        this.setState(new CharacterSelectState()); // Initialize state

        // --- Message Handlers ---

        // Handle Character Creation Request
        this.onMessage<ICreateCharacterPayload>("createCharacter", async (client, payload) => {
            const data = this.clientData.get(client.sessionId);
            if (!data) {
                console.warn(`[CharSelectRoom ${this.roomId}] Received createCharacter from unknown client ${client.sessionId}`);
                client.send(ServerMessageType.ERROR_MESSAGE, { message: "Authentication data not found." });
                return;
            }
            const { userId } = data;

            console.log(`[CharSelectRoom ${this.roomId}] User ${userId} requested character creation: Name "${payload.name}"`);

            // Validation
            if (!payload.name || payload.name.length < 3 || payload.name.length > 16) {
                client.send(ServerMessageType.ERROR_MESSAGE, { message: "Character name must be between 3 and 16 characters." });
                return;
            }
            // Basic name validation (prevent only spaces, etc.) - add more robust validation
            if (!payload.name.trim()) {
                 client.send(ServerMessageType.ERROR_MESSAGE, { message: "Character name cannot be empty." });
                 return;
            }
             // Check character limit
             if (this.state.characters.size >= this.maxCharactersPerUser) {
                 client.send(ServerMessageType.ERROR_MESSAGE, { message: `Maximum characters (${this.maxCharactersPerUser}) reached.` });
                 return;
             }

            // Check if name already exists (case-insensitive check might be better)
             const nameExists = await this.characterRepo.nameExists(payload.name);
             if (nameExists) {
                 client.send(ServerMessageType.ERROR_MESSAGE, { message: `Character name "${payload.name}" is already taken.` });
                 return;
             }

            
            const characterCustomizationState = new CharacterCustomizationState();
            if(payload.customization) {
                characterCustomizationState.assign({ 
                    baseSpriteSheet: payload.customization.baseSpriteSheet,
                    baseColor: new Color3Schema(payload.customization.baseColor.r, payload.customization.baseColor.g, payload.customization.baseColor.b),
                    eyesSpriteSheet: payload.customization.eyesSpriteSheet,
                    eyesColor: new Color3Schema(payload.customization.eyesColor.r, payload.customization.eyesColor.g, payload.customization.eyesColor.b),
                    hairSpriteSheet: payload.customization.hairSpriteSheet,
                    hairColor: new Color3Schema(payload.customization.hairColor.r, payload.customization.hairColor.g, payload.customization.hairColor.b),
                });
            }

            const characterEquipmentVisualsState = new CharacterEquipmentVisualsState();

            // Attempt to create character in DB
            try {
                const newCharacter = await this.characterRepo.create({
                    userId: userId,
                    name: payload.name,
                    customization: characterCustomizationState
                });

                if (newCharacter) {
                    // Add new character summary to room state
                    const summary = new CharacterSummaryState().assign({
                        id: newCharacter.id,
                        name: newCharacter.name,
                        level: newCharacter.level,
                        customization: characterCustomizationState,
                        equipmentVisuals: characterEquipmentVisualsState
                        // Assign appearance data to schema if applicable
                    });
                    this.state.characters.set(newCharacter.id, summary);
                    console.log(`[CharSelectRoom ${this.roomId}] Character "${newCharacter.name}" created for user ${userId}.`);
                    client.send(ServerMessageType.INFO_MESSAGE, { message: `Character "${newCharacter.name}" created!`, characterId: newCharacter.id });
                } else {
                    // Creation failed (likely caught by repo checks, but handle null just in case)
                    client.send(ServerMessageType.ERROR_MESSAGE, { message: "Failed to create character. Please try again." });
                }
            } catch (error) {
                console.error(`[CharSelectRoom ${this.roomId}] Error creating character for user ${userId}:`, error);
                client.send(ServerMessageType.ERROR_MESSAGE, { message: "Server error creating character." });
            }
        });

        this.onMessage<ISelectCharacterPayload>("deleteCharacter", async (client, payload) => {
            const data = this.clientData.get(client.sessionId);
            if (!data) {
                client.send(ServerMessageType.ERROR_MESSAGE, { message: "Authentication data not found." });
                return;
            }
            const { userId } = data;
            const { characterId } = payload;

            console.log(`[CharSelectRoom ${this.roomId}] User ${userId} deletes character ${characterId}`);

            // Validate selection
            const characterSummary = this.state.characters.get(characterId);
            if (!characterSummary) {
                 client.send(ServerMessageType.ERROR_MESSAGE, { message: "Invalid character." });
                 return;
            }

            // Double-check ownership in DB for security (optional but recommended)
            const characterDb = await this.characterRepo.findById(characterId);
            if (!characterDb || characterDb.userId !== userId) {
                console.warn(`[CharSelectRoom ${this.roomId}] Security warning: Client ${client.sessionId} tried to delete character ${characterId} not owned by user ${userId}.`);
                client.send(ServerMessageType.ERROR_MESSAGE, { message: "Character selection mismatch." });
                return;
            }

            await this.characterRepo.delete(characterId);
            this.state.characters.delete(characterId);

            client.send(ServerMessageType.INFO_MESSAGE, { message: `Character "${characterDb.name}" deleted!`, characterId: characterId });
        });

         // Catch-all for unhandled message types
         this.onMessage("*", (client, type, message) => {
             const data = this.clientData.get(client.sessionId);
             const clientIdDesc = data ? `User ${data.userId}` : `Client ${client.sessionId}`;
             console.warn(`[CharSelectRoom ${this.roomId}] Received unhandled message type "${type}" from ${clientIdDesc}`);
             client.send(ServerMessageType.ERROR_MESSAGE, { message: `Character Select does not handle message type: ${type}`});
         });
    }

    // Authenticate client using JWT passed in options
    async onAuth(client: Client, options: any, request?: any): Promise<any> {
        console.log(`[CharSelectRoom ${this.roomId}] onAuth attempt from ${client.sessionId}`);
        if (!options || !options.token) {
            throw new Error("Auth token missing.");
        }

        const userData = this.authService.verifyJwt(options.token);
        if (!userData || !userData.userId) {
            throw new Error("Invalid auth token.");
        }

        console.log(`[CharSelectRoom ${this.roomId}] Client ${client.sessionId} authenticated as user ${userData.userId}`);
        // Store the verified token on the auth object if needed later (e.g., for selectCharacter)
        // This `auth` object is available on the `client` instance later
        return { userId: userData.userId, token: options.token }; // Pass userId and token to onJoin
    }

    // Called after successful onAuth
    async onJoin(client: Client, options?: any, authData?: any) {
        // authData contains the object returned from onAuth
        const userId = authData?.userId;
        if (!userId) {
            console.error(`[CharSelectRoom ${this.roomId}] User ID missing in onJoin for client ${client.sessionId}. Disconnecting.`);
            client.leave(1001, "Authentication data missing.");
            return;
        }

        console.log(`[CharSelectRoom ${this.roomId}] Client ${client.sessionId} (User ${userId}) joined.`);
        this.clientData.set(client.sessionId, { userId: userId }); // Store userId for this session

        // Load characters for this user
        try {
            const characters = await this.characterRepo.findByUserId(userId);
            console.log(`[CharSelectRoom ${this.roomId}] Found ${characters.length} characters for user ${userId}.`);

            // Populate initial state for the joining client (and existing clients)
            characters.forEach(char => {
                // Avoid adding duplicates if state already populated by another client's join? Usually not needed.
                if (!this.state.characters.has(char.id)) {
                    this.characterRepo.getSummary(char).then((summary) => {
                        if(summary)
                            this.state.characters.set(char.id, summary);
                    })
                }
            });
        } catch (error) {
            console.error(`[CharSelectRoom ${this.roomId}] Error fetching characters for user ${userId}:`, error);
            client.leave(1001, "Error fetching character data.");
        }
    }

    async onLeave(client: Client, consented: boolean) {
        const data = this.clientData.get(client.sessionId);
        const userIdDesc = data ? `User ${data.userId}` : 'Unknown User';
        console.log(`[CharSelectRoom ${this.roomId}] Client ${client.sessionId} (${userIdDesc}) left (${consented ? 'consented' : 'unexpected'}).`);

        // Clean up client data mapping
        this.clientData.delete(client.sessionId);
    }

    async onDispose() {
        console.log(`[CharSelectRoom ${this.roomId}] Room disposing.`);
        this.clientData.clear();
    }
}