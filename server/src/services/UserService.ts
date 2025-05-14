// packages/po_server/src/services/UserService.ts
import { User } from '@prisma/client';
import {
  userRepository,
  UserCreateData,
  UserUpdateData,
  UserWithCharacterPreviews,
} from '../db/repos/UserRepository';
// No direct need for characterRepository here usually, as user repo can include character previews.
// If complex character interactions related to user actions are needed, CharacterService could be injected/used.
import {
  NotFoundError,
  BusinessRuleError,
  ValidationError,
} from '@project-override/shared/dist/messages/ServerError';
import bcrypt from 'bcryptjs'; // For password hashing
import { config } from '../config';

class UserServiceInternal {
  /**
   * Registers a new user with a hashed password.
   * @param registrationData - Username and plain text password.
   * @returns The created user (passwordHash will be set, plain password is not stored).
   * @throws BusinessRuleError for invalid username/password or if username exists.
   */
  async registerUser(
    registrationData: Pick<
      UserCreateData,
      'username' | 'passwordHash' /* but will be plain text */
    >,
  ): Promise<User> {
    const { username, passwordHash: plainPassword } = registrationData;

    if (!config.userRegistrationAllowed) {
      throw new BusinessRuleError('User registration is currently disabled.', 403); // 403 Forbidden
    }
    if (!username || username.trim().length < 3) {
      throw new ValidationError('Username must be at least 3 characters long.');
    }
    if (await userRepository.usernameExists(username)) {
      throw new BusinessRuleError(`Username "${username}" is already taken.`, 409); // 409 Conflict
    }
    if (!plainPassword || plainPassword.length < config.userPasswordMinLength) {
      throw new ValidationError(
        `Password must be at least ${config.userPasswordMinLength} characters long.`,
      );
    }
    // TODO: Add more password complexity rules if needed (uppercase, number, special char)

    const hashedPassword = await bcrypt.hash(plainPassword, config.userPasswordSaltRounds);

    const createData: UserCreateData = {
      username,
      passwordHash: hashedPassword,
      // role and maxCharacters will use schema defaults
    };

    return userRepository.create(createData);
  }

  /**
   * Finds a user by their ID.
   * @param userId The ID of the user.
   * @param includeCharacterPreviews Whether to include a preview of the user's characters.
   * @returns The user or null if not found.
   */
  async getUserById(
    userId: string,
    includeCharacterPreviews: boolean = false,
  ): Promise<UserWithCharacterPreviews | User | null> {
    return userRepository.findById(userId, includeCharacterPreviews);
  }

  /**
   * Finds a user by their username.
   * @param username The username of the user.
   * @param includeCharacterPreviews Whether to include a preview of the user's characters.
   * @returns The user or null if not found.
   */
  async getUserByUsername(
    username: string,
    includeCharacterPreviews: boolean = false,
  ): Promise<UserWithCharacterPreviews | User | null> {
    return userRepository.findByUsername(username, includeCharacterPreviews);
  }

  /**
   * Updates a user's profile information.
   * @param userId The ID of the user to update.
   * @param updateData Data to update (e.g., maxCharacters, role - careful with role changes).
   *                   Password changes should go through a specific changePassword method.
   * @returns The updated user.
   * @throws NotFoundError if user not found.
   */
  async updateUserProfile(
    userId: string,
    updateData: Omit<UserUpdateData, 'passwordHash' | 'username'>,
  ): Promise<User> {
    // Username changes might need special handling or be disallowed.
    // Password changes should have their own secure method.
    // Role changes should be admin-only.
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }
    return userRepository.update(userId, updateData);
  }

  /**
   * Changes a user's password after verifying the old password.
   * @param userId The ID of the user.
   * @param oldPassword The user's current plain text password.
   * @param newPassword The new plain text password.
   * @returns The updated user.
   * @throws NotFoundError if user not found.
   * @throws BusinessRuleError if old password doesn't match or new password is invalid.
   */
  async changeUserPassword(
    userId: string,
    oldPasswordPlainText: string,
    newPasswordPlainText: string,
  ): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }

    const isOldPasswordValid = await bcrypt.compare(oldPasswordPlainText, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new BusinessRuleError('Incorrect old password.', 401); // 401 Unauthorized
    }

    if (!newPasswordPlainText || newPasswordPlainText.length < config.userPasswordMinLength) {
      throw new ValidationError(
        `New password must be at least ${config.userPasswordMinLength} characters long.`,
      );
    }
    if (oldPasswordPlainText === newPasswordPlainText) {
      throw new BusinessRuleError('New password cannot be the same as the old password.');
    }
    // TODO: Add more password complexity rules for newPassword

    const newHashedPassword = await bcrypt.hash(
      newPasswordPlainText,
      config.userPasswordSaltRounds,
    );
    return userRepository.update(userId, { passwordHash: newHashedPassword });
  }

  /**
   * Records a user login.
   * @param userId The ID of the user logging in.
   * @param ipAddress Optional IP address of the login.
   */
  async recordUserLogin(userId: string, ipAddress?: string): Promise<void> {
    // This can fail if user not found, but often we just want to attempt it.
    // If user MUST exist, add a check.
    try {
      await userRepository.recordLogin(userId, ipAddress);
    } catch (error) {
      console.warn(`Failed to record login for user ${userId}:`, error);
      // Don't necessarily throw, as login might proceed even if this fails.
    }
  }

  /**
   * Deletes a user.
   * This is a hard delete and will cascade to delete their characters due to schema relations.
   * @param userId The ID of the user to delete.
   * @returns The deleted user record.
   * @throws NotFoundError if user not found.
   */
  async deleteUser(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found.`);
    }
    // Any pre-deletion logic for the user (e.g., logging, notifying other systems) would go here.
    return userRepository.delete(userId);
  }

  // --- Admin specific functions (would typically check caller's role) ---

  async adminBanUser(
    adminUserId: string,
    targetUserId: string,
    bannedUntil: Date,
    banReason?: string,
  ): Promise<User> {
    // TODO: Add role check for adminUserId
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError(`Target user with ID ${targetUserId} not found.`);
    }
    return userRepository.banUser(targetUserId, bannedUntil, banReason);
  }

  async adminUnbanUser(adminUserId: string, targetUserId: string): Promise<User> {
    // TODO: Add role check for adminUserId
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError(`Target user with ID ${targetUserId} not found.`);
    }
    return userRepository.unbanUser(targetUserId);
  }

  async adminUpdateUserRole(
    adminUserId: string,
    targetUserId: string,
    newRole: User['role'],
  ): Promise<User> {
    // TODO: Add role check for adminUserId
    const targetUser = await userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError(`Target user with ID ${targetUserId} not found.`);
    }
    return userRepository.update(targetUserId, { role: newRole });
  }
}

export const userService = new UserServiceInternal();
