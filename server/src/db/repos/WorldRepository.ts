// packages/po_server/src/repositories/WorldRepository.ts
import { Prisma, World } from '@prisma/client'; // PrismaClient not needed for class
import { DefaultArgs } from '@prisma/client/runtime/library';
import { prisma } from '../client'; // Corrected import
import { IPaginationArgs } from '@project-override/shared/dist/misc/PaginationArgs';

// Data for creating a new world.
export type WorldCreateData = Omit<Prisma.WorldCreateInput, 'id' | 'blocks' | 'entitiesInWorld'>;
// Assuming 'id' is auto-generated and relations are managed separately.

// Data for updating an existing world.
export type WorldUpdateData = Partial<Omit<Prisma.WorldUpdateInput, 'id' | 'blocks' | 'entitiesInWorld'>>;

// Define common include options (example)
const worldIncludeCounts = {
	_count: {
		select: {
			blocks: true, // Count of blocks in this world
			entitiesInWorld: true, // Count of entities placed in this world
		},
	},
} satisfies Prisma.WorldInclude<DefaultArgs>;

export type WorldWithCounts = Prisma.WorldGetPayload<{
	include: typeof worldIncludeCounts;
}>;

class WorldRepositoryInternal {
	async create(data: WorldCreateData): Promise<World> {
		return prisma.world.create({
			data,
		});
	}

	async findById(id: string, includeCounts: boolean = false): Promise<WorldWithCounts | World | null> {
		return prisma.world.findUnique({
			where: { id },
			include: includeCounts ? worldIncludeCounts : undefined,
		});
	}

	async findByName(name: string, includeCounts: boolean = false): Promise<WorldWithCounts | World | null> {
		return prisma.world.findUnique({
			where: { name },
			include: includeCounts ? worldIncludeCounts : undefined,
		});
	}

	/**
	 * Updates a world's properties.
	 * @param id - The ID of the world to update.
	 * @param data - The data to update.
	 * @returns The updated world.
	 */
	async update(id: string, data: WorldUpdateData): Promise<World> {
		return prisma.world.update({
			where: { id },
			data,
		});
	}

	/**
	 * Deletes a world.
	 * This would cascade to delete its WorldBlocks and potentially un-link or delete EntitiesInWorld
	 * depending on the `onDelete` behavior defined in your Prisma schema for those relations.
	 * @param id - The ID of the world to delete.
	 * @returns The deleted world.
	 */
	async delete(id: string): Promise<World> {
		return prisma.world.delete({
			where: { id },
		});
	}

	/**
	 * Retrieves a list of all worlds with pagination.
	 * @param pagination - Pagination arguments.
	 * @param filter - Optional filter criteria.
	 * @param orderBy - Optional order by criteria.
	 * @param includeCounts - Whether to include counts of blocks and entities.
	 * @returns A list of worlds.
	 */
	async findAll(
		{ skip, take }: IPaginationArgs = {},
		filter?: Prisma.WorldWhereInput,
		orderBy?: Prisma.WorldOrderByWithRelationInput,
		includeCounts: boolean = false,
	): Promise<Array<WorldWithCounts | World>> {
		return prisma.world.findMany({
			skip,
			take,
			where: filter,
			orderBy: orderBy || { name: 'asc' },
			include: includeCounts ? worldIncludeCounts : undefined,
		});
	}

	/**
	 * Counts the total number of worlds, optionally applying a filter.
	 * @param filter - Optional filter criteria.
	 * @returns The total count of worlds.
	 */
	async count(filter?: Prisma.WorldWhereInput): Promise<number> {
		return prisma.world.count({
			where: filter,
		});
	}

	/**
	 * Checks if a world name already exists.
	 * @param name - The world name to check.
	 * @returns True if the name exists, false otherwise.
	 */
	async nameExists(name: string): Promise<boolean> {
		const count = await prisma.world.count({
			where: { name },
		});
		return count > 0;
	}

	// Additional methods specific to World might include:
	// - Finding worlds by type (e.g., 'PvP', 'Tutorial') if you add a 'type' field.
	// - Finding worlds with available player slots (if you add 'currentPlayers'/'maxPlayers').
}

export const worldRepository = new WorldRepositoryInternal();
