-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'USED');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "usedAt" TIMESTAMP(3),
ADD COLUMN     "usedBy" TEXT;
