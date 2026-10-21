/*
  Warnings:

  - You are about to drop the column `requiredLevel` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `requiredSkillId` on the `Task` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_requiredSkillId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "requiredLevel",
DROP COLUMN "requiredSkillId";

-- CreateTable
CREATE TABLE "TaskRequirement" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TaskRequirement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskRequirement" ADD CONSTRAINT "TaskRequirement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRequirement" ADD CONSTRAINT "TaskRequirement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
