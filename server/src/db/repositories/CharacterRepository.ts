import { CharacterCustomizationState } from '../../rooms/schemas/CharacterCustomizationState';
import prisma from '../client'; // Use the singleton Prisma client instance
import { Character, Prisma } from '@prisma/client'; // Import Character type and Prisma namespace for JsonValue type
import { CharacterEquipmentVisualsState } from '../../rooms/schemas/CharacterEquipmentVisualsState';
import { ICharacterSummary, ICreateCharacterPayload } from 'shared/types';
import { Color3Schema } from '../../rooms/schemas/Color3Schema';
import { CharacterSummaryState } from '../../rooms/schemas/CharacterSummaryState';
import { entityRepository } from './EntityRepository';

class CharacterCreationData implements ICreateCharacterPayload {
    userId: string;
    name: string;
    customization: CharacterCustomizationState;
    cloth_body_hue: number = 0;
    cloth_legs_hue: number = 0;
} ;

type CharacterUpdateData = Partial<Omit<Character, 'id' | 'userId' | 'createdAt' | 'name'>>;

export class CharacterRepository {
    /**
     * Finds a character by their unique ID.
     * @param id - The character ID to search for.
     * @returns The Character object or null if not found.
     */
    async findById(id: string): Promise<Character | null> {
        try {
            return await prisma.character.findUnique({
                where: { id }
            });
        } catch (error) {
            console.error(`[CharacterRepository] Error finding character by ID "${id}":`, error);
            return null;
        }
    }

    /**
     * Finds a character by their unique name.
     * @param name - The character name to search for.
     * @returns The Character object or null if not found.
     */
    async findByName(name: string): Promise<Character | null> {
        try {
            return await prisma.character.findUnique({
                where: { name },
            });
        } catch (error) {
            console.error(`[CharacterRepository] Error finding character by name "${name}":`, error);
            return null;
        }
    }

    /**
     * Finds all characters belonging to a specific user ID.
     * @param userId - The user ID whose characters to find.
     * @returns An array of Character objects, potentially empty.
     */
    async findByUserId(userId: string): Promise<Character[]> {
        try {
            return await prisma.character.findMany({
                where: { userId },
                orderBy: { createdAt: 'asc' }, // Order by creation date
            });
        } catch (error) {
            console.error(`[CharacterRepository] Error finding characters by user ID "${userId}":`, error);
            return []; // Return empty array on error
        }
    }

