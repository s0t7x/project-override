// server/src/db/repositories/RoomRepository.ts
// Methods for Room and MapData models, including fetching and editing block data,
// and handling persistent entity data stored in World.entities JSON.

import { RoomListingState } from '@/rooms/schemas/RoomListingState';
import prisma from '../client';
import { Room, MapData, World, Prisma } from '@prisma/client';
import { IRoomListing } from '@shared/types';

// Define structure for block data stored in JSON
// Key: "x,y,z", Value: { type: string, owner?: string, ... }
type BlockDataMap = Record<string, { type: string; [key: string]: any }>;
// Define structure for persistent entity data stored in World.entities JSON
// Key: entityInstanceId, Value: { baseId: string, x: number, y: number, z: number, rotY?: number, overrides?: any }
type PersistentEntityMap = Record<string, { baseId: string; x: number; y: number; z: number; rotY?: number; overrides?: Prisma.JsonObject }>;


export class RoomRepository {

    // --- Room Fetching ---

    /** Finds a Room instance by its unique ID (Colyseus roomId). */
    async findRoomById(roomId: string): Promise<(Room & { mapData?: MapData, world?: World }) | null | any> {
        try {
            return await prisma.room.findUnique({
                where: { id: roomId },
                include: {
                    mapData: true, // Include the base map data
                    world: true,   // Include world if it belongs to one
                }
            });
        } catch (error) {
            console.error(`[RoomRepository] Error finding Room by ID "${roomId}":`, error);
            return null;
        }
    }

    /** Finds all public Rooms (potentially filtered by worldId). */
    async findPublicRooms(worldId?: string): Promise<Room[]> {
        try {
            return await prisma.room.findMany({
                where: {
                    isPublic: true,
                    isPlayerOwned: false, // Assuming public rooms are not player-owned here
                    worldId: worldId, // Optional filter
                },
                orderBy: { name: 'asc' }
            });
        } catch (error) {
            console.error(`[RoomRepository] Error finding public rooms:`, error);
            return [];
        }
    }

    getRoomListing(room: Room): IRoomListing {
        const listing = new RoomListingState()
        listing.roomId = room.id;
        listing.name = room.name
        listing.isPublic = room.isPublic
        
        // TODO: Fetch data from other repos
        listing.mapName = room.mapDataId
        listing.ownerName = room.isPlayerOwned ? room.ownerCharacterId || undefined : undefined
        
        // PlayerCount will always be 0 when fetched from repo.
        // this is because only the Room itself handles playercount and it should access its repo exclusivly!
        listing.playerCount = 0        
        return listing
    }

    async getRoomListingById(roomId: string): Promise<IRoomListing | undefined> {
        const room = await this.findRoomById(roomId);
        if(!room) return undefined
        return this.getRoomListing(room);
    }

     /** Finds player-owned rooms (e.g., for listing in a lobby). */
     async findPlayerRooms(characterId?: string, includePublic: boolean = false): Promise<Room[]> {
         try {
             const whereClause: Prisma.RoomWhereInput = {
                 isPlayerOwned: true,
                 OR: [
                     { ownerCharacterId: characterId }, // Owned by player
                     // Add condition to check whitelistJson if implementing private rooms
                     // { isPublic: false, whitelistJson: { path: '$[*]', array_contains: characterId } } // Example for JSON array check
                 ]
             };
             if (includePublic) {
                 whereClause.OR?.push({ isPublic: true }); // Include public player rooms if requested
             }

             return await prisma.room.findMany({
                 where: whereClause,
                 orderBy: { name: 'asc' }
             });
         } catch (error) {
              console.error(`[RoomRepository] Error finding player rooms for character "${characterId}":`, error);
              return [];
         }
     }

    // Add methods to create/delete player-owned rooms if needed

    // --- MapData Fetching & Editing ---

    /**
     * Gets MapData by ID, usually done via findRoomById's include.
     * This is a direct fetch if needed separately.
    */
    async getMapDataById(mapDataId: string): Promise<MapData | null> {
        try {
            return await prisma.mapData.findUnique({
                where: { id: mapDataId }
            });
        } catch (error) {
            console.error(`[RoomRepository] Error getting MapData by ID "${mapDataId}":`, error);
            return null;
        }
    }

    /**
     * Parses the blockData JSON from a MapData object.
     * @param mapData - The MapData object.
     * @returns The parsed BlockDataMap object or null if invalid/missing.
     */
    parseBlockData(mapData: MapData | null): BlockDataMap | null {
        if (!mapData || typeof mapData.blockData !== 'object' || mapData.blockData === null || Array.isArray(mapData.blockData)) {
             console.warn(`[RoomRepository] Invalid or missing blockData for MapData ID ${mapData?.id}. Expected JSON object.`);
             return null;
        }
        // We assume Prisma returns a valid JS object if the JSON column type is correct
        return mapData.blockData as BlockDataMap;
    }

