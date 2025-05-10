// server/src/rooms/GameRoom.ts

import { Room, Client, Delayed } from 'colyseus';
import { IGameRoomState, IPlayerInputPayload, EntityType, ServerMessageType, IVector3 } from '@shared/types';
import { GameRoomState } from "./schemas/GameRoomState";
import { Entity } from '../entities/core/Entity';
import { EntityManager } from '../entities/core/EntityManager';
import { TransformComponent } from '../entities/components/TransformComponent';
import { authService, AuthService } from '../services/AuthService';
import { userRepository, UserRepository } from '../db/repositories/UserRepository';
import { characterRepository, CharacterRepository } from '../db/repositories/CharacterRepository'; 
import { roomRepository, RoomRepository } from '../db/repositories/RoomRepository'; 
import { PlayerState } from './schemas/PlayerState';
import { EntityState } from './schemas/EntityState';
import { RoomListingState } from './schemas/RoomListingState';
import prisma from '@/db/client';
import { MapSchema } from '@colyseus/schema';
import { worldService } from '@/services/WorldService';
import { MapState } from './schemas/MapState';
import { MapBlockState } from './schemas/MapBlockState';

const SIMULATION_INTERVAL_MS = 1000 / 60;
const PERSISTENCE_INTERVAL_MS = 5 * 60 * 1000; // we really need interval persitency?

export class GameRoom extends Room<GameRoomState> {
    public entityManager: EntityManager;
    private persistenceInterval?: Delayed;

    private authService: AuthService = authService;
    private charRepo: CharacterRepository = characterRepository;
    private roomRepo: RoomRepository = roomRepository;

    async onCreate(options: any) {
        console.log(`[GameRoom ${this.roomId}] Creating room with options:`, options);

        this.state = new GameRoomState();
        this.entityManager = new EntityManager(this);

        const roomIdFromOptions = options.roomId || this.roomId;
        console.log(`[GameRoom ${this.roomId}] Attempting to load data for persistent room ID: ${roomIdFromOptions}`);
        const roomData = await this.roomRepo.findRoomById(roomIdFromOptions);

        if (roomData) {
            this.state.room = new RoomListingState({...roomRepository.getRoomListing(roomData)});
            this.state.mapId = roomData.mapId;
            console.log(`[GameRoom ${this.roomId}] Room data loaded successfully.`);
        } else {
            console.warn(`[GameRoom ${this.roomId}] No room data found for ID: ${roomIdFromOptions}`);
        }

        const worldData = await prisma.world.findUnique({where: {id:roomData.worldId}});
        if (worldData && worldData.entities) {
            this.state.entities = new MapSchema<EntityState>();
            for(const entity of worldData.entities as any[]) {
                const e = new Entity(entity.id, null, entity);
                this.entityManager.addEntity(e);
                this.state.entities.set(entity.id, e.serializeState());
            }
            console.log(`[GameRoom ${this.roomId}] World data loaded successfully.`);
        } else {
            console.warn(`[GameRoom ${this.roomId}] No world data found for ID: ${roomData.worldId}`);
        }

        const mapData = await worldService.getMapDataById(roomData.mapId, true);
        if (mapData) {
            console.log(`[GameRoom ${this.roomId}] Map data loaded successfully.`);
            this.state.map = new MapState();
            this.state.map.assign({ id: mapData.id, name: mapData.name });
            this.state.map.blockData = new MapSchema<MapBlockState>();
            for (const [positionString, block] of Object.entries(mapData.blockData as { [key: string]: Object })) {
                const blockState = new MapBlockState();
                blockState.assign(block);
                this.state.map.blockData.set(positionString, blockState);
            }
        } else {
            console.warn(`[GameRoom ${this.roomId}] No map data found for ID: ${roomData.mapId}`);
        }

        this.setSimulationInterval((deltaTime) => this.update(deltaTime), SIMULATION_INTERVAL_MS);
        console.log(`[GameRoom ${this.roomId}] Simulation interval set to ${SIMULATION_INTERVAL_MS}ms.`);

        this.registerMessageHandlers();
        this.metadata.roomId = roomIdFromOptions;
        console.log(`[GameRoom ${this.roomId}] Room created successfully.`);
    }

