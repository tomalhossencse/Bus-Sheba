/*
  Warnings:

  - Added the required column `fromStopId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toStopId` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "fromStopId" UUID NOT NULL,
ADD COLUMN     "toStopId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
