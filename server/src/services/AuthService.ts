// packages/po_server/src/services/AuthService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { userRepository } from '../db/repos/UserRepository';
import { userService } from './UserService'; // For user login recording
import { config } from '../config';
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@project-override/shared/dist/misc/ServerError';
import { IAuthTokens, IJwtPayload } from '@project-override/shared/dist/game/Auth';

// For storing refresh tokens. In a real app, this MUST be a persistent store (e.g., Redis, DB table).
// Using a simple in-memory store for this example is NOT production-ready.
interface RefreshTokenStoreEntry {
  token: string;
  userId: string;
  expiresAt: Date;
}
const inMemoryRefreshTokenStore: Map<string, RefreshTokenStoreEntry> = new Map(); // NOT FOR PRODUCTION

class AuthServiceInternal {
  /**
   * Authenticates a user by username and password.
   * @param username The user's username.
   * @param plainPassword The user's plain text password.
   * @param ipAddress Optional IP address for login recording.
   * @returns AuthTokens containing an access token and a refresh token.
   * @throws NotFoundError if user not found.
   * @throws BusinessRuleError if password doesn't match.
   */
  async login(
    username: string,
    plainPasswordPlainText: string,
    ipAddress?: string,
  ): Promise<IAuthTokens> {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new NotFoundError(`User "${username}" not found.`);
    }

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      throw new ForbiddenError(
        `User "${username}" is banned until ${user.bannedUntil.toISOString()}. Reason: ${user.banReason || 'N/A'}`,
      );
    }

    const isPasswordValid = await bcrypt.compare(plainPasswordPlainText, user.passwordHash);
    if (!isPasswordValid) {
      throw new BusinessRuleError('Invalid username or password.', 401); // 401 Unauthorized
    }

    // Record login attempt (can be done asynchronously, fire-and-forget)
    userService
      .recordUserLogin(user.id, ipAddress)
      .catch((err) => console.warn('Failed to record login:', err));

    return this.generateAndStoreTokens(user);
  }

  /**
   * Generates new access and refresh tokens for a user.
   * Stores the refresh token (in this example, in-memory - use a DB/Redis in prod).
   */
  private async generateAndStoreTokens(user: User): Promise<IAuthTokens> {
    const accessTokenPayload: IJwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
    const accessToken = jwt.sign(accessTokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiration as any,
    });

    // Refresh token payload typically only contains userId and maybe a version/nonce
    // to invalidate old refresh tokens if needed (e.g., after password change)
    const refreshTokenPayload = { userId: user.id, version: user.loginCount }; // Example versioning
    const refreshToken = jwt.sign(refreshTokenPayload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshTokenExpiration as any,
    });

    // Store refresh token (replace in-memory with persistent storage)
    const expiresAt = new Date();
    // A bit hacky to parse expiration string, better to use ms from config
    const durationParts = config.jwt.refreshTokenExpiration.match(/(\d+)([smhdwy])/);
    let durationMs = 7 * 24 * 60 * 60 * 1000; // Default 7 days
    if (durationParts) {
      const value = parseInt(durationParts[1]);
      const unit = durationParts[2];
      if (unit === 's') durationMs = value * 1000;
      else if (unit === 'm') durationMs = value * 60 * 1000;
      else if (unit === 'h') durationMs = value * 60 * 60 * 1000;
      else if (unit === 'd') durationMs = value * 24 * 60 * 60 * 1000;
    }
    expiresAt.setTime(expiresAt.getTime() + durationMs);

    // In a real app, save refreshToken to a database table associated with the user.
    // Key: Hashed refresh token or a unique ID. Value: userId, expiry, isValid flag.
    inMemoryRefreshTokenStore.set(refreshToken, {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    });
    console.log(
      `Refresh token stored for user ${user.id}. Store size: ${inMemoryRefreshTokenStore.size}`,
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refreshes an access token using a valid refresh token.
   * @param oldRefreshToken The refresh token provided by the client.
   * @returns New AuthTokens.
   * @throws BusinessRuleError if refresh token is invalid, expired, or not found.
   * @throws NotFoundError if user associated with token not found.
   */
  async refreshToken(oldRefreshToken: string): Promise<IAuthTokens> {
    // 1. Validate refresh token structure/signature
    let decodedRefreshPayload: { userId: string; version?: number; iat: number; exp: number };
    try {
      decodedRefreshPayload = jwt.verify(oldRefreshToken, config.jwt.refreshSecret) as any;
    } catch (error: any) {
      if (error instanceof jwt.TokenExpiredError) {
        this.invalidateRefreshToken(oldRefreshToken); // Clean up expired token from store
        throw new BusinessRuleError('Refresh token expired.', 401);
      }
      throw new BusinessRuleError('Invalid refresh token.', 401);
    }

    // 2. Check if refresh token exists in our store and is still valid
    const storedTokenEntry = inMemoryRefreshTokenStore.get(oldRefreshToken);
    if (!storedTokenEntry || storedTokenEntry.expiresAt < new Date()) {
      this.invalidateRefreshToken(oldRefreshToken); // Clean up
      throw new BusinessRuleError('Refresh token not found or expired.', 401);
    }
    if (storedTokenEntry.userId !== decodedRefreshPayload.userId) {
      // Should not happen if JWT verification passed, but good sanity check
      this.invalidateRefreshToken(oldRefreshToken);
      throw new BusinessRuleError('Refresh token mismatch.', 401);
    }

    // 3. Fetch the user
    const user = await userRepository.findById(decodedRefreshPayload.userId);
    if (!user) {
      this.invalidateRefreshToken(oldRefreshToken);
      throw new NotFoundError(
        `User ${decodedRefreshPayload.userId} associated with refresh token not found.`,
      );
    }

    // 4. (Optional but recommended) Check if refresh token has been revoked
    // e.g., if user.loginCount (our version) changed since token was issued
    if (
      decodedRefreshPayload.version !== undefined &&
      decodedRefreshPayload.version < user.loginCount
    ) {
      console.warn(
        `Attempt to use an old refresh token for user ${user.id}. Invalidating all user's tokens.`,
      );
      await this.invalidateAllUserRefreshTokens(user.id); // Invalidate all if one compromised/old one is used
      throw new BusinessRuleError(
        'Refresh token has been revoked (user session changed). Please log in again.',
        401,
      );
    }

    // 5. Invalidate the used refresh token (refresh tokens should typically be single-use or employ rotation)
    // For simplicity, we'll allow re-use until expiry for this example, but proper rotation is better.
    // If implementing rotation: this.invalidateRefreshToken(oldRefreshToken);

    // 6. Generate new pair of tokens
    return this.generateAndStoreTokens(user);
  }

  /**
   * Verifies an access token.
   * @param accessToken The access token to verify.
   * @returns The decoded JWT payload if valid.
   * @throws BusinessRuleError if token is invalid or expired.
   */
  verifyAccessToken(accessToken: string): IJwtPayload {
    try {
      const payload = jwt.verify(accessToken, config.jwt.secret) as IJwtPayload;
      return payload;
    } catch (error: any) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new BusinessRuleError('Access token expired.', 401);
      }
      console.error('Access token verification error:', error.message);
      throw new BusinessRuleError('Invalid access token.', 401);
    }
  }

  /**
   * Invalidates a given refresh token (removes from store).
   * @param refreshToken The refresh token to invalidate.
   */
  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    // Remove from persistent store in a real app
    inMemoryRefreshTokenStore.delete(refreshToken);
    console.log(`Refresh token invalidated. Store size: ${inMemoryRefreshTokenStore.size}`);
  }

  /**
   * Invalidates ALL refresh tokens for a given user.
   * Useful for "log out everywhere" or after a security event like password change.
   * @param userId The ID of the user.
   */
  async invalidateAllUserRefreshTokens(userId: string): Promise<void> {
    // In a real app: DELETE FROM RefreshTokensTable WHERE userId = ?
    let invalidatedCount = 0;
    for (const [token, entry] of inMemoryRefreshTokenStore.entries()) {
      if (entry.userId === userId) {
        inMemoryRefreshTokenStore.delete(token);
        invalidatedCount++;
      }
    }
    console.log(
      `Invalidated ${invalidatedCount} refresh tokens for user ${userId}. Store size: ${inMemoryRefreshTokenStore.size}`,
    );
  }

  // Periodically clean up expired tokens from the in-memory store (not needed for DB with TTL/cron)
  private cleanupExpiredRefreshTokens() {
    const now = new Date();
    let cleanedCount = 0;
    for (const [token, entry] of inMemoryRefreshTokenStore.entries()) {
      if (entry.expiresAt < now) {
        inMemoryRefreshTokenStore.delete(token);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(
        `Cleaned up ${cleanedCount} expired refresh tokens. Store size: ${inMemoryRefreshTokenStore.size}`,
      );
    }
  }

  constructor() {
    // Start periodic cleanup for the in-memory store example
    setInterval(() => this.cleanupExpiredRefreshTokens(), 30 * 60_000); // Every 30 min
  }
}

export const authService = new AuthServiceInternal();
