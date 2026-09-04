/*
  Warnings:

  - A unique constraint covering the columns `[source,destination]` on the table `routes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "idx_route_source_destination";

-- CreateIndex
CREATE INDEX "idx_route_source_destination" ON "routes"("source", "destination", "name");

-- CreateIndex
CREATE UNIQUE INDEX "routes_source_destination_key" ON "routes"("source", "destination");
