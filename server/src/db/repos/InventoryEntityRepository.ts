// packages/po_server/src/repositories/InventoryEntityRepository.ts
import { Prisma, InventoryEntity, Entity, Character } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';
import { prisma } from '../client'; // Corrected import
import { IPaginationArgs } from '@project-override/shared/dist/misc/PaginationArgs';

// Data for adding an entity to an inventory.
// entityId and characterId are key.
export type InventoryEntityCreateData = Omit<Prisma.InventoryEntityCreateInput, 'entity' | 'character'> & {
	entityId: string; // Explicitly require
	characterId: string; // Explicitly require
};
// Note: Prisma.InventoryEntityCreateInput already expects entityId and characterId
// if you don't use the connect object syntax. So this type might be Prisma.InventoryEntityCreateInput directly.
// For clarity, I'm defining it to show the core fields.

// Data for updating an inventory slot (e.g., changing stack size, moving to different slot/bag).
// PK (entityId) cannot be changed. characterId usually doesn't change for an existing inventory item.
export type InventoryEntityUpdateData = Partial<Omit<Prisma.InventoryEntityUpdateInput, 'entityId' | 'entity' | 'character'>>;

// Define common include options
const inventoryEntityIncludeDetails = {
	entity: true, // Include the full entity details
	character: {
		select: { id: true, name: true }, // Include basic character info
	},
} satisfies Prisma.InventoryEntityInclude<DefaultArgs>;

export type InventoryEntityWithDetails = Prisma.InventoryEntityGetPayload<{
	include: typeof inventoryEntityIncludeDetails;
}>;

class InventoryEntityRepositoryInternal {
	/**
	 * Adds an entity to a character's inventory.
	 * Assumes the entity is not already in an inventory or equipped.
	 * @param data - Inventory slot data including entityId, characterId, slotIndex.
	 * @returns The created inventory entity record.
	 */
	async addToInventory(data: InventoryEntityCreateData): Promise<InventoryEntity> {
		// In a real service, you might check if the slot is already occupied for this character/bag.
		// Prisma will enforce the @@unique constraint.
		return prisma.inventoryEntity.create({
			data: {
				entityId: data.entityId,
				characterId: data.characterId,
				slotIndex: data.slotIndex,
				bagId: data.bagId,
				stackSize: data.stackSize || 1,
			},
		});
	}

	/**
	 * Finds an inventory slot by the entity ID (which is the PK).
	 * @param entityId - The ID of the entity in the inventory.
	 * @param includeDetails - Whether to include related entity and character details.
	 * @returns The inventory slot or null if not found.
	 */
	async findByEntityId(entityId: string, includeDetails: boolean = false): Promise<InventoryEntityWithDetails | InventoryEntity | null> {
		return prisma.inventoryEntity.findUnique({
			where: { entityId },
			include: includeDetails ? inventoryEntityIncludeDetails : undefined,
		});
	}

	/**
	 * Finds all inventory items for a specific character.
	 * @param characterId - The ID of the character.
	 * @param bagId - Optional: filter by a specific bag ID within the inventory.
	 * @param pagination - Pagination arguments.
	 * @param includeDetails - Whether to include related entity details.
	 * @returns A list of inventory items.
	 */
	async findByCharacterId(
		characterId: string,
		{ skip, take }: IPaginationArgs = {},
		bagId?: string | null, // null to find items not in any bag, undefined for all
		includeDetails: boolean = false,
	): Promise<Array<InventoryEntityWithDetails | InventoryEntity>> {
		const whereClause: Prisma.InventoryEntityWhereInput = { characterId };
		if (bagId !== undefined) {
			whereClause.bagId = bagId; // If bagId is null, it finds items where bagId IS NULL
		}

		return prisma.inventoryEntity.findMany({
			where: whereClause,
			skip,
			take,
			orderBy: [{ bagId: 'asc' }, { slotIndex: 'asc' }], // Example ordering
			include: includeDetails ? inventoryEntityIncludeDetails : undefined,
		});
	}

