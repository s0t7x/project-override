// packages/po_server/src/services/CharacterService.ts
import { Character, User, Entity, InventoryEntity, EquipmentEntity } from '@prisma/client';
import { userRepository } from '../db/repos/UserRepository';
import { characterRepository, CharacterCreateData, CharacterUpdateData } from '../db/repos/CharacterRepository';
import { inventoryEntityRepository } from '../db/repos/InventoryEntityRepository';
import { equipmentEntityRepository } from '../db/repos/EquipmentEntityRepository';
import { prisma } from '../db/client';
import { JsonObject } from '@prisma/client/runtime/library';
import { ServerError, NotFoundError, ForbiddenError, BusinessRuleError } from '@project-override/shared/dist/messages/ServerError';
import { IEquipmentSlot } from '@project-override/shared/dist/core/EquipmentSlot';
import { ICharacterAppearance } from '@project-override/shared/dist/core/CharacterAppearance';

// Define a more complete Character representation for some service methods
export type FullCharacterSheet = Character & {
	user: Pick<User, 'id' | 'username'>;
	inventory: Array<InventoryEntity & { entity: Entity }>; // Entity details included
	equipment: Array<EquipmentEntity & { entity: Entity }>; // Entity details included
	// ownedWorlds: World[]; // If characters can own worlds
};

class CharacterServiceInternal {
	/**
	 * Creates a new character for a user, enforcing business rules.
	 * @param userId The ID of the user creating the character.
	 * @param characterData The core data for the new character.
	 * @returns The newly created character.
	 * @throws NotFoundError if the user doesn't exist.
	 * @throws ForbiddenError if the user cannot create more characters.
	 * @throws BusinessRuleError if the character name is taken or invalid.
	 */
	async createCharacter(userId: string, characterData: Omit<CharacterCreateData, 'userId'>): Promise<Character> {
		const user = await userRepository.findById(userId, true); // Include characters to count them
		if (!user) {
			throw new NotFoundError(`User with ID ${userId} not found.`);
		}

		// Type guard for UserWithCharacterPreviews
		const charactersCount = 'characters' in user && Array.isArray(user.characters) ? user.characters.length : 0;

		if (charactersCount >= user.maxCharacters) {
			throw new ForbiddenError(`User ${user.username} has reached the maximum character limit of ${user.maxCharacters}.`);
		}

		if (!characterData.name || characterData.name.length < 3) {
			// Example validation
			throw new BusinessRuleError('Character name must be at least 3 characters long.');
		}
		if (await characterRepository.nameExists(characterData.name)) {
			throw new BusinessRuleError(`Character name "${characterData.name}" is already taken.`);
		}

		// TODO: Add any starting items/equipment logic here, possibly in a transaction

		const newCharacter = await characterRepository.create({
			...characterData,
			userId: userId,
		});

		// Example: Give a starting item (this should ideally be transactional with character creation)
		// For simplicity, not making it transactional here.
		try {
			// const startingTunic = await entityRepository.create({
			//     templateId: "TUNIC_STARTER_ID", // Assuming this template exists
			//     components: { itemType: "armor", slot: "chest", defense: 1, description: "A simple tunic." },
			//     tags: ["armor", "starter", "chest"]
			// });
			// await inventoryEntityRepository.addToInventory({
			//     entityId: startingTunic.id,
			//     characterId: newCharacter.id,
			//     slotIndex: 0 // First available slot
			// });
		} catch (e) {
			console.warn(`Could not give starting item to character ${newCharacter.id}:`, e);
			// Don't fail character creation if starting item fails, but log it.
		}

		return newCharacter;
	}

	/**
	 * Retrieves a full character sheet including inventory and equipment.
	 * @param characterId The ID of the character.
	 * @returns The full character sheet.
	 * @throws NotFoundError if the character doesn't exist.
	 */
	async getFullCharacterSheet(characterId: string): Promise<FullCharacterSheet> {
		const character = await characterRepository.findById(characterId, true); // Include user
		if (!character) {
			throw new NotFoundError(`Character with ID ${characterId} not found.`);
		}
		// Ensure 'user' is present and correctly typed from the include
		if (!('user' in character) || !character.user) {
			throw new ServerError('Character data is missing expected user relation.');
		}

		const inventoryItems = (await inventoryEntityRepository.findByCharacterId(characterId, {}, undefined, true)) as Array<InventoryEntity & { entity: Entity }>;
		const equippedItems = (await equipmentEntityRepository.findByCharacterId(characterId, undefined, true)) as Array<EquipmentEntity & { entity: Entity }>;

		return {
			...(character as Character), // Cast to base Character, relations will be added
			user: character.user, // user is already Pick<User, 'id' | 'username'>
			inventory: inventoryItems,
			equipment: equippedItems,
		};
	}

