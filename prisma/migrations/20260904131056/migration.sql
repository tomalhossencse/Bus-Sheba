/*
  Warnings:

  - A unique constraint covering the columns `[source,destination,name]` on the table `routes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[routeId,travelDate,departureTime]` on the table `trips` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[busId,travelDate,departureTime]` on the table `trips` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SeatLayout" AS ENUM ('TWO_BY_TWO', 'ONE_BY_TWO', 'TWO_BY_ONE');

-- DropIndex
DROP INDEX "idx_route_source_destination";

-- DropIndex
DROP INDEX "routes_source_destination_key";

-- DropIndex
DROP INDEX "trips_routeId_travelDate_status_idx";

-- AlterTable
ALTER TABLE "buses" ADD COLUMN     "seatLayout" "SeatLayout" NOT NULL DEFAULT 'TWO_BY_TWO';

-- CreateIndex
CREATE UNIQUE INDEX "routes_source_destination_name_key" ON "routes"("source", "destination", "name");

-- CreateIndex
CREATE UNIQUE INDEX "trips_routeId_travelDate_departureTime_key" ON "trips"("routeId", "travelDate", "departureTime");

-- CreateIndex
CREATE UNIQUE INDEX "trips_busId_travelDate_departureTime_key" ON "trips"("busId", "travelDate", "departureTime");

-- RenameIndex
ALTER INDEX "trips_busId_idx" RENAME TO "idx_busId";

-- RenameIndex
ALTER INDEX "trips_routeId_idx" RENAME TO "idx_routeId";

-- RenameIndex
ALTER INDEX "trips_status_idx" RENAME TO "idx_status";

-- RenameIndex
ALTER INDEX "trips_travelDate_idx" RENAME TO "idx_travelDate";
