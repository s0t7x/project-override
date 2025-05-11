// server/src/services/WorldService.ts
// Logic for loading map data from the database (MapData model).

import prisma from '../db/client';
import { MapData } from '@prisma/client';
import { Prisma } from '@prisma/client'; // For JsonValue

export class WorldService {
    // Cache for frequently accessed maps (like the background map)
    private mapCache = new Map<string, MapData>();
    public readonly PREDEFINED_MAP_IDS = {
        ENTRY_BACKGROUND: "entry_map" // Example ID for your background map
    };

    constructor() {
        console.log("[WorldService] Initialized.");
        // Preload common maps?
        this.preloadCommonMaps();
    }

    async preloadCommonMaps(): Promise<void> {
        try {
             console.log("[WorldService] Preloading common maps...");
             const authMap = await this.getMapDataById(this.PREDEFINED_MAP_IDS.ENTRY_BACKGROUND, true); // Force fetch bypassing cache initially
             if(authMap) {
                 console.log(`[WorldService] Preloaded map: ${this.PREDEFINED_MAP_IDS.ENTRY_BACKGROUND}`);
             } else {
                  console.warn(`[WorldService] Failed to preload map: ${this.PREDEFINED_MAP_IDS.ENTRY_BACKGROUND}. Ensure it exists in the database.`);
             }
             // Preload other common maps if needed
        } catch (error) {
             console.error("[WorldService] Error during map preloading:", error);
        }
    }

    /**
     * Retrieves MapData by its unique ID, using cache first.
     * @param mapId The ID of the MapData record.
     * @param bypassCache Optionally force fetching from DB.
     * @returns The MapData object or null if not found.
     */
    async getMapDataById(mapId: string, bypassCache = true): Promise<MapData | null> {
        if(!mapId) {
            console.warn(`[WorldService] Invalid mapId provided: ${mapId}`);
            return null;
        }
        if (!bypassCache && this.mapCache.has(mapId)) {
            // console.log(`[WorldService] Returning cached map data for ID: ${mapId}`);
            return this.mapCache.get(mapId)!;
        }

        console.log(`[WorldService] Fetching map data from DB for ID: ${mapId}`);
        try {
            const mapData = await prisma.mapData.findUnique({
                where: { id: mapId },
            });

            if (mapData) {
                // Validate or parse blockData if needed before caching
                if (typeof mapData.blockData !== 'object' || mapData.blockData === null) {
                    console.warn(`[WorldService] MapData ${mapId} has invalid blockData format. Should be JSON object.`);
                    // Handle appropriately - return null, return default, etc.
                }
                this.mapCache.set(mapId, mapData); // Cache the result
                console.log(mapData);
                return mapData;
            } else {
                console.warn(`[WorldService] MapData not found in DB for ID: ${mapId}`);
                return null;
            }
        } catch (error) {
            console.error(`[WorldService] Error fetching map data for ID ${mapId}:`, error);
            return null;
        }
    }

    /**
     * Retrieves the specific block data JSON object for the auth background map.
     * Uses the cached MapData.
     * @returns The blockData JSON object or null if not found/invalid.
     */
    public getAuthBackgroundMapBlockData(): Prisma.JsonValue | null {
        const mapData = this.mapCache.get(this.PREDEFINED_MAP_IDS.ENTRY_BACKGROUND);
        if (mapData && typeof mapData.blockData === 'object' && mapData.blockData !== null) {
            return mapData.blockData;
        }
        console.warn(`[WorldService] Auth background map data (${this.PREDEFINED_MAP_IDS.ENTRY_BACKGROUND}) not found or invalid in cache.`);
        // Optionally try fetching again if not found in cache?
        // this.getMapDataById(this.PREDEFINED_MAP_IDS.ENTRY_BACKGROUND).then(md => ...);
        return null;
    }

    // Add methods for saving map edits later...
}

// Export singleton instance
export const worldService = new WorldService();