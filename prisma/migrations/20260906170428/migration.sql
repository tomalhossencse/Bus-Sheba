/*
  Warnings:

  - A unique constraint covering the columns `[tripSeatId]` on the table `booking_seats` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "booking_seats_tripSeatId_key" ON "booking_seats"("tripSeatId");
