-- AlterTable
ALTER TABLE "LearningStep" ADD COLUMN     "coveredById" TEXT,
ADD COLUMN     "estimateMinutes" INTEGER,
ADD COLUMN     "milestoneId" TEXT,
ADD COLUMN     "pages" TEXT;

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Milestone_learningPathId_order_idx" ON "Milestone"("learningPathId", "order");

-- CreateIndex
CREATE INDEX "LearningStep_milestoneId_idx" ON "LearningStep"("milestoneId");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningStep" ADD CONSTRAINT "LearningStep_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningStep" ADD CONSTRAINT "LearningStep_coveredById_fkey" FOREIGN KEY ("coveredById") REFERENCES "LearningStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

