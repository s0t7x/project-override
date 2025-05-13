// packages/po_server/src/repositories/UserRepository.ts
import { Prisma, User, UserRole } from '@prisma/client'; // PrismaClient no longer needed here directly for class type
import { DefaultArgs } from '@prisma/client/runtime/library';
import { prisma } from '../client'; // Import the shared prisma instance

// PaginationArgs, UserCreateData, UserUpdateData, userIncludeRelations, UserWithCharacterPreviews types remain the same...
// (I'll omit them here for brevity, but they are identical to the previous version)
export interface PaginationArgs {
  skip?: number;
  take?: number;
}
export type UserCreateData = Omit<
  Prisma.UserCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'characters' | 'loginCount'
>;
export type UserUpdateData = Partial<
  Omit<Prisma.UserUpdateInput, 'id' | 'createdAt' | 'updatedAt' | 'characters'>
>;
const userIncludeRelations = {
  characters: { select: { id: true, name: true, level: true, lastPlayedAt: true } },
} satisfies Prisma.UserInclude<DefaultArgs>;
export type UserWithCharacterPreviews = Prisma.UserGetPayload<{
  include: typeof userIncludeRelations;
}>;

class UserRepositoryInternal {
  // Renamed to avoid conflict if class name was exported
  // No constructor needed to accept prisma, or a private constructor if you want to be strict
  // private prismaInstance: PrismaClient;
  // constructor() {
  //   this.prismaInstance = prisma; // Use the imported shared instance
  // }

  // All methods will now use `prisma` directly (the imported module-level const)
  // instead of `this.prisma`.

  async create(data: UserCreateData): Promise<User> {
    return prisma.user.create({
      // Use imported `prisma`
      data: {
        ...data,
        role: data.role as UserRole | undefined,
      },
    });
  }

  async findById(
    id: string,
    includeCharacters: boolean = false,
  ): Promise<UserWithCharacterPreviews | User | null> {
    return prisma.user.findUnique({
      // Use imported `prisma`
      where: { id },
      include: includeCharacters ? userIncludeRelations : undefined,
    });
  }

  async findByUsername(
    username: string,
    includeCharacters: boolean = false,
  ): Promise<UserWithCharacterPreviews | User | null> {
    return prisma.user.findUnique({
      // Use imported `prisma`
      where: { username },
      include: includeCharacters ? userIncludeRelations : undefined,
    });
  }

  async update(id: string, data: UserUpdateData): Promise<User> {
    return prisma.user.update({
      // Use imported `prisma`
      where: { id },
      data: {
        ...data,
        role: data.role as UserRole | undefined,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      // Use imported `prisma`
      where: { id },
    });
  }

  async findAll(
    { skip, take }: PaginationArgs = {},
    filter?: Prisma.UserWhereInput,
    orderBy?: Prisma.UserOrderByWithRelationInput,
  ): Promise<User[]> {
    return prisma.user.findMany({
      // Use imported `prisma`
      skip,
      take,
      where: filter,
      orderBy: orderBy || { createdAt: 'desc' },
    });
  }

  async count(filter?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({
      // Use imported `prisma`
      where: filter,
    });
  }

  async recordLogin(id: string, ipAddress?: string): Promise<User> {
    return prisma.user.update({
      // Use imported `prisma`
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastIP: ipAddress,
        loginCount: {
          increment: 1,
        },
      },
    });
  }

  async banUser(id: string, bannedUntil: Date, banReason?: string): Promise<User> {
    return prisma.user.update({
      // Use imported `prisma`
      where: { id },
      data: {
        bannedUntil,
        banReason,
      },
    });
  }

  async unbanUser(id: string): Promise<User> {
    return prisma.user.update({
      // Use imported `prisma`
      where: { id },
      data: {
        bannedUntil: null,
        banReason: null,
      },
    });
  }

  async findBannedUsers({ skip, take }: PaginationArgs = {}): Promise<User[]> {
    return prisma.user.findMany({
      // Use imported `prisma`
      skip,
      take,
      where: {
        bannedUntil: {
          gte: new Date(),
        },
      },
      orderBy: {
        bannedUntil: 'asc',
      },
    });
  }

  async usernameExists(username: string): Promise<boolean> {
    const count = await prisma.user.count({
      // Use imported `prisma`
      where: { username },
    });
    return count > 0;
  }
}

// Export a single instance of the repository
export const userRepository = new UserRepositoryInternal();