     /**
      * Updates a specific block within a BlockDataMap object (in memory).
      * @param blockDataMap - The map object to modify (obtained from parseBlockData).
      * @param coords - The {x, y, z} coordinates of the block.
      * @param blockInfo - The new block info ({ type: string, ... }) or null to remove the block.
      * @returns The modified BlockDataMap object.
      */
     updateBlockInMemory(blockDataMap: BlockDataMap | null, coords: { x: number, y: number, z: number }, blockInfo: { type: string; [key: string]: any } | null): BlockDataMap | null {
         if (!blockDataMap) return null;
         const key = `${coords.x},${coords.y},${coords.z}`;
         if (blockInfo === null) {
             delete blockDataMap[key]; // Remove block
             console.log(`[RoomRepository] Removed block at ${key} (in memory)`);
         } else {
             blockDataMap[key] = blockInfo; // Add or update block
             console.log(`[RoomRepository] Updated block at ${key} to type ${blockInfo.type} (in memory)`);
         }
         return blockDataMap;
     }

    /**
     * Saves the modified blockData JSON back to the specific MapData record in the DB.
     * WARNING: This overwrites the entire blockData field. Use with care.
     * @param mapDataId - The ID of the MapData record to update.
     * @param updatedBlockDataMap - The modified block data object.
     * @returns The updated MapData object or null on failure.
     */
    async saveMapBlockData(mapDataId: string, updatedBlockDataMap: BlockDataMap): Promise<MapData | null> {
        console.log(`[RoomRepository] Saving updated block data for MapData ID: ${mapDataId}`);
        try {
            // Prisma expects a Prisma.JsonValue compatible type for JSON fields
            const jsonData = updatedBlockDataMap as unknown as Prisma.InputJsonObject;

            return await prisma.mapData.update({
                where: { id: mapDataId },
                data: {
                    blockData: jsonData,
                }
            });
        } catch (error: any) {
             if (error.code === 'P2025') { console.warn(`[RoomRepository] Save failed: MapData ID not found: "${mapDataId}"`); return null; }
             console.error(`[RoomRepository] Error saving MapData block data for ID "${mapDataId}":`, error);
             return null;
        }
    }

    // --- Persistent World Entity Data (using World.entities JSON) ---

    /**
     * Fetches the World associated with a room ID.
     * @param roomId The ID of the room.
     * @returns The World object or null.
     */
     async getWorldByRoomId(roomId: string): Promise<World | null> {
         try {
             const room = await prisma.room.findUnique({
                 where: { id: roomId },
                 select: { worldId: true } // Only select worldId for efficiency
             });
             if (!room?.worldId) return null; // Room not associated with a world
             return await prisma.world.findUnique({
                 where: { id: room.worldId }
             });
         } catch (error) {
              console.error(`[RoomRepository] Error fetching World for Room ID "${roomId}":`, error);
              return null;
         }
     }

    /**
     * Parses the persistent entity data JSON from a World object.
     * @param world - The World object.
     * @returns The parsed PersistentEntityMap object or an empty map if invalid/missing.
     */
    parseWorldEntities(world: World | null): PersistentEntityMap {
        if (!world || typeof world.entities !== 'object' || world.entities === null || Array.isArray(world.entities)) {
             // Return empty map if no valid data found
             return {};
        }
        // Assume Prisma returns a valid JS object
        return world.entities as PersistentEntityMap;
    }

    /**
     * Updates or adds a persistent entity's data within a world's entity map (in memory).
     * @param entityMap - The entity map object (from parseWorldEntities).
     * @param entityId - The unique ID of the entity instance.
     * @param entityData - The data to store { baseId, x, y, z, rotY?, overrides? }.
     * @returns The modified PersistentEntityMap.
     */
    updateWorldEntityInMemory(entityMap: PersistentEntityMap, entityId: string, entityData: { baseId: string; x: number; y: number; z: number; rotY?: number; overrides?: Prisma.JsonObject }): PersistentEntityMap {
         entityMap[entityId] = entityData;
         console.log(`[RoomRepository] Updated persistent entity ${entityId} (in memory)`);
         return entityMap;
    }

    /**
     * Removes a persistent entity's data from a world's entity map (in memory).
     * @param entityMap - The entity map object.
     * @param entityId - The ID of the entity instance to remove.
     * @returns The modified PersistentEntityMap.
     */
    removeWorldEntityInMemory(entityMap: PersistentEntityMap, entityId: string): PersistentEntityMap {
        if (entityMap[entityId]) {
             delete entityMap[entityId];
             console.log(`[RoomRepository] Removed persistent entity ${entityId} (in memory)`);
        }
        return entityMap;
    }

    /**
     * Saves the modified persistent entity map back to the specific World record in the DB.
     * WARNING: Overwrites the entire World.entities field.
     * @param worldId - The ID of the World record to update.
     * @param updatedEntityMap - The modified entity data object.
     * @returns The updated World object or null on failure.
     */
     async saveWorldEntities(worldId: string, updatedEntityMap: PersistentEntityMap): Promise<World | null> {
        console.log(`[RoomRepository] Saving updated persistent entities for World ID: ${worldId}`);
        try {
            const jsonData = updatedEntityMap as unknown as Prisma.InputJsonObject;
            return await prisma.world.update({
                where: { id: worldId },
                data: {
                    entities: jsonData,
                }
            });
        } catch (error: any) {
            if (error.code === 'P2025') { console.warn(`[RoomRepository] Save failed: World ID not found: "${worldId}"`); return null; }
            console.error(`[RoomRepository] Error saving World entities data for ID "${worldId}":`, error);
            return null;
        }
    }

}

// Export singleton instance
export const roomRepository = new RoomRepository();