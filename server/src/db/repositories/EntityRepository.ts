// server/src/db/repositories/EntityRepository.ts
// Methods for loading BaseEntity templates and CRUD for InstancedEntity records.
// Fetches BaseEntity templates directly from the DB on demand.

import prisma from '../client'; // Use the singleton Prisma client instance
import { BaseEntity, InstancedEntity, Prisma } from '@prisma/client'; // Import generated types

// Type for optional instance creation data
type InstanceCreationOptions = Partial<Pick<InstancedEntity, 'instanceDataJson'>>;

export class EntityRepository {

    constructor() {
        console.log("[EntityRepository] Initialized (On-Demand BaseEntity Loading).");
    }

    // --- Base Entity Methods (No Caching) ---

    /**
     * Gets a BaseEntity template by its ID directly from the database.
     * @param baseEntityId The ID of the BaseEntity template.
     * @returns The BaseEntity object or null if not found.
     */
    async getBaseEntityById(baseEntityId: string): Promise<BaseEntity | null> {
        console.log(`[EntityRepository] Fetching BaseEntity from DB (ID: ${baseEntityId})`); // Log every fetch
        try {
            const baseEntity = await prisma.baseEntity.findUnique({
                where: { id: baseEntityId },
            });
            if (!baseEntity) {
                 console.warn(`[EntityRepository] BaseEntity not found in DB for ID: ${baseEntityId}`);
            }
            return baseEntity;
        } catch (error) {
            console.error(`[EntityRepository] Error fetching BaseEntity by ID "${baseEntityId}":`, error);
            return null;
        }
    }

     /**
      * Gets a BaseEntity template by its name directly from the database.
      * Assumes name might not be unique, returns the first match found.
      * @param name The name of the BaseEntity template.
      * @returns The BaseEntity object or null if not found.
      */
     async getBaseEntityByName(name: string): Promise<BaseEntity | null> {
         console.log(`[EntityRepository] Fetching BaseEntity from DB (Name: ${name})`); // Log every fetch
         try {
             const baseEntity = await prisma.baseEntity.findFirst({
                 where: { name: name },
             });
              if (!baseEntity) {
                  console.warn(`[EntityRepository] BaseEntity not found in DB for Name: ${name}`);
             }
             return baseEntity;
         } catch (error) {
             console.error(`[EntityRepository] Error fetching BaseEntity by Name "${name}":`, error);
             return null;
         }
     }

    // --- Instanced Entity Methods (Remain the same) ---

    /**
     * Creates a new instance of a BaseEntity.
     * @param baseEntityId The ID of the BaseEntity template to instantiate.
     * @param options Optional data overrides for the new instance (e.g., instanceDataJson).
     * @returns The newly created InstancedEntity object or null if creation fails.
     */
    async createInstance(baseEntityId: string, options?: InstanceCreationOptions): Promise<InstancedEntity | null> {
        try {
            // Optional: Verify baseEntityId exists first using getBaseEntityById if needed
            const baseExists = await this.getBaseEntityById(baseEntityId); // This will now hit the DB
            if (!baseExists) {
                 console.error(`[EntityRepository] Cannot create instance: BaseEntity with ID ${baseEntityId} not found.`);
                 return null; // Return null instead of throwing to match other methods' patterns
            }

            return await prisma.instancedEntity.create({
                data: {
                    baseEntityId: baseEntityId,
                    instanceDataJson: options?.instanceDataJson ?? Prisma.JsonNull,
                },
            });
        } catch (error: any) {
             // Foreign key error P2003 should be caught by the check above now
             console.error(`[EntityRepository] Error creating instance for BaseEntity ID "${baseEntityId}":`, error);
             return null;
        }
    }

    /**
     * Finds a specific InstancedEntity by its unique ID.
     * @param instanceId The ID of the InstancedEntity record.
     * @param includeBase Whether to include the related BaseEntity data (causes extra DB join/query).
     * @returns The InstancedEntity object (potentially with BaseEntity) or null.
     */
    async findInstanceById(instanceId: string, includeBase: boolean = false): Promise<(InstancedEntity & { baseEntity?: BaseEntity }) | null> {
        try {
            return await prisma.instancedEntity.findUnique({
                where: { id: instanceId },
                include: {
                    baseEntity: includeBase,
                },
            });
        } catch (error) {
            console.error(`[EntityRepository] Error finding InstancedEntity by ID "${instanceId}":`, error);
            return null;
        }
    }

    /**
     * Updates the instance-specific data (instanceDataJson) for an InstancedEntity.
     * @param instanceId The ID of the instance to update.
     * @param instanceData The new JSON data to set.
     * @returns The updated InstancedEntity object or null if update fails.
     */
    async updateInstanceData(instanceId: string, instanceData: Prisma.JsonValue): Promise<InstancedEntity | null> {
         try {
             return await prisma.instancedEntity.update({
                 where: { id: instanceId },
                 data: { instanceDataJson: instanceData || undefined },
             });
         } catch (error: any) {
              if (error.code === 'P2025') { console.warn(`[EntityRepository] Update failed: InstancedEntity ID not found: "${instanceId}"`); return null; }
              console.error(`[EntityRepository] Error updating instance data for ID "${instanceId}":`, error); return null;
         }
    }

    /**
     * Deletes an InstancedEntity by its ID.
     * @param instanceId The ID of the instance to delete.
     * @returns True if deletion was successful, false otherwise.
     */
    async deleteInstance(instanceId: string): Promise<boolean> {
         try {
             await prisma.instancedEntity.delete({ where: { id: instanceId } });
             console.log(`[EntityRepository] Deleted InstancedEntity ID: "${instanceId}"`); return true;
         } catch (error: any) {
              if (error.code === 'P2025') { console.warn(`[EntityRepository] Delete failed: InstancedEntity ID not found: "${instanceId}"`); return false; }
              console.error(`[EntityRepository] Error deleting InstancedEntity ID "${instanceId}":`, error); return false;
         }
    }
}

// Export singleton instance
export const entityRepository = new EntityRepository();
