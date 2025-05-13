// packages/po_server/src/repositories/EquipmentEntityRepository.ts
import { Prisma, EquipmentEntity, Entity, Character } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';
import { prisma } from '../client'; // Corrected import

// Data for equipping an entity.
export type EquipmentEntityCreateData = Omit<
  Prisma.EquipmentEntityCreateInput,
  'entity' | 'character'
> & {
  entityId: string;
  characterId: string;
  // slotType is already required by Prisma.EquipmentEntityCreateInput
};

// Data for updating an equipment slot (e.g., toggling isActive, locking).
// PK (entityId) cannot be changed. characterId and slotType usually don't change.
export type EquipmentEntityUpdateData = Partial<
  Omit<Prisma.EquipmentEntityUpdateInput, 'entityId' | 'slotType' | 'entity' | 'character'>
>;

// Define common include options
const equipmentEntityIncludeDetails = {
  entity: true, // Include the full entity details
  character: {
    select: { id: true, name: true }, // Include basic character info
  },
} satisfies Prisma.EquipmentEntityInclude<DefaultArgs>;

export type EquipmentEntityWithDetails = Prisma.EquipmentEntityGetPayload<{
  include: typeof equipmentEntityIncludeDetails;
}>;

class EquipmentEntityRepositoryInternal {
  /**
   * Equips an entity to a character's specified slot.
   * Assumes the entity is equippable and the slot is available or will be replaced.
   * @param data - Equipment data including entityId, characterId, slotType.
   * @returns The created equipment entity record.
   */
  async equipItem(data: EquipmentEntityCreateData): Promise<EquipmentEntity> {
    // A service layer would handle:
    // 1. Checking if character meets requirements for the item.
    // 2. Unequipping any item currently in data.slotType for data.characterId.
    // 3. Moving the item from inventory (if it was there) to an equipped state.
    // Prisma will enforce the @@unique([characterId, slotType]) constraint.
    return prisma.equipmentEntity.create({
      data: {
        entityId: data.entityId,
        characterId: data.characterId,
        slotType: data.slotType,
        isActive: data.isActive === undefined ? true : data.isActive, // Default to active if not specified
        locked: data.locked || false,
      },
    });
  }

  /**
   * Finds an equipped item by the entity ID (which is the PK).
   * @param entityId - The ID of the equipped entity.
   * @param includeDetails - Whether to include related entity and character details.
   * @returns The equipment slot or null if not found.
   */
  async findByEntityId(
    entityId: string,
    includeDetails: boolean = false,
  ): Promise<EquipmentEntityWithDetails | EquipmentEntity | null> {
    return prisma.equipmentEntity.findUnique({
      where: { entityId },
      include: includeDetails ? equipmentEntityIncludeDetails : undefined,
    });
  }

  /**
   * Finds all equipment for a specific character.
   * @param characterId - The ID of the character.
   * @param isActive - Optional: filter by active status.
   * @param includeDetails - Whether to include related entity details.
   * @returns A list of equipped items.
   */
  async findByCharacterId(
    characterId: string,
    isActive?: boolean,
    includeDetails: boolean = false,
  ): Promise<Array<EquipmentEntityWithDetails | EquipmentEntity>> {
    const whereClause: Prisma.EquipmentEntityWhereInput = { characterId };
    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    return prisma.equipmentEntity.findMany({
      where: whereClause,
      orderBy: { slotType: 'asc' }, // Example ordering
      include: includeDetails ? equipmentEntityIncludeDetails : undefined,
    });
  }

  /**
   * Finds what entity, if any, is equipped in a character's specific slot.
   * @param characterId - The ID of the character.
   * @param slotType - The equipment slot type (e.g., "HEAD", "MAIN_HAND").
   * @param includeDetails - Whether to include related entity details.
   * @returns The equipped item or null if the slot is empty.
   */
  async findByCharacterAndSlot(
    characterId: string,
    slotType: string,
    includeDetails: boolean = false,
  ): Promise<EquipmentEntityWithDetails | EquipmentEntity | null> {
    return prisma.equipmentEntity.findUnique({
      where: {
        unique_equipment_slot: {
          characterId,
          slotType,
        },
      },
      include: includeDetails ? equipmentEntityIncludeDetails : undefined,
    });
  }

  /**
   * Updates an equipped item's properties (e.g., isActive, locked).
   * @param entityId - The ID of the entity whose equipment record is to be updated.
   * @param data - The data to update.
   * @returns The updated equipment entity record.
   */
  async update(entityId: string, data: EquipmentEntityUpdateData): Promise<EquipmentEntity> {
    return prisma.equipmentEntity.update({
      where: { entityId },
      data,
    });
  }

  /**
   * Unequips an item (deletes the EquipmentEntity record).
   * The Entity itself is NOT deleted. A service layer would handle moving it to inventory or dropping it.
   * @param entityId - The ID of the entity to unequip.
   * @returns The deleted equipment entity record.
   */
  async unequipItem(entityId: string): Promise<EquipmentEntity> {
    // In a service, you might also want to update the entity's worldId or ownerCharacterId
    // if it's being "dropped" or returned to a general pool rather than inventory.
    return prisma.equipmentEntity.delete({
      where: { entityId },
    });
  }

  /**
   * Unequips whatever item is in a specific slot for a character.
   * @param characterId - The ID of the character.
   * @param slotType - The slot type to clear.
   * @returns The unequipped item's record, or null if the slot was already empty.
   */
  async unequipSlot(characterId: string, slotType: string): Promise<EquipmentEntity | null> {
    // This requires finding the entityId first based on characterId and slotType.
    const equippedItem = await this.findByCharacterAndSlot(characterId, slotType);
    if (equippedItem) {
      return prisma.equipmentEntity.delete({
        where: { entityId: equippedItem.entityId },
      });
    }
    return null;
  }

  /**
   * Toggles the active state of an equipped item (e.g., for weapon sets).
   * @param entityId - The ID of the equipped entity.
   * @param isActive - The new active state. If undefined, it toggles the current state.
   * @returns The updated equipment entity record.
   */
  async setActiveStatus(entityId: string, isActive?: boolean): Promise<EquipmentEntity> {
    if (isActive === undefined) {
      // Toggle current state
      const current = await this.findByEntityId(entityId);
      if (!current) throw new Error(`Equipped entity ${entityId} not found.`);
      return prisma.equipmentEntity.update({
        where: { entityId },
        data: { isActive: !current.isActive },
      });
    } else {
      // Set specific state
      return prisma.equipmentEntity.update({
        where: { entityId },
        data: { isActive },
      });
    }
  }
}

export const equipmentEntityRepository = new EquipmentEntityRepositoryInternal();
