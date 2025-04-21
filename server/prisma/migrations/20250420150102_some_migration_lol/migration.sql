-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `hashedPassword` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Character` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `experience` BIGINT NOT NULL DEFAULT 0,
    `bytes` BIGINT NOT NULL DEFAULT 0,
    `hackChips` INTEGER NOT NULL DEFAULT 0,
    `currentRoomInstanceId` VARCHAR(191) NULL,
    `positionX` DOUBLE NULL,
    `positionY` DOUBLE NULL,
    `positionZ` DOUBLE NULL,
    `rotationY` DOUBLE NULL,
    `statsJson` JSON NULL,
    `inventoryJson` JSON NULL,
    `equipmentJson` JSON NULL,
    `customizationJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Character_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BaseEntity` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `defaultComponents` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstancedEntity` (
    `id` VARCHAR(191) NOT NULL,
    `baseEntityId` VARCHAR(191) NOT NULL,
    `instanceDataJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InstancedEntity_baseEntityId_idx`(`baseEntityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `World` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `entities` JSON NULL,

    UNIQUE INDEX `World_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MapData` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `blockData` JSON NOT NULL,

    UNIQUE INDEX `MapData_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Room` (
    `id` VARCHAR(191) NOT NULL,
    `worldId` VARCHAR(191) NULL,
    `mapDataId` VARCHAR(191) NOT NULL,
    `ownerCharacterId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `isPlayerOwned` BOOLEAN NOT NULL DEFAULT false,
    `whitelistJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Room_worldId_idx`(`worldId`),
    INDEX `Room_mapDataId_idx`(`mapDataId`),
    INDEX `Room_ownerCharacterId_idx`(`ownerCharacterId`),
    INDEX `Room_isPlayerOwned_isPublic_idx`(`isPlayerOwned`, `isPublic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guild` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NULL,
    `ownerCharacterId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `guildBankJson` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Guild_name_key`(`name`),
    UNIQUE INDEX `Guild_tag_key`(`tag`),
    UNIQUE INDEX `Guild_ownerCharacterId_key`(`ownerCharacterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuildMember` (
    `id` VARCHAR(191) NOT NULL,
    `guildId` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `rank` ENUM('LEADER', 'OFFICER', 'VETERAN', 'MEMBER', 'RECRUIT') NOT NULL DEFAULT 'RECRUIT',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GuildMember_characterId_key`(`characterId`),
    INDEX `GuildMember_guildId_idx`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Friendship` (
    `id` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `friendId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_SENT', 'PENDING_RECEIVED', 'ACCEPTED', 'BLOCKED_BY_YOU', 'BLOCKED_BY_THEM') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Friendship_friendId_idx`(`friendId`),
    UNIQUE INDEX `Friendship_characterId_friendId_key`(`characterId`, `friendId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Quest` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `levelRequirement` INTEGER NOT NULL DEFAULT 1,
    `objectivesJson` JSON NOT NULL,
    `rewardsJson` JSON NOT NULL,
    `prerequisitesJson` JSON NULL,

    UNIQUE INDEX `Quest_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CharacterQuest` (
    `id` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `questId` VARCHAR(191) NOT NULL,
    `status` ENUM('UNAVAILABLE', 'AVAILABLE', 'ACTIVE', 'COMPLETED', 'REWARDED', 'FAILED') NOT NULL,
    `progressJson` JSON NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CharacterQuest_questId_idx`(`questId`),
    UNIQUE INDEX `CharacterQuest_characterId_questId_key`(`characterId`, `questId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuctionListing` (
    `id` VARCHAR(191) NOT NULL,
    `sellerCharacterId` VARCHAR(191) NOT NULL,
    `itemSnapshotJson` JSON NOT NULL,
    `buyoutPrice` BIGINT NULL,
    `startingBid` BIGINT NOT NULL,
    `currentBid` BIGINT NULL,
    `currentBidderId` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `status` ENUM('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',

    INDEX `AuctionListing_sellerCharacterId_idx`(`sellerCharacterId`),
    INDEX `AuctionListing_expiresAt_idx`(`expiresAt`),
    INDEX `AuctionListing_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Character` ADD CONSTRAINT `Character_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstancedEntity` ADD CONSTRAINT `InstancedEntity_baseEntityId_fkey` FOREIGN KEY (`baseEntityId`) REFERENCES `BaseEntity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_worldId_fkey` FOREIGN KEY (`worldId`) REFERENCES `World`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_mapDataId_fkey` FOREIGN KEY (`mapDataId`) REFERENCES `MapData`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_ownerCharacterId_fkey` FOREIGN KEY (`ownerCharacterId`) REFERENCES `Character`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Guild` ADD CONSTRAINT `Guild_ownerCharacterId_fkey` FOREIGN KEY (`ownerCharacterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildMember` ADD CONSTRAINT `GuildMember_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `Guild`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuildMember` ADD CONSTRAINT `GuildMember_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Friendship` ADD CONSTRAINT `Friendship_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Friendship` ADD CONSTRAINT `Friendship_friendId_fkey` FOREIGN KEY (`friendId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterQuest` ADD CONSTRAINT `CharacterQuest_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CharacterQuest` ADD CONSTRAINT `CharacterQuest_questId_fkey` FOREIGN KEY (`questId`) REFERENCES `Quest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuctionListing` ADD CONSTRAINT `AuctionListing_sellerCharacterId_fkey` FOREIGN KEY (`sellerCharacterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuctionListing` ADD CONSTRAINT `AuctionListing_currentBidderId_fkey` FOREIGN KEY (`currentBidderId`) REFERENCES `Character`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
