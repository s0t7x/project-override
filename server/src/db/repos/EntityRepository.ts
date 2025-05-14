// packages/po_server/src/repositories/EntityRepository.ts
import { Prisma, Entity, Character } from '@prisma/client'; // PrismaClient not needed for class
import { DefaultArgs } from '@prisma/client/runtime/library';
import { prisma } from '../client'; // Corrected import for the shared prisma instance
import { IPaginationArgs } from '@project-override/shared/dist/misc/PaginationArgs';

// Data for creating an entity.
// ownerCharacterId, worldId, templateId are optional based on your schema.
// Components is JSON.
export type EntityCreateData = Omit<Prisma.EntityCreateInput, 'id' | 'createdAt' | 'lastUsedAt' | 'ownerCharacter' | 'inventorySlot' | 'equipmentSlot'>;

// Data for updating an entity.
export type EntityUpdateData = Partial<Omit<Prisma.EntityUpdateInput, 'id' | 'createdAt' | 'ownerCharacter' | 'inventorySlot' | 'equipmentSlot'>>;

// Define common include options for entities
const entityIncludeOwner = {
	ownerCharacter: {
		select: { id: true, name: true, userId: true },
	},
} satisfies Prisma.EntityInclude<DefaultArgs>;

// More detailed include, perhaps for an entity inspection view
const entityIncludeDetails = {
	...entityIncludeOwner,
	inventorySlot: {
		// If you want to see if/where it's inventoried
		select: { characterId: true, slotIndex: true, bagId: true },
	},
	equipmentSlot: {
		// If you want to see if/where it's equipped
		select: { characterId: true, slotType: true },
	},
	// If templateId linked to an EntityTemplate table:
	// template: true,
	// If worldId linked to a World table:
	// world: { select: { id: true, name: true } },
} satisfies Prisma.EntityInclude<DefaultArgs>;

export type EntityWithOwner = Prisma.EntityGetPayload<{
	include: typeof entityIncludeOwner;
}>;

export type EntityWithDetails = Prisma.EntityGetPayload<{
	include: typeof entityIncludeDetails;
}>;

class EntityRepositoryInternal {
	async create(data: EntityCreateData): Promise<Entity> {
		return prisma.entity.create({
			data,
		});
	}

	async findById(id: string, includeDetails: boolean = false): Promise<EntityWithDetails | Entity | null> {
		return prisma.entity.findUnique({
			where: { id },
			include: includeDetails ? entityIncludeDetails : undefined,
		});
	}

	/**
	 * Updates an entity by its ID.
	 * @param id - The ID of the entity to update.
	 * @param data - The data to update.
	 * @returns The updated entity.
	 */
	async update(id: string, data: EntityUpdateData): Promise<Entity> {
		return prisma.entity.update({
			where: { id },
			data: {
				...data,
				lastUsedAt: data.lastUsedAt !== undefined ? new Date() : undefined, // Example: update lastUsedAt if provided in data
			},
		});
	}

	/**
	 * Deletes an entity by its ID.
	 * This will cascade to InventoryEntity and EquipmentEntity if they reference this entity's ID as their own PK.
	 * @param id - The ID of the entity to delete.
	 * @returns The deleted entity.
	 */
	async delete(id: string): Promise<Entity> {
		return prisma.entity.delete({
			where: { id },
		});
	}

	/**
	 * Finds all entities with pagination.
	 * @param pagination - Pagination arguments.
	 * @param filter - Optional filter criteria.
	 * @param orderBy - Optional order by criteria.
	 * @param includeOwner - Whether to include basic owner character information.
	 * @returns A list of entities.
	 */
	async findAll(
		{ skip, take }: IPaginationArgs = {},
		filter?: Prisma.EntityWhereInput,
		orderBy?: Prisma.EntityOrderByWithRelationInput,
		includeOwner: boolean = false,
	): Promise<Array<EntityWithOwner | Entity>> {
		return prisma.entity.findMany({
			skip,
			take,
			where: filter,
			orderBy: orderBy || { createdAt: 'desc' },
			include: includeOwner ? entityIncludeOwner : undefined,
		});
	}

	/**
	 * Counts the total number of entities, optionally applying a filter.
	 * @param filter - Optional filter criteria.
	 * @returns The total count of entities.
	 */
	async count(filter?: Prisma.EntityWhereInput): Promise<number> {
		return prisma.entity.count({
			where: filter,
		});
	}

