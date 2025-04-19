// server/src/db/repositories/UserRepository.ts
// Methods for User model CRUD operations (create, findById, findByUsername, etc.).
// Abstracts direct Prisma calls for the User model.

import prisma from '../client'; // Use the singleton Prisma client instance
import { User } from '@prisma/client'; // Import the generated User type

export class UserRepository {

    /**
     * Finds a user by their unique username.
     * @param username - The username to search for.
     * @returns The User object or null if not found.
     */
    async findByUsername(username: string): Promise<User | null> {
        try {
            return await prisma.user.findUnique({
                where: { username },
            });
        } catch (error) {
            console.error(`[UserRepository] Error finding user by username "${username}":`, error);
            // Depending on desired error handling, you might throw, return null, or a custom error
            return null; // Keep it simple for the example
        }
    }

    /**
     * Finds a user by their unique ID.
     * @param id - The user ID to search for.
     * @returns The User object or null if not found.
     */
    async findById(id: string): Promise<User | null> {
         try {
            return await prisma.user.findUnique({
                where: { id },
            });
        } catch (error) {
            console.error(`[UserRepository] Error finding user by ID "${id}":`, error);
            return null;
        }
    }

     /**
     * Creates a new user.
     * @param username - The desired unique username.
     * @param hashedPassword - The securely hashed password.
     * @returns The newly created User object or null if creation fails (e.g., username taken).
     */
    async create(username: string, hashedPassword: string): Promise<User | null> {
        try {
            // Prisma's create throws if constraints (like unique username) fail
            return await prisma.user.create({
                data: {
                    username,
                    hashedPassword,
                },
            });
        } catch (error: any) {
            // Check if the error is due to a unique constraint violation (P2002)
            if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
                 console.warn(`[UserRepository] Attempted to create user with existing username: "${username}"`);
                 return null; // Username already exists
            }
            console.error(`[UserRepository] Error creating user "${username}":`, error);
            return null; // Other unexpected error
        }
    }

    // Add other methods as needed (e.g., deleteUser, updateUserPassword)
}

// Export an instance if you prefer singleton repositories, or export the class
// for dependency injection frameworks or manual instantiation.
export const userRepository = new UserRepository();