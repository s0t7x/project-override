// server/src/services/AuthService.ts
// Handles password hashing, comparison, JWT generation, and JWT verification logic.
// Used by AuthRoom and other authenticated rooms.

import bcrypt from 'bcryptjs'; // Use bcryptjs as listed in dependencies
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

// Import repository and config
import { userRepository, UserRepository } from '../db/repositories/UserRepository'; // Assuming singleton export
import { ILoginRequestPayload, IRegisterRequestPayload } from 'shared/types/messages'; // Use shared message types

export class AuthService {
    private readonly SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

    // Inject dependencies or use singletons like this:
    constructor(private userRepo: UserRepository = userRepository) {}

    /**
     * Registers a new user. Hashes the password and saves to DB via repository.
     * @param payload - Registration data containing username and password.
     * @returns The newly created User object or null if registration fails (e.g., username taken).
     */
    async register(payload: IRegisterRequestPayload): Promise<User | null> {
        try {
            const hashedPassword = await bcrypt.hash(payload.password, this.SALT_ROUNDS);
            const newUser = await this.userRepo.create(payload.username, hashedPassword);
            return newUser; // Returns user object on success, null if username exists or DB error
        } catch (error) {
            console.error("[AuthService] Error during registration:", error);
            return null;
        }
    }

    /**
     * Attempts to log in a user. Verifies credentials and generates a JWT on success.
     * @param payload - Login data containing username and password.
     * @returns A JWT string on successful login, or null if login fails.
     */
    async login(payload: ILoginRequestPayload): Promise<string | null> {
        try {
            const user = await this.userRepo.findByUsername(payload.username);
            if (!user) {
                console.log(`[AuthService] Login failed: User "${payload.username}" not found.`);
                return null; // User not found
            }

            const isPasswordValid = await bcrypt.compare(payload.password, user.hashedPassword);
            if (!isPasswordValid) {
                 console.log(`[AuthService] Login failed: Invalid password for user "${payload.username}".`);
                return null; // Invalid password
            }

            // Password is valid, generate JWT
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                // Add other relevant non-sensitive info if needed (e.g., roles)
            };

            const token = jwt.sign(
                tokenPayload,
                process.env.JWT_SECRET || "default_secret", // Use a default secret for local testing
                { expiresIn: process.env.JWT_EXPIRES_IN || ("1h" as any) } // Default expiration time
            );

            console.log(`[AuthService] User "${payload.username}" logged in successfully.`);
            return token;

        } catch (error) {
            console.error("[AuthService] Error during login:", error);
            return null;
        }
    }

     /**
     * Verifies a JWT token.
     * @param token - The JWT string to verify.
     * @returns The decoded token payload if valid, otherwise null.
     */
    verifyJwt(token: string): Record<string, any> | null {
        try {
            // jwt.verify throws an error if token is invalid or expired
            const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as Record<string, any>;
            return decoded;
        } catch (error: any) {
             console.warn(`[AuthService] JWT verification failed: ${error.message}`);
             return null;
        }
    }
}

// Export an instance for easy use
export const authService = new AuthService();