    /**
     * Creates a new character for a given user.
     * @param data - Object containing required userId, name, and optional initial data.
     * @returns The newly created Character object or null if creation fails (e.g., name taken).
     */
    async create(data: CharacterCreationData): Promise<Character | null> {
        try {
            // Prisma's create throws if constraints (like unique name) fail
            const char: Character = await prisma.character.create({
                data: {
                    userId: data.userId,
                    name: data.name,
                    customizationJson: JSON.stringify(data.customization)
                },
            });
            const starterBodyInst = await entityRepository.createInstance("starter_body", { instanceDataJson: JSON.stringify({sprite: { hueShift: data.cloth_body_hue || 0 }})});
            const starterLegsInst = await entityRepository.createInstance("starter_legs", { instanceDataJson: JSON.stringify({sprite: { hueShift: data.cloth_legs_hue || 0 }})})
            char.equipmentJson = JSON.stringify({
                body: starterBodyInst?.id,
                legs: starterLegsInst?.id
            })
            return await this.update(char.id, char)
        } catch (error: any) {
            if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
                 console.warn(`[CharacterRepository] Attempted to create character with existing name: "${data.name}"`);
                 return null; // Name already exists
            }
             if (error.code === 'P2003' && error.meta?.field_name?.includes('userId')) {
                 console.error(`[CharacterRepository] Attempted to create character for non-existent user ID: "${data.userId}"`);
                 return null; // User doesn't exist
             }
            console.error(`[CharacterRepository] Error creating character "${data.name}":`, error);
            return null; // Other unexpected error
        }
    }

    /**
     * Updates specific fields of an existing character. Used for saving player state.
     * @param characterId - The ID of the character to update.
     * @param data - An object containing the fields to update (e.g., position, level, inventoryJson).
     * @returns The updated Character object or null if the update fails (e.g., character not found).
     */
    async update(characterId: string, data: CharacterUpdateData): Promise<Character | null> {
        try {
            return await prisma.character.update({
                where: { id: characterId },
                data: (data as any), // Pass the partial data object directly
            });
        } catch (error: any) {
            // Check if the error is because the record to update was not found (P2025)
            if (error.code === 'P2025') {
                 console.warn(`[CharacterRepository] Attempted to update non-existent character ID: "${characterId}"`);
                 return null; // Character not found
            }
            console.error(`[CharacterRepository] Error updating character "${characterId}":`, error);
            return null; // Other unexpected error
        }
    }

     /**
      * Deletes a character by their ID. Use with caution in an MMO context.
      * @param characterId - The ID of the character to delete.
      * @returns True if deletion was successful, false otherwise.
      */
     async delete(characterId: string): Promise<boolean> {
         try {
             const deletedChar = await prisma.character.delete({
                 where: { id: characterId },
             });
             const equipment = JSON.parse(deletedChar.equipmentJson as string || 'null')
             if(equipment) {
                for (const instId of Object.values(equipment)) {
                    await entityRepository.deleteInstance(instId as string || '')
                }
             }
             const inventory = JSON.parse(deletedChar.inventoryJson as string || 'null')
            if(inventory) {
                for (const instId of Object.values(inventory)) {
                    await entityRepository.deleteInstance(instId as string || '')
                }
             }
             console.log(`[CharacterRepository] Deleted character ID: "${characterId}"`);
             return true;
         } catch (error: any) {
              // Check if the error is because the record to delete was not found (P2025)
             if (error.code === 'P2025') {
                  console.warn(`[CharacterRepository] Attempted to delete non-existent character ID: "${characterId}"`);
                  return false; // Character not found
             }
             console.error(`[CharacterRepository] Error deleting character "${characterId}":`, error);
             return false; // Other unexpected error
         }
     }

    async nameExists(name: string): Promise<boolean> {
        try {
             const count = await prisma.character.count({
                 where: { name: name },
             });
             return count > 0;
        } catch (error) {
             console.error(`[CharacterRepository] Error checking name existence for "${name}":`, error);
             return false; // Assume doesn't exist on error? Or throw?
        }
    }

    async getSummary(character: Character): Promise<CharacterSummaryState | null> {
        const characterCustomizationState = new CharacterCustomizationState();
        if(character.customizationJson) {
            const customization = JSON.parse(character.customizationJson as any)
            characterCustomizationState.assign({ 
                ...customization,
                baseColor: new Color3Schema(customization.baseColor.r, customization.baseColor.g, customization.baseColor.b),
                eyesColor: new Color3Schema(customization.eyesColor.r, customization.eyesColor.g, customization.eyesColor.b),
                hairColor: new Color3Schema(customization.hairColor.r, customization.hairColor.g, customization.hairColor.b),
            });
        }

        // should get equipment and create VisualsState
        const characterEquipmentVisualsState = new CharacterEquipmentVisualsState();
        if(character.equipmentJson) {
            const equipment = JSON.parse(character.equipmentJson as any)
            if(equipment.body) {
                const itemEntityInstance = await entityRepository.findInstanceById(equipment.body, true);
                if(itemEntityInstance) {
                    const baseData = JSON.parse(itemEntityInstance?.baseEntity?.defaultComponents as string || 'null') as any;
                    const instancedData = JSON.parse(itemEntityInstance?.instanceDataJson as string || 'null') as any;
                    if((baseData?.equipable || instancedData?.equipable) && (baseData?.sprite || instancedData?.sprite)) {
                        if(instancedData?.sprite)
                            baseData.sprite = baseData.sprite ? { ...baseData.sprite, ...instancedData.sprite } : instancedData.sprite;

                        characterEquipmentVisualsState.bodySpriteSheet = baseData.sprite.textureURI;
                        characterEquipmentVisualsState.bodyHueShift = baseData.sprite.hueShift;
                    }
                }
            }
            if(equipment.legs) {
                const itemEntityInstance = await entityRepository.findInstanceById(equipment.legs, true);
                if(itemEntityInstance) {
                    const baseData = JSON.parse(itemEntityInstance?.baseEntity?.defaultComponents as string || 'null') as any;
                    const instancedData = JSON.parse(itemEntityInstance?.instanceDataJson as string || 'null') as any;
                    if((baseData?.equipable || instancedData?.equipable) && (baseData?.sprite || instancedData?.sprite)) {
                        if(instancedData?.sprite)
                            baseData.sprite = baseData.sprite ? { ...baseData.sprite, ...instancedData.sprite } : instancedData.sprite;

                        characterEquipmentVisualsState.legsSpriteSheet = baseData.sprite.textureURI;
                        characterEquipmentVisualsState.legsHueShift = baseData.sprite.hueShift;
                    }
                }
            }
            if(equipment.hat) {
                const itemEntityInstance = await entityRepository.findInstanceById(equipment.hat, true);
                if(itemEntityInstance) {
                    const baseData = JSON.parse(itemEntityInstance?.baseEntity?.defaultComponents as string || 'null') as any;
                    const instancedData = JSON.parse(itemEntityInstance?.instanceDataJson as string || 'null') as any;
                    if((baseData?.equipable || instancedData?.equipable) && (baseData?.sprite || instancedData?.sprite)) {
                        if(instancedData?.sprite)
                            baseData.sprite = baseData.sprite ? { ...baseData.sprite, ...instancedData.sprite } : instancedData.sprite;

                        characterEquipmentVisualsState.hatSpriteSheet = baseData.sprite.textureURI;
                        characterEquipmentVisualsState.hatHueShift = baseData.sprite.hueShift;
                    }
                }
            }
        }

        const summary = new CharacterSummaryState().assign({
            id: character.id,
            name: character.name,
            level: character.level,
            customization: characterCustomizationState,
            equipmentVisuals: characterEquipmentVisualsState
        });

        return summary;
    }

    async getSummaryById(characterId: string): Promise<CharacterSummaryState | null> {
        const char = await this.findById(characterId);
        if(!char) return null
        return this.getSummary(char);
    }
}

// Export an instance if you prefer singleton repositories, or export the class
// for dependency injection frameworks or manual instantiation.
export const characterRepository = new CharacterRepository();