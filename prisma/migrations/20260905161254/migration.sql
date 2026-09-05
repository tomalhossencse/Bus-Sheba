/*
  Warnings:

  - You are about to alter the column `seatNumber` on the `seats` table. The data in that column could be lost. The data in that column will be cast from `VarChar(30)` to `VarChar(10)`.

*/
-- AlterTable
ALTER TABLE "seats" ALTER COLUMN "seatNumber" SET DATA TYPE VARCHAR(10);
