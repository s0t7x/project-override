// server/src/rooms/GameRoom.ts
// The core ProjectOverride gameplay room. Manages the game loop, EntityManager,
// handles player input, game logic, and synchronizes GameRoomState.

import { Room, Client, Delayed } from 'colyseus';
import { Schema, MapSchema, ArraySchema } from '@colyseus/schema';

// Import States, Payloads, Enums from Shared
import {
    IGameRoomState, IEntityState, IPlayerState, IMapChunkState, // State Interfaces
    IPlayerInputPayload, // Message Payloads
    EntityType, ServerMessageType, // Enums
    IVector3 // Data types
} from '@shared/types';

// Import Schemas defined on Server
import { GameRoomState } from "./schemas/GameRoomState"; // Assuming these are combined or imported correctly

// Import Core Entity/Component classes
import { Entity } from '../entities/core/Entity';
import { EntityManager } from '../entities/core/EntityManager';
import { TransformComponent } from '../entities/components/TransformComponent';
// import { PlayerInputComponent } from '../entities/components/PlayerInputComponent'; // Needs implementation
// Import other components as needed...

// Import Services
import { authService, AuthService } from '../services/AuthService';
import { userRepository, UserRepository } from '../db/repositories/UserRepository';
import { characterRepository, CharacterRepository } from '../db/repositories/CharacterRepository'; 
import { roomRepository, RoomRepository } from '../db/repositories/RoomRepository'; 
import { PlayerState } from './schemas/PlayerState';
import { EntityState } from './schemas/EntityState';
// import { PersistenceService } from '../services/PersistenceService'; // Needs implementation

// Import Physics Engine (requires setup)
// import { AmmoPhysicsEngine } from '@/physics/AmmoPhysicsEngine';
// import ammoInstance from '@/physics/ammoInitializer'; // Assuming ammoInstance is exported after async init

// Define constant for simulation interval (e.g., 60 updates per second)
const SIMULATION_INTERVAL_MS = 1000 / 60;
// Define interval for less frequent saves (e.g., every 5 minutes)
const PERSISTENCE_INTERVAL_MS = 5 * 60 * 1000;

export class GameRoom extends Room<GameRoomState> {
    // Room properties
    public entityManager: EntityManager;
    // public physicsEngine: AmmoPhysicsEngine; // Enable when AmmoJS is ready
    // private persistenceService: PersistenceService;
    private persistenceInterval?: Delayed; // For periodic saving

    // Injected services (using singletons for simplicity here)
    private authService: AuthService = authService;
    private charRepo: CharacterRepository = characterRepository;
    private roomRepo: RoomRepository = roomRepository;

    // --- Room Lifecycle Methods ---

    async onCreate(options: any) {
        console.log(`[GameRoom ${this.roomId}] Creating room with options:`, options);
        this.setState(new GameRoomState());
        this.entityManager = new EntityManager(this); // Pass room reference
        // this.persistenceService = new PersistenceService(this.charRepo, this.roomRepo); // Pass necessary repos

        // TODO: Initialize Physics Engine (requires Ammo to be loaded first)
        // if (ammoInstance) {
        //     this.physicsEngine = new AmmoPhysicsEngine(ammoInstance, this);
        // } else {
        //     console.error(`[GameRoom ${this.roomId}] AmmoJS not initialized! Physics disabled.`);
        // }


        // --- Load Room Data ---
        const roomIdFromOptions = options.roomId || this.roomId; // Use provided ID or generated one
        console.log(`[GameRoom ${this.roomId}] Attempting to load data for persistent room ID: ${roomIdFromOptions}`);
        // TODO: Load map data based on options.mapId or roomIdFromOptions using RoomRepository/WorldService
        // await this.loadMapData(options.mapId);
        // TODO: Load persistent entities for this room using EntityRepository/WorldService
        // await this.loadPersistentEntities(roomIdFromOptions);


        // --- Set Simulation Interval ---
        this.setSimulationInterval((deltaTime) => this.update(deltaTime), SIMULATION_INTERVAL_MS);
        console.log(`[GameRoom ${this.roomId}] Simulation interval set to ${SIMULATION_INTERVAL_MS}ms.`);

        // --- Set Periodic Saving ---
        // this.persistenceInterval = this.clock.setInterval(() => {
        //     this.persistRoomAndPlayers();
        // }, PERSISTENCE_INTERVAL_MS);
        // console.log(`[GameRoom ${this.roomId}] Persistence interval set to ${PERSISTENCE_INTERVAL_MS}ms.`);

        // --- Setup Message Handlers ---
        this.registerMessageHandlers();

        console.log(`[GameRoom ${this.roomId}] Room created successfully.`);
    }