    async onAuth(client: Client, options: any, request?: any): Promise<any> {
        console.log(`[GameRoom ${this.roomId}] onAuth attempt from ${client.sessionId}`);

        if (!options?.token) throw new Error("Auth token missing.");
        const userData = this.authService.verifyJwt(options.token);
        if (!userData?.userId) throw new Error("Invalid auth token.");
        if (!options.characterId || !options.mapId) throw new Error("Data missing.");

        const charData = await characterRepository.findById(options.characterId);
        if (!charData || userData.userId !== charData.userId) {
            throw new Error("Invalid characterId.");
        }

        console.log(`[WorldLobbyRoom ${this.roomId}] Client ${client.sessionId} authenticated as user ${userData.userId} with char ${charData.id}`);
        return { userId: userData.userId, token: options.token, character: charData };
    }

    async onJoin(client: Client, options: any, authData: any) {
        console.log(`[GameRoom ${this.roomId}] Client ${client.sessionId} (User: ${authData.userId}, Char: ${authData.characterId}) joined.`);

        try {
            const character = await this.charRepo.findById(authData.characterId);
            if (!character || character.userId !== authData.userId) {
                throw new Error(`Character ${authData.characterId} not found or unauthorized.`);
            }

            const playerState = new PlayerState();
            playerState.sessionId = client.sessionId;
            playerState.characterId = character.id;
            playerState.characterName = character.name;
            playerState.level = character.level;

            const startPosition: IVector3 = {
                x: character.positionX ?? 0,
                y: character.positionY ?? 1,
                z: character.positionZ ?? 0,
            };
            const startRotationY = character.rotationY ?? 0;

            const playerEntity = new Entity(character.id);
            playerEntity.addComponent(new TransformComponent(playerEntity, startPosition, startRotationY));

            const entityState = new EntityState();
            playerEntity.serializeState(entityState);
            entityState.ownerSessionId = client.sessionId;

            this.entityManager.addEntity(playerEntity);
            this.state.players.set(client.sessionId, playerState);
            this.state.entities.set(playerEntity.id, entityState);

            console.log(`[GameRoom ${this.roomId}] Player entity ${playerEntity.id} created and added for ${client.sessionId}.`);

        } catch (error: any) {
            console.error(`[GameRoom ${this.roomId}] Error onJoin for ${client.sessionId}:`, error);
            client.leave(1001, `Error joining room: ${error.message}`);
        }
    }

    async onLeave(client: Client, consented: boolean) {
        console.log(`[GameRoom ${this.roomId}] Client ${client.sessionId} left (${consented ? 'consented' : 'unexpected'}).`);

        const playerState = this.state.players.get(client.sessionId);
        if (playerState) {
            const playerEntity = this.entityManager.getEntityById(playerState.characterId);

            if (playerEntity) {
                console.log(`[GameRoom ${this.roomId}] Saving data for character ${playerState.characterId}...`);
                this.entityManager.markEntityForRemoval(playerEntity.id);
            } else {
                console.warn(`[GameRoom ${this.roomId}] Could not find entity for leaving player ${playerState.characterId}`);
            }

            this.state.players.delete(client.sessionId);
        } else {
            console.warn(`[GameRoom ${this.roomId}] Could not find player state for client ${client.sessionId}`);
        }
    }

    async onDispose() {
        console.log(`[GameRoom ${this.roomId}] Disposing room...`);

        this.persistenceInterval?.clear();
        this.entityManager?.dispose();

        console.log(`[GameRoom ${this.roomId}] Room disposed.`);
    }

    update(deltaTimeMS: number): void {
        const deltaTime = deltaTimeMS / 1000;

        try {
            // Future processing: entityManager.processInputs(), update AI, etc.
        } catch (err) {
            console.error(`[GameRoom ${this.roomId}] Update error:`, err);
        }
    }

    private registerMessageHandlers() {
        // Register client-server message handlers here
    }
}