	/**
	 * Finds all entities owned by a specific character.
	 * @param ownerCharacterId - The ID of the owner character.
	 * @param pagination - Pagination arguments.
	 * @returns A list of entities owned by the character.
	 */
	async findByOwnerCharacterId(ownerCharacterId: string, { skip, take }: IPaginationArgs = {}): Promise<Entity[]> {
		return prisma.entity.findMany({
			where: { ownerCharacterId },
			skip,
			take,
			orderBy: { createdAt: 'desc' },
		});
	}

	/**
	 * Finds all entities associated with a specific template ID.
	 * @param templateId - The template ID.
	 * @param pagination - Pagination arguments.
	 * @returns A list of entities.
	 */
	async findByTemplateId(templateId: string, { skip, take }: IPaginationArgs = {}): Promise<Entity[]> {
		return prisma.entity.findMany({
			where: { templateId },
			skip,
			take,
			orderBy: { createdAt: 'desc' },
		});
	}

	/**
	 * Finds entities by one or more tags.
	 * @param tags - An array of tags. Entities must have at least one of these tags.
	 * @param matchAll - If true, entities must have ALL specified tags. If false (default), ANY tag match.
	 * @param pagination - Pagination arguments.
	 * @returns A list of entities.
	 */
	async findByTags(tags: string[], matchAll: boolean = false, { skip, take }: IPaginationArgs = {}): Promise<Entity[]> {
		return prisma.entity.findMany({
			where: {
				tags: matchAll ? { hasEvery: tags } : { hasSome: tags },
			},
			skip,
			take,
		});
	}

	/**
	 * Finds entities that are not currently in any character's inventory or equipment slots.
	 * These might be world items or items "owned" but not actively carried/used.
	 * @param worldId - Optional: filter further by a specific worldId if they are world items.
	 * @param pagination - Pagination arguments.
	 * @returns A list of unlinked entities.
	 */
	async findUnlinkedEntities({ skip, take }: IPaginationArgs = {}, worldId?: string): Promise<Entity[]> {
		return prisma.entity.findMany({
			where: {
				inventorySlot: null, // Not in an inventory slot
				equipmentSlot: null, // Not in an equipment slot
				worldId: worldId, // Optional: further filter by worldId
				// ownerCharacterId: { not: null } // Optional: if you only want owned but unlinked items
			},
			skip,
			take,
			orderBy: { createdAt: 'desc' },
		});
	}

	/**
	 * Updates the components JSONB for a specific entity.
	 * This performs a deep merge of the existing components with the new components.
	 * For a complete overwrite, a service layer method would first fetch, then replace.
	 * Note: Prisma's JSON `set` overwrites, `update` can be tricky for deep merges without raw queries or careful object construction.
	 * This example demonstrates a common need - adding/updating specific component data.
	 * @param entityId The ID of the entity.
	 * @param componentsToUpdate The components data to merge/update.
	 * @returns The updated entity.
	 */
	async updateComponents(entityId: string, componentsToUpdate: Prisma.InputJsonObject): Promise<Entity> {
		// Fetch the current entity to merge components manually, as Prisma's JSON update path is an overwrite.
		// For more complex JSON manipulation (like array ops within JSON), you might need raw SQL or more sophisticated logic.
		const entity = await prisma.entity.findUnique({ where: { id: entityId } });
		if (!entity) {
			throw new Error(`Entity with ID ${entityId} not found.`);
		}

		// Simple shallow merge for example. Deep merge would require a utility function.
		const currentComponents = (entity.components || {}) as Prisma.InputJsonObject;
		const newComponents = { ...currentComponents, ...componentsToUpdate };

		return prisma.entity.update({
			where: { id: entityId },
			data: {
				components: newComponents,
			},
		});
	}

	// --- Methods for specific component queries (if components JSONB has a known structure) ---
	// Example: If you often query by a 'type' property within 'components'
	// async findByComponentType(componentType: string, { skip, take }: PaginationArgs = {}): Promise<Entity[]> {
	//   return prisma.entity.findMany({
	//     where: {
	//       components: {
	//         path: ['type'], // Path to the 'type' key within the JSONB
	//         equals: componentType,
	//       },
	//     },
	//     skip,
	//     take,
	//   });
	// }
}

// Export a single instance of the repository
export const entityRepository = new EntityRepositoryInternal();
