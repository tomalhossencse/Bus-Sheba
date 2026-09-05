/*
  Warnings:

  - You are about to alter the column `ticketPdfUrl` on the `tickets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to drop the column `googlId` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_googlId_key";

-- AlterTable
ALTER TABLE "seats" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tickets" ALTER COLUMN "ticketPdfUrl" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "googlId",
ADD COLUMN     "googleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
