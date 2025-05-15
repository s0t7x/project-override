// packages/po_server/src/services/WorldService.ts
import { World, Entity, WorldBlock, Prisma } from '@prisma/client'; // Added Prisma for BatchPayload
import { IPaginationArgs } from '@project-override/shared/dist/misc/PaginationArgs'; // Correct shared import

// Corrected Repository Imports
import { worldRepository, WorldCreateData, WorldUpdateData, WorldWithCounts } from '../db/repos/WorldRepository';
import { entityRepository, EntityWithDetails, EntityWithOwner } from '../db/repos/EntityRepository'; // Aliased to avoid name clash if service has its own types
import { worldBlockRepository, WorldBlockInputData, WorldBlockCompositeId } from '../db/repos/WorldBlockRepository';

import { NotFoundError, BusinessRuleError } from '@project-override/shared/dist/messages/ServerError';

// Type for data returned when fetching a world with its contents
export type PopulatedWorldData = WorldWithCounts & {
	// Or just World
	entitiesInWorld: Array<EntityWithOwner | Entity>; // Using EntityWithOwner from repo if owner is included
	allBlocks?: WorldBlock[]; // Optional: if a full block load is requested
};

// Type for a specific segment of a world, usually blocks for rendering
export interface WorldSegmentData {
	worldId: string;
	blocks: WorldBlock[];
	// Optionally, entities specifically within these block coordinates if locatable
	// entitiesInSegment?: Entity[];
}

class WorldServiceInternal {
	// --- World Management ---

	async createWorld(worldData: WorldCreateData): Promise<World> {
		if (await worldRepository.nameExists(worldData.name)) {
			throw new BusinessRuleError(`World name "${worldData.name}" already exists.`);
		}
		return worldRepository.create(worldData);
	}

	async getWorldById(worldId: string, includeCounts: boolean = false): Promise<WorldWithCounts | World | null> {
		const world = await worldRepository.findById(worldId, includeCounts);
		if (!world) {
			throw new NotFoundError(`World with ID ${worldId} not found.`);
		}
		return world;
	}

	async getWorldByName(worldName: string, includeCounts: boolean = false): Promise<WorldWithCounts | World | null> {
		const world = await worldRepository.findByName(worldName, includeCounts);
		if (!world) {
			throw new NotFoundError(`World with name "${worldName}" not found.`);
		}
		return world;
	}

	async getAllWorlds(
		pagination: IPaginationArgs = {}, // Uses your shared IPaginationArgs
		filter?: Prisma.WorldWhereInput,
		orderBy?: Prisma.WorldOrderByWithRelationInput,
		includeCounts: boolean = false,
	): Promise<Array<WorldWithCounts | World>> {
		return worldRepository.findAll(pagination, filter, orderBy, includeCounts);
	}

	async updateWorld(worldId: string, updateData: WorldUpdateData): Promise<World> {
		// findById will throw NotFoundError if world doesn't exist
		const world = await this.getWorldById(worldId);
		if (!world) {
			throw new NotFoundError(`World with ID ${worldId} not found.`);
		}
		if (updateData.name && updateData.name !== world.name && (await worldRepository.nameExists(updateData.name as string))) {
			throw new BusinessRuleError(`World name "${updateData.name}" already exists.`);
		}
		return worldRepository.update(worldId, updateData);
	}

	async deleteWorld(worldId: string): Promise<World> {
		// findById will throw NotFoundError if world doesn't exist
		await this.getWorldById(worldId);
		return worldRepository.delete(worldId);
	}

	// --- Entity Management within Worlds ---

	async getEntitiesInWorld(
		worldId: string,
		pagination: IPaginationArgs = {},
		includeOwner: boolean = false, // Corresponds to entityRepository's includeOwner
	): Promise<Array<EntityWithOwner | Entity>> {
		// Ensure world exists before fetching entities for it
		await this.getWorldById(worldId);
		return entityRepository.findAll(pagination, { worldId }, { createdAt: 'asc' }, includeOwner);
	}

	async placeEntityInWorld(entityId: string, worldId: string): Promise<Entity> {
		const entity = (await entityRepository.findById(entityId, true)) as EntityWithDetails;
		if (!entity) {
			throw new NotFoundError(`Entity with ID ${entityId} not found.`);
		}
		// Ensure target world exists
		await this.getWorldById(worldId);

		if (entity.inventorySlot || entity.equipmentSlot) {
			throw new BusinessRuleError(`Entity ${entityId} is in inventory or equipped and cannot be placed.`);
		}
		if (entity.worldId && entity.worldId !== worldId) {
			throw new BusinessRuleError(`Entity ${entityId} is already in another world. Remove it first.`);
		}
		if (entity.worldId === worldId) {
			return entity; // Already in the target world
		}

		return entityRepository.update(entityId, {
			world: {
				connect: { id: worldId },
			},
		});
	}

