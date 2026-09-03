/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `operators` table. All the data in the column will be lost.
  - You are about to drop the column `approvedById` on the `operators` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "operators" DROP CONSTRAINT "operators_approvedById_fkey";

-- AlterTable
ALTER TABLE "operators" DROP COLUMN "approvedAt",
DROP COLUMN "approvedById",
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" UUID;

-- AddForeignKey
ALTER TABLE "operators" ADD CONSTRAINT "operators_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
