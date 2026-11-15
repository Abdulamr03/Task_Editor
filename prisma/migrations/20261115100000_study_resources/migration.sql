-- AlterTable
ALTER TABLE "LearningStep" ADD COLUMN     "resources" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "resourcesFoundAt" TIMESTAMP(3);