	/**
	 * Updates an inventory slot's properties (e.g., stackSize, slotIndex, bagId).
	 * @param entityId - The ID of the entity whose inventory record is to be updated.
	 * @param data - The data to update (e.g., new slotIndex, stackSize).
	 * @returns The updated inventory entity record.
	 */
	async update(entityId: string, data: InventoryEntityUpdateData): Promise<InventoryEntity> {
		// Ensure characterId is not part of the update data if it shouldn't change.
		// Or, if moving between characters (unlikely for this model), handle that explicitly.
		return prisma.inventoryEntity.update({
			where: { entityId },
			data,
		});
	}

	/**
	 * Removes an entity from inventory (deletes the InventoryEntity record).
	 * The Entity itself is NOT deleted by this operation.
	 * @param entityId - The ID of the entity to remove from inventory.
	 * @returns The deleted inventory entity record.
	 */
	async removeFromInventory(entityId: string): Promise<InventoryEntity> {
		return prisma.inventoryEntity.delete({
			where: { entityId },
		});
	}

	/**
	 * Moves an item to a different slot or bag within the same character's inventory.
	 * This is a more complex operation that might involve checking target slot availability.
	 * For simplicity, this just updates the record. A service would handle validation.
	 * @param entityId - The ID of the entity to move.
	 * @param newSlotIndex - The new slot index.
	 * @param newBagId - Optional: the new bag ID.
	 * @returns The updated inventory entity record.
	 */
	async moveItem(entityId: string, newSlotIndex: number, newBagId?: string | null): Promise<InventoryEntity> {
		// A service layer should validate if the target slot is free or can be swapped.
		// Prisma's unique constraint on (characterId, slotIndex, bagId) will prevent direct overlap
		// if you try to move to an occupied slot without freeing it first.
		return prisma.inventoryEntity.update({
			where: { entityId },
			data: {
				slotIndex: newSlotIndex,
				bagId: newBagId,
			},
		});
	}

	/**
	 * Increments the stack size of an item in inventory.
	 * @param entityId - The ID of the entity.
	 * @param amount - The amount to increment by (default 1).
	 * @returns The updated inventory entity record.
	 */
	async incrementStack(entityId: string, amount: number = 1): Promise<InventoryEntity> {
		// In a real service, check against max stack size for the item type.
		return prisma.inventoryEntity.update({
			where: { entityId },
			data: {
				stackSize: {
					increment: amount,
				},
			},
		});
	}

	/**
	 * Decrements the stack size of an item in inventory.
	 * If stack size reaches zero or less, the item should typically be removed from inventory.
	 * This method returns the updated record; a service would handle removal.
	 * @param entityId - The ID of the entity.
	 * @param amount - The amount to decrement by (default 1).
	 * @returns The updated inventory entity record.
	 */
	async decrementStack(entityId: string, amount: number = 1): Promise<InventoryEntity> {
		// A service layer should check if stackSize - amount <= 0 and then call removeFromInventory.
		return prisma.inventoryEntity.update({
			where: { entityId },
			data: {
				stackSize: {
					decrement: amount,
				},
			},
		});
	}

	/**
	 * Checks if a specific slot is occupied for a character (and optionally a bag).
	 * @param characterId
	 * @param slotIndex
	 * @param bagId
	 * @returns The InventoryEntity if occupied, otherwise null.
	 */
	async getSlotContents(characterId: string, slotIndex: number, bagId?: string | null): Promise<InventoryEntity | null> {
		return prisma.inventoryEntity.findUnique({
			where: {
				unique_inventory_slot: {
					// This relies on the default generated composite key name or your specified name
					characterId,
					slotIndex,
					bagId: bagId === undefined ? '' : bagId || '',
				},
			},
		});
	}
}

export const inventoryEntityRepository = new InventoryEntityRepositoryInternal();
