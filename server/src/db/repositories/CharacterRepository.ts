// server/src/db/repositories/CharacterRepository.ts
// Methods for Character model CRUD operations (create, findById, findByUserId, update state etc.).
// Abstracts direct Prisma calls for the Character model.

import prisma from '../client'; // Use the singleton Prisma client instance
import { Character, Prisma } from '@prisma/client'; // Import Character type and Prisma namespace for JsonValue type

// Define a type for the data needed to create a character (minimum required fields)
type CharacterCreationData = {
    userId: string;
    name: string;
    // Add optional fields that might be provided at creation (e.g., appearance details)
    // statsJson?: Prisma.JsonValue;
    // inventoryJson?: Prisma.JsonValue;
    // equipmentJson?: Prisma.JsonValue;
};

// Define a type for the data used to update a character's state
// Use Partial and Omit to allow updating only some fields and exclude immutable ones
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
                where: { id },
                // Optionally include related data if needed frequently, e.g.:
                // include: { user: { select: { username: true } } } // Get username too
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
            return await prisma.character.create({
                data: {
                    userId: data.userId,
                    name: data.name,
                    // Spread any other optional initial data provided
                    // statsJson: data.statsJson ?? Prisma.JsonNull, // Set defaults if needed
                    // inventoryJson: data.inventoryJson ?? Prisma.JsonNull,
                    // equipmentJson: data.equipmentJson ?? Prisma.JsonNull,
                    // Prisma handles default values defined in schema (level, experience etc.)
                },
            });
        } catch (error: any) {
            // Check if the error is due to a unique constraint violation (P2002 on name)
            if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
                 console.warn(`[CharacterRepository] Attempted to create character with existing name: "${data.name}"`);
                 return null; // Name already exists
            }
            // Check if the error is due to foreign key constraint (User doesn't exist - P2003)
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
             // Ensure JSON fields are correctly formatted if necessary before passing to Prisma
             // For example, if data contains complex objects for JSON fields:
             // if (data.inventoryJson) data.inventoryJson = JSON.stringify(data.inventoryJson); // Example if needed

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
             await prisma.character.delete({
                 where: { id: characterId },
             });
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

    // --- Add other specific query methods as needed ---
    // Example: Check if a character name exists quickly
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

}

// Export an instance if you prefer singleton repositories, or export the class
// for dependency injection frameworks or manual instantiation.
export const characterRepository = new CharacterRepository();