       // Authenticate client using JWT passed in options
    async onAuth(client: Client, options: any, request?: any): Promise<any> {
        console.log(`[GameRoom ${this.roomId}] onAuth attempt from ${client.sessionId}`);
        if (!options || !options.token) {
            throw new Error("Auth token missing.");
        }

        const userData = this.authService.verifyJwt(options.token);
        if (!userData || !userData.userId) {
            throw new Error("Invalid auth token.");
        }

        if (!options || !options.characterId || !options.mapId) {
            throw new Error("Data missing.");
        }
        const charData = await characterRepository.findById(options.characterId)
        if (!charData || !charData.id || userData.userId !== charData.userId ) {
            throw new Error("Invalid characterId.");
        }

        console.log(`[WorldLobbyRoom ${this.roomId}] Client ${client.sessionId} authenticated as user ${userData.userId} with char ${charData.id}`);

        return { userId: userData.userId, token: options.token, character: charData };
    }

    async onJoin(client: Client, options: any, authData: any) {
        console.log(`[GameRoom ${this.roomId}] Client ${client.sessionId} (User: ${authData.userId}, Char: ${authData.characterId}) joined.`);

        try {
            // --- Load Character Data ---
            const character = await this.charRepo.findById(authData.characterId);
            if (!character || character.userId !== authData.userId) {
                throw new Error(`Character ${authData.characterId} not found or does not belong to user ${authData.userId}.`);
            }

            // --- Create Player State ---
            const playerState = new PlayerState();
            playerState.sessionId = client.sessionId;
            playerState.characterId = character.id;
            playerState.characterName = character.name;
            playerState.level = character.level;
            // playerState.currencies = ... load from character.bytes etc.
            // ... populate other player state fields ...

            // --- Create Player Entity ---
            const startPosition: IVector3 = {
                x: character.positionX ?? 0, // Use saved position or default
                y: character.positionY ?? 1, // Default slightly above ground
                z: character.positionZ ?? 0,
            };
            const startRotationY = character.rotationY ?? 0;

            const playerEntity = new Entity(character.id); // Use character ID as entity ID for players
            playerEntity.addComponent(new TransformComponent(playerEntity, startPosition, startRotationY));
            // playerEntity.addComponent(new PlayerInputComponent(playerEntity)); // Add input component
            // Add other components: Vitals, Renderable, Combat, Inventory, Equipment etc. based on character data

            // Serialize initial entity state for the player
            const entityState = new EntityState();
            playerEntity.serializeState(entityState); // Populate schema from entity data
            entityState.ownerSessionId = client.sessionId; // Link to client session
            // playerState.syncWithEntity(entityState); // Copy relevant fields from EntityState to PlayerState if needed

            // Add player entity to EntityManager FIRST
            this.entityManager.addEntity(playerEntity);

            // Add player state and entity state to the room state AFTER entity is managed
            this.state.players.set(client.sessionId, playerState);
            this.state.entities.set(playerEntity.id, entityState); // Add entity state AFTER player state potentially? Check sync order.

            console.log(`[GameRoom ${this.roomId}] Player entity ${playerEntity.id} created and added for ${client.sessionId}.`);

        } catch (error: any) {
            console.error(`[GameRoom ${this.roomId}] Error onJoin for ${client.sessionId}:`, error);
            client.leave(1001, `Error joining room: ${error.message}`); // Disconnect client with error
        }
    }

    async onLeave(client: Client, consented: boolean) {
        console.log(`[GameRoom ${this.roomId}] Client ${client.sessionId} left (${consented ? 'consented' : 'unexpected'}).`);

        const playerState = this.state.players.get(client.sessionId);
        if (playerState) {
            const playerEntity = this.entityManager.getEntityById(playerState.characterId);

            // --- Save Player Data ---
            if (playerEntity) {
                console.log(`[GameRoom ${this.roomId}] Saving data for character ${playerState.characterId}...`);
                // await this.persistenceService.savePlayerState(playerEntity); // Implement this service method
                // Mark entity for removal AFTER saving data
                this.entityManager.markEntityForRemoval(playerEntity.id);
            } else {
                 console.warn(`[GameRoom ${this.roomId}] Could not find entity for leaving player ${playerState.characterId}`);
            }

            // Remove player state from room state
            this.state.players.delete(client.sessionId);
        } else {
             console.warn(`[GameRoom ${this.roomId}] Could not find player state for leaving client ${client.sessionId}`);
        }
    }

