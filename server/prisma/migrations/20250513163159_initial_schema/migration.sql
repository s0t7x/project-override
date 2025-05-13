-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'MODERATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "maxCharacters" SMALLINT NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "lastIP" TEXT,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "bannedUntil" TIMESTAMP(3),
    "banReason" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPlayedAt" TIMESTAMP(3),
    "playTime" TEXT,
    "level" SMALLINT NOT NULL DEFAULT 1,
    "experience" BIGINT NOT NULL DEFAULT 0,
    "appearance" JSONB,
    "statsBase" JSONB,
    "statsModified" JSONB,
    "metadata" JSONB,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "ownerCharacterId" TEXT,
    "worldId" TEXT,
    "components" JSONB NOT NULL,
    "enhancementLevel" SMALLINT,
    "durability" INTEGER,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryEntity" (
    "entityId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "bagId" TEXT,
    "slotIndex" SMALLINT NOT NULL,
    "stackSize" SMALLINT NOT NULL DEFAULT 1,

    CONSTRAINT "InventoryEntity_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "EquipmentEntity" (
    "entityId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "slotType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EquipmentEntity_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "WorldBlock" (
    "worldId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "z" INTEGER NOT NULL,
    "blockType" TEXT NOT NULL,
    "rotation" SMALLINT,
    "customData" JSONB,

    CONSTRAINT "WorldBlock_pkey" PRIMARY KEY ("worldId","x","y","z")
);

-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_key" ON "Character"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryEntity_characterId_slotIndex_bagId_key" ON "InventoryEntity"("characterId", "slotIndex", "bagId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentEntity_characterId_slotType_key" ON "EquipmentEntity"("characterId", "slotType");

-- CreateIndex
CREATE UNIQUE INDEX "World_name_key" ON "World"("name");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_ownerCharacterId_fkey" FOREIGN KEY ("ownerCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntity" ADD CONSTRAINT "InventoryEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryEntity" ADD CONSTRAINT "InventoryEntity_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEntity" ADD CONSTRAINT "EquipmentEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentEntity" ADD CONSTRAINT "EquipmentEntity_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldBlock" ADD CONSTRAINT "WorldBlock_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
