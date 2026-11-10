-- AlterTable
ALTER TABLE "RecurringTask" ADD COLUMN     "lastCreatedOn" DATE;

-- CreateIndex
CREATE UNIQUE INDEX "Task_recurringTaskId_date_key" ON "Task"("recurringTaskId", "date");