	/**
	 * Deletes a character and performs any related cleanup.
	 * @param userId The ID of the user requesting the deletion (for ownership check).
	 * @param characterId The ID of the character to delete.
	 * @throws NotFoundError if character or user not found.
	 * @throws ForbiddenError if user does not own the character.
	 */
	async deleteCharacter(userId: string, characterId: string): Promise<Character> {
		const character = await characterRepository.findById(characterId);
		if (!character) {
			throw new NotFoundError(`Character with ID ${characterId} not found.`);
		}
		if (character.userId !== userId) {
			throw new ForbiddenError(`User ${userId} is not authorized to delete character ${characterId}.`);
		}

		if (character.isDeleted) return characterRepository.delete(characterId);
		return characterRepository.softDelete(characterId);
	}

	/**
	 * Updates character details.
	 * @param characterId The ID of the character to update.
	 * @param updateData The data to update.
	 * @returns The updated character.
	 */
	async updateCharacterDetails(characterId: string, updateData: CharacterUpdateData): Promise<Character> {
		// Add any validation for updateData here (e.g., if name is being changed, check for uniqueness)
		if (updateData.name && updateData.name !== (await characterRepository.findById(characterId))?.name) {
			if (await characterRepository.nameExists(updateData.name as string)) {
				throw new BusinessRuleError(`Character name "${updateData.name}" is already taken.`);
			}
		}
		return characterRepository.update(characterId, updateData);
	}

	/**
	 * Equips an item from a character's inventory.
	 * @param characterId The ID of the character.
	 * @param inventoryEntityId The ID of the entity record in inventory to equip.
	 * @param targetSlotType The equipment slot to equip the item to (e.g., "MAIN_HAND").
	 * @returns The new equipment record.
	 */
	async equipItemFromInventory(characterId: string, inventoryEntityId: string, targetSlotType: IEquipmentSlot): Promise<EquipmentEntity> {
		// This operation needs to be atomic (all or nothing).
		return prisma.$transaction(async (tx) => {
			const inventoryItem = await tx.inventoryEntity.findUnique({
				where: { entityId: inventoryEntityId },
				include: { entity: true },
			});

			if (!inventoryItem || inventoryItem.characterId !== characterId) {
				throw new NotFoundError(`Item ${inventoryEntityId} not found in character ${characterId}'s inventory.`);
			}
			if (!inventoryItem.entity) {
				throw new ServerError(`Entity data missing for inventory item ${inventoryEntityId}.`);
			}

			// TODO: Check if item is equippable, if character meets requirements (level, stats, class)
			// This logic would access inventoryItem.entity.components or similar
			const itemComponents = inventoryItem.entity.components as any; // Cast for example
			if (!itemComponents?.itemType || !itemComponents?.slot || itemComponents.slot !== targetSlotType) {
				throw new BusinessRuleError(`Item ${inventoryItem.entity.templateId || 'Unknown'} cannot be equipped in slot ${targetSlotType}.`);
			}

			// Check if there's an item already in the target slot and unequip it (move to inventory).
			const currentEquipped = await tx.equipmentEntity.findUnique({
				where: { unique_equipment_slot: { characterId, slotType: targetSlotType } },
			});

			const newInventorySlotIndex = inventoryItem.slotIndex; // Default to item's original slot

			if (currentEquipped) {
				// Move the currently equipped item to an available inventory slot (or the slot being freed).
				// For simplicity, let's assume it goes to the slot the new item is coming from.
				// A real system would find the next available slot or handle full inventory.
				await tx.equipmentEntity.delete({ where: { entityId: currentEquipped.entityId } });
				await tx.inventoryEntity.create({
					data: {
						entityId: currentEquipped.entityId,
						characterId: characterId,
						slotIndex: newInventorySlotIndex, // Place old item in new item's old slot
						// bagId: inventoryItem.bagId, // Potentially
						stackSize: 1, // Assuming equipped items are single stack
					},
				});
			}

			// Remove the item from inventory
			await tx.inventoryEntity.delete({ where: { entityId: inventoryEntityId } });

			// Equip the new item
			const newEquipment = await tx.equipmentEntity.create({
				data: {
					entityId: inventoryEntityId,
					characterId: characterId,
					slotType: targetSlotType,
					isActive: true,
				},
			});
			return newEquipment;
		});
	}

