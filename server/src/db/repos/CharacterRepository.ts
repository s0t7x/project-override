// packages/po_server/src/repositories/CharacterRepository.ts
import { Prisma, Character, User } from '@prisma/client'; // PrismaClient no longer needed here for class
import { DefaultArgs } from '@prisma/client/runtime/library';
import { prisma } from '../client'; // Import the shared prisma instance
import { IPaginationArgs } from '@project-override/shared/dist/misc/PaginationArgs';

export type CharacterCreateData = Omit<Prisma.CharacterCreateInput, 'id' | 'createdAt' | 'lastPlayedAt' | 'playTime' | 'user' | 'inventoryEntities' | 'equipmentEntities' | 'ownedEntities'> & {
	userId: string;
};
export type CharacterUpdateData = Partial<Omit<Prisma.CharacterUpdateInput, 'id' | 'createdAt' | 'user' | 'inventoryEntities' | 'equipmentEntities' | 'ownedEntities'>>;
const characterIncludeUser = {
	user: { select: { id: true, username: true } },
} satisfies Prisma.CharacterInclude<DefaultArgs>;
export type CharacterWithUser = Prisma.CharacterGetPayload<{
	include: typeof characterIncludeUser;
}>;

class CharacterRepositoryInternal {
	async create(data: CharacterCreateData): Promise<Character> {
		return prisma.character.create({
			data,
		});
	}

	async findById(id: string, includeUser: boolean = false, includeDeleted: boolean = true): Promise<CharacterWithUser | Character | null> {
		return prisma.character.findUnique({
			where: { id, isDeleted: includeDeleted ? undefined : false },
			include: includeUser ? characterIncludeUser : undefined,
		});
	}

	async findByName(name: string, includeUser: boolean = false, includeDeleted: boolean = true): Promise<CharacterWithUser | Character | null> {
		return prisma.character.findUnique({
			where: { name, isDeleted: includeDeleted ? undefined : false  },
			include: includeUser ? characterIncludeUser : undefined,
		});
	}

	async findByUserId(userId: string, { skip, take }: IPaginationArgs = {}, includeDeleted: boolean = true): Promise<Character[]> {
		return prisma.character.findMany({
			where: { userId, isDeleted: includeDeleted ? undefined : false  },
			skip,
			take,
			orderBy: {
				lastPlayedAt: 'desc',
			},
		});
	}

	async update(id: string, data: CharacterUpdateData): Promise<Character> {
		return prisma.character.update({
			where: { id },
			data,
		});
	}

	async delete(id: string): Promise<Character> {
		return prisma.character.delete({
			where: { id },
		});
	}

	async softDelete(id: string): Promise<Character> {
		return prisma.character.update({
			where: { id },
			data: {
				isDeleted: true,
				deletedAt: new Date()
			}
		});
	}

	async findAll(
		{ skip, take }: IPaginationArgs = {},
		filter?: Prisma.CharacterWhereInput,
		orderBy?: Prisma.CharacterOrderByWithRelationInput,
		includeUser: boolean = false,
	): Promise<Array<CharacterWithUser | Character>> {
		return prisma.character.findMany({
			skip,
			take,
			where: filter,
			orderBy: orderBy || { name: 'asc' },
			include: includeUser ? characterIncludeUser : undefined,
		});
	}

	async count(filter?: Prisma.CharacterWhereInput): Promise<number> {
		return prisma.character.count({
			where: filter,
		});
	}

	async nameExists(name: string): Promise<boolean> {
		const count = await prisma.character.count({
			where: { name },
		});
		return count > 0;
	}

	async recordPlaytime(id: string): Promise<Character> {
		return prisma.character.update({
			where: { id },
			data: {
				lastPlayedAt: new Date(),
			},
		});
	}

	async updateExperience(id: string, experienceGained: number | bigint, newLevel?: number): Promise<Character> {
		const currentCharacter = await this.findById(id); // `this.findById` still works as it's a method of the class
		if (!currentCharacter) {
			throw new Error(`Character with ID ${id} not found.`);
		}
		const newExperience = BigInt(currentCharacter.experience || 0) + BigInt(experienceGained);
		return prisma.character.update({
			where: { id },
			data: {
				experience: newExperience,
				level: newLevel !== undefined ? newLevel : currentCharacter.level,
			},
		});
	}
}

// Export a single instance of the repository
export const characterRepository = new CharacterRepositoryInternal();
