-- AlterTable
ALTER TABLE "World" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ownerCharacterId" TEXT;