	/**
	 * Unequips an item and places it into the character's inventory.
	 * @param characterId The ID of the character.
	 * @param equipmentEntityId The ID of the entity record in equipment to unequip.
	 * @param targetInventorySlotIndex Optional: specific inventory slot. If -1 or undefined, finds next available.
	 * @returns The new inventory record.
	 */
	async unequipItemToInventory(characterId: string, equipmentEntityId: string, targetInventorySlotIndex?: number): Promise<InventoryEntity> {
		return prisma.$transaction(async (tx) => {
			const equippedItem = await tx.equipmentEntity.findUnique({
				where: { entityId: equipmentEntityId },
				include: { entity: true },
			});

			if (!equippedItem || equippedItem.characterId !== characterId) {
				throw new NotFoundError(`Equipped item ${equipmentEntityId} not found for character ${characterId}.`);
			}

			// Find an available inventory slot
			let slotIndexToUse = targetInventorySlotIndex;
			if (slotIndexToUse === undefined || slotIndexToUse === -1) {
				// Simple "find next available slot" logic (can be improved)
				const existingInventory = await tx.inventoryEntity.findMany({
					where: { characterId },
					select: { slotIndex: true },
					orderBy: { slotIndex: 'asc' },
				});
				const occupiedSlots = new Set(existingInventory.map((i) => i.slotIndex));
				slotIndexToUse = 0;
				while (occupiedSlots.has(slotIndexToUse)) {
					slotIndexToUse++;
				}
				// TODO: Handle full inventory
				const MAX_INV_SLOTS = 30;
				if (slotIndexToUse >= MAX_INV_SLOTS) {
					throw new BusinessRuleError('Inventory is full.');
				}
			} else {
				// Check if specified slot is free
				const slotContent = await tx.inventoryEntity.findFirst({
					where: { characterId, slotIndex: targetInventorySlotIndex },
				});
				if (slotContent) {
					throw new BusinessRuleError(`Inventory slot ${targetInventorySlotIndex} is already occupied.`);
				}
			}

			// Remove item from equipment
			await tx.equipmentEntity.delete({ where: { entityId: equipmentEntityId } });

			// Add item to inventory
			const newInventoryItem = await tx.inventoryEntity.create({
				data: {
					entityId: equipmentEntityId,
					characterId: characterId,
					slotIndex: slotIndexToUse,
					// bagId: undefined, // Or a default bag
					stackSize: 1, // Equipped items are usually single stack
				},
			});
			return newInventoryItem;
		});
	}

	async updateCharacterAppearance(characterId: string, customizationData: Partial<ICharacterAppearance>): Promise<Character> {
		const character = await characterRepository.findById(characterId);
		if (!character) {
			throw new NotFoundError(`Character with ID ${characterId} not found.`);
		}
		if (character.appearance) {
			character.appearance = {
				...(character.appearance as any),
				...customizationData,
			};
		}
		return characterRepository.update(characterId, {
			appearance: character.appearance as JsonObject,
		});
	}

	private async cleanupSoftDeletedCharacters() {
		await prisma.character.deleteMany({
			where: { isDeleted: true, deletedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
		});
	}

	constructor() {
		setInterval(() => this.cleanupSoftDeletedCharacters(), 30 * 60_000); // Every 30 min
	}

	// TODO:
	// - Add experience, handle leveling up (check against XP curve, update stats)
	// - Manage character play time
	// - Methods to get specific inventory items or equipped items by type/tag
	// - Methods for character appearance/stats modification
}

// Export a single instance of the service
export const characterService = new CharacterServiceInternal();