	async removeEntityFromWorld(entityId: string): Promise<Entity> {
		const entity = await entityRepository.findById(entityId);
		if (!entity) {
			throw new NotFoundError(`Entity with ID ${entityId} not found.`);
		}
		if (!entity.worldId) {
			return entity; // Not in any world
		}
		return entityRepository.update(entityId, { world: { disconnect: true } });
	}

	// --- World Block Management ---

	async getBlock(blockId: WorldBlockCompositeId): Promise<WorldBlock | null> {
		const block = await worldBlockRepository.findBlockById(blockId);
		if (!block) {
			throw new NotFoundError(`Block at ${blockId.x},${blockId.y},${blockId.z} in world ${blockId.worldId} not found.`);
		}
		return block;
	}

	async setBlock(blockData: WorldBlockInputData): Promise<WorldBlock> {
		// Ensure world exists
		await this.getWorldById(blockData.worldId);
		// Additional validation (e.g., player permissions, valid blockType) would go here.
		return worldBlockRepository.upsertBlock(blockData);
	}

	async setManyBlocks(worldId: string, blocksData: Omit<WorldBlockInputData, 'worldId'>[]): Promise<Prisma.BatchPayload> {
		if (blocksData.length === 0) {
			return { count: 0 };
		}
		// Ensure world exists
		await this.getWorldById(worldId);

		const fullBlocksData: WorldBlockInputData[] = blocksData.map((b) => ({ ...b, worldId }));
		// As noted before, createManyBlocks with skipDuplicates won't update.
		// For true "set/upsert many", a transactional loop or raw SQL is better.
		// This method is more like "place these blocks, ignore if one at coords already exists".
		return worldBlockRepository.createManyBlocks(fullBlocksData);
	}

	async removeBlock(blockId: WorldBlockCompositeId): Promise<WorldBlock> {
		// getBlock will throw if not found
		await this.getBlock(blockId);
		return worldBlockRepository.deleteBlock(blockId);
	}

	/**
	 * Retrieves blocks within a specific rectangular region for rendering or physics.
	 * This matches your WorldBlockRepository.findBlocksInRegion.
	 */
	async getBlocksInRectangularRegion(worldId: string, minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): Promise<WorldBlock[]> {
		await this.getWorldById(worldId); // Ensure world exists
		return worldBlockRepository.findBlocksInRegion(worldId, minX, maxX, minY, maxY, minZ, maxZ);
	}

	async getAllBlocksForWorld(worldId: string, pagination: IPaginationArgs = {}): Promise<WorldBlock[]> {
		await this.getWorldById(worldId); // Ensure world exists
		return worldBlockRepository.findAllBlocksByWorldId(worldId, pagination);
	}

	// --- Combined Data Retrieval ---

	/**
	 * Gets a world's metadata along with all its entities and all its blocks.
	 * Use with EXTREME caution for large worlds, as it loads everything.
	 * @param worldId The ID of the world.
	 * @param includeWorldCounts Whether to include counts on the world object.
	 * @param includeEntityOwner Whether to include owner info for entities.
	 * @returns A populated world data object.
	 */
	async getFullPopulatedWorld(worldId: string, includeWorldCounts: boolean = true, includeEntityOwner: boolean = true): Promise<PopulatedWorldData> {
		const world = await this.getWorldById(worldId, includeWorldCounts); // Throws if not found

		const entitiesInWorld = await this.getEntitiesInWorld(worldId, { take: 100000 }, includeEntityOwner); // High take limit to get all
		const allBlocks = await this.getAllBlocksForWorld(worldId, { take: 1000000 }); // High take limit

		return {
			...(world as WorldWithCounts), // Cast because findById would have thrown if null
			entitiesInWorld,
			allBlocks,
		};
	}

	/**
	 * Gets data for a segment of the world, typically for client rendering.
	 * This focuses on blocks in a given rectangular area.
	 * Entity loading for the segment is more complex and might depend on how entities store position.
	 * @param worldId The ID of the world.
	 * @param regionCoordinates Coordinates defining the block region (minX, maxX, etc.).
	 * @returns Block data for the segment.
	 */
	async getWorldSegment(worldId: string, regionCoordinates: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }): Promise<WorldSegmentData> {
		// getWorldById ensures world exists and throws NotFoundError if not.
		await this.getWorldById(worldId);

		const blocksInSegment = await this.getBlocksInRectangularRegion(
			worldId,
			regionCoordinates.minX,
			regionCoordinates.maxX,
			regionCoordinates.minY,
			regionCoordinates.maxY,
			regionCoordinates.minZ,
			regionCoordinates.maxZ,
		);

		// TODO: Advanced entity fetching for the segment.
		// This would require entities to have x,y,z coordinates (likely in components)
		// and for entityRepository to support querying by these spatial bounds.
		// For now, entities are not included in this specific segment data.
		// You could fetch entities separately based on player's broader area of interest.

		return {
			worldId,
			blocks: blocksInSegment,
		};
	}
}

export const worldService = new WorldServiceInternal();
