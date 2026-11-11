-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterTable
ALTER TABLE "LearningStep" ADD COLUMN     "difficulty" "Difficulty";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "difficulty" "Difficulty",
ADD COLUMN     "fromPlan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plannedStart" INTEGER;

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "blocks" JSONB NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "dayStart" INTEGER NOT NULL DEFAULT 540,
    "dayEnd" INTEGER NOT NULL DEFAULT 1020,
    "maxBlock" INTEGER NOT NULL DEFAULT 90,
    "breakMinutes" INTEGER NOT NULL DEFAULT 15,
    "lunchStart" INTEGER NOT NULL DEFAULT 780,
    "lunchMinutes" INTEGER NOT NULL DEFAULT 30,
    "prayersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "locationName" TEXT NOT NULL DEFAULT 'Cairo',
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 30.0444,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 31.2357,
    "timeZone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "method" TEXT NOT NULL DEFAULT 'Egyptian',
    "asrMethod" TEXT NOT NULL DEFAULT 'Standard',
    "prayerMinutes" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayPlan_date_key" ON "DayPlan"("date");

