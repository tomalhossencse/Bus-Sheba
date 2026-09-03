/*
  Warnings:

  - You are about to drop the column `otherDocument` on the `operators` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "operators" DROP COLUMN "otherDocument",
ADD COLUMN     "additionalDocuments" JSONB;