    async onDispose() {
        console.log(`[GameRoom ${this.roomId}] Disposing room...`);

        // Clear periodic saving interval
        if (this.persistenceInterval) {
            this.persistenceInterval.clear();
        }

        // Attempt to save all remaining players and room state
        // await this.persistRoomAndPlayers(true); // Pass flag to force save

        // Dispose physics engine
        // this.physicsEngine?.dispose();

        // Dispose entity manager (clears entities and their components)
        this.entityManager?.dispose();

        console.log(`[GameRoom ${this.roomId}] Room disposed.`);
    }

    // --- Game Loop ---

    update(deltaTimeMS: number): void {
        const deltaTime = deltaTimeMS / 1000; // Convert to seconds

        try {
            // 1. Process Inputs (apply inputs stored in PlayerInputComponents)
            // this.entityManager.processInputs(); // Add this method to EntityManager

            // 2. Update Entities (AI, component logic)
            this.entityManager.update(deltaTime);

            // 3. Update Physics (Step simulation, handle collisions)
            // this.physicsEngine?.stepSimulation(deltaTime); // Uncomment when physics is ready

            // 4. Update Game Logic (timers, events, NPC spawning etc.)
            // ...

            // 5. Serialize State (Update Colyseus state from entity components)
            this.entityManager.syncState(this.state); // Add this method to EntityManager to update this.state.entities

        } catch (error) {
             console.error(`[GameRoom ${this.roomId}] Error in update loop:`, error);
        }
    }

    // --- Message Handlers ---

    registerMessageHandlers(): void {
        // Player Input Message
        this.onMessage<IPlayerInputPayload>("playerInput", (client, payload) => {
            const playerState = this.state.players.get(client.sessionId);
            if (!playerState) return; // Ignore input if player state not found

            const playerEntity = this.entityManager.getEntityById(playerState.characterId);
            // const inputComp = playerEntity?.getComponent(PlayerInputComponent);

            // if (inputComp) {
            //     // Store the input payload in the component for processing in the update loop
            //     inputComp.queueInput(payload);
            // }
        });

        // --- Add handlers for other messages ---
        // "editBlock", "editEntity", "combatAction", "interact", "teleport", "chatMessage", etc.

        // Catch-all for unhandled message types
        this.onMessage("*", (client, type, message) => {
            const playerState = this.state.players.get(client.sessionId);
            const playerName = playerState?.characterName || client.sessionId;
            console.warn(`[GameRoom ${this.roomId}] Received unhandled message type "${type}" from ${playerName}`);
            // Optionally send an error back to the client
            // client.send(ServerMessageType.ERROR_MESSAGE, { message: `Unhandled message type: ${type}` });
        });
    }

    // --- Helper Methods ---

    async loadMapData(mapId: string): Promise<void> {
        console.log(`[GameRoom ${this.roomId}] Loading map data for ID: ${mapId}...`);
        // Implementation using RoomRepository/WorldService to fetch MapData.blockData
        // Parse blockData and potentially create static physics bodies for terrain
    }

    async loadPersistentEntities(persistentRoomId: string): Promise<void> {
         console.log(`[GameRoom ${this.roomId}] Loading persistent entities for ID: ${persistentRoomId}...`);
         // Implementation using EntityRepository/WorldService to fetch WorldEntity records for this room
         // Create Entity instances with their components and overrides from componentOverridesJson
         // Add them to the EntityManager and physics engine
    }

    async persistRoomAndPlayers(forceSave: boolean = false): Promise<void> {
        console.log(`[GameRoom ${this.roomId}] Persisting room and player data... (Force: ${forceSave})`);
        // Implementation using PersistenceService
        // Iterate through all players via entityManager or state.players
        // Call persistenceService.savePlayerState for each
        // Call persistenceService.saveRoomState if needed (e.g., for edited block data in player housing)
    }
}