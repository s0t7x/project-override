// packages/po_server/src/repositories/WorldBlockRepository.ts
import { Prisma, WorldBlock } from '@prisma/client';
import { prisma } from '../client'; // Corrected import
import { IPaginationArgs } from '@project-override/shared/types/misc/PaginationArgs';

// Data for creating or updating a single world block.
// The composite key fields are all required.
export type WorldBlockInputData = Omit<Prisma.WorldBlockCreateInput, 'world'> & {
    worldId: string; // Already part of WorldBlockCreateInput if not using connect
    x: number;
    y: number;
    z: number;
    // blockType, rotation, customData
};
// Prisma.WorldBlockCreateInput is actually fine if you provide all PK fields.

// For the composite key
export type WorldBlockCompositeId = {
  worldId: string;
  x: number;
  y: number;
  z: number;
};

class WorldBlockRepositoryInternal {

  /**
   * Creates or updates a single world block.
   * Uses `upsert` to handle both creation of new blocks and modification of existing ones.
   * @param data - The data for the block, including its coordinates and worldId.
   * @returns The created or updated world block.
   */
  async upsertBlock(data: WorldBlockInputData): Promise<WorldBlock> {
    const { worldId, x, y, z, ...blockData } = data;
    return prisma.worldBlock.upsert({
      where: {
        worldId_x_y_z: { worldId, x, y, z }, // Use the composite key name
      },
      update: {
        ...blockData, // blockType, rotation, customData
      },
      create: {
        worldId,
        x,
        y,
        z,
        ...blockData,
      },
    });
  }

  /**
   * Creates multiple world blocks. More efficient for bulk inserts than many individual upserts.
   * If blocks might already exist and you want to ignore duplicates, use `skipDuplicates: true`.
   * If you want to update, you'd need a more complex loop of upserts or a raw query.
   * @param data - An array of WorldBlockInputData.
   * @returns A count of the blocks created.
   */
  async createManyBlocks(data: WorldBlockInputData[]): Promise<Prisma.BatchPayload> {
    return prisma.worldBlock.createMany({
      data,
      skipDuplicates: true, // Or false if you want errors on duplicates
    });
  }

  /**
   * Finds a single block by its composite ID.
   * @param id - The composite ID (worldId, x, y, z).
   * @returns The found block or null.
   */
  async findBlockById(id: WorldBlockCompositeId): Promise<WorldBlock | null> {
    return prisma.worldBlock.findUnique({
      where: {
        worldId_x_y_z: id,
      },
    });
  }

  /**
   * Deletes a single block by its composite ID.
   * @param id - The composite ID (worldId, x, y, z).
   * @returns The deleted block.
   */
  async deleteBlock(id: WorldBlockCompositeId): Promise<WorldBlock> {
    return prisma.worldBlock.delete({
      where: {
        worldId_x_y_z: id,
      },
    });
  }

  /**
   * Deletes multiple blocks based on a filter. Be careful with this.
   * Example: Deleting all blocks of a certain type in a world.
   * @param filter - Prisma.WorldBlockWhereInput criteria.
   * @returns A count of deleted blocks.
   */
  async deleteManyBlocks(filter: Prisma.WorldBlockWhereInput): Promise<Prisma.BatchPayload> {
      return prisma.worldBlock.deleteMany({
          where: filter,
      });
  }

  /**
   * Fetches all blocks within a specific rectangular region of a world.
   * @param worldId - The ID of the world.
   * @param minX - Minimum X coordinate.
   * @param maxX - Maximum X coordinate.
   * @param minY - Minimum Y coordinate.
   * @param maxY - Maximum Y coordinate.
   * @param minZ - Minimum Z coordinate.
   * @param maxZ - Maximum Z coordinate.
   * @returns A list of blocks within the specified region.
   */
  async findBlocksInRegion(
    worldId: string,
    minX: number, maxX: number,
    minY: number, maxY: number,
    minZ: number, maxZ: number
  ): Promise<WorldBlock[]> {
    return prisma.worldBlock.findMany({
      where: {
        worldId,
        x: { gte: minX, lte: maxX },
        y: { gte: minY, lte: maxY },
        z: { gte: minZ, lte: maxZ },
      },
      // orderBy: [{ x: 'asc' }, { y: 'asc' }, { z: 'asc' }], // Optional ordering
    });
  }

  /**
   * Fetches all blocks for a given world. Use with caution for large worlds.
   * Consider pagination or streaming if worlds can be very large.
   * @param worldId - The ID of the world.
   * @param pagination - Optional pagination.
   * @returns A list of all blocks in the world.
   */
  async findAllBlocksByWorldId(worldId: string, { skip, take }: IPaginationArgs = {}): Promise<WorldBlock[]> {
    return prisma.worldBlock.findMany({
      where: { worldId },
      skip,
      take,
      // orderBy: ... // if needed
    });
  }

  /**
   * Updates specific properties (e.g., blockType, rotation, customData) for blocks
   * matching a filter.
   * @param filter - The filter to select blocks for update.
   * @param data - The data to update. Only fields like blockType, rotation, customData.
   *               Cannot update primary key parts (worldId, x, y, z) with updateMany.
   * @returns A count of updated blocks.
   */
  async updateManyBlocks(
    filter: Prisma.WorldBlockWhereInput,
    data: Pick<WorldBlockInputData, 'blockType' | 'rotation' | 'customData'> // Only updatable fields
  ): Promise<Prisma.BatchPayload> {
    return prisma.worldBlock.updateMany({
      where: filter,
      data,
    });
  }
}

export const worldBlockRepository = new WorldBlockRepositoryInternal();