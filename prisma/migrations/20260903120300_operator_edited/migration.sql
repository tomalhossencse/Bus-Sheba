/*
  Warnings:

  - You are about to drop the `operator_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OperatorVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "buses" DROP CONSTRAINT "buses_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "operator_profiles" DROP CONSTRAINT "operator_profiles_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "operator_profiles" DROP CONSTRAINT "operator_profiles_userId_fkey";

-- DropTable
DROP TABLE "operator_profiles";

-- CreateTable
CREATE TABLE "operators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "companyName" VARCHAR(150) NOT NULL,
    "contactPerson" VARCHAR(100),
    "phone" VARCHAR(20),
    "address" TEXT,
    "tradeLicenseNo" VARCHAR(100),
    "businessRegistrationNo" VARCHAR(100),
    "taxIdentificationNo" VARCHAR(50),
    "tradeLicenseDocument" TEXT,
    "tradeLicensePublicId" TEXT,
    "businessRegistrationDocument" TEXT,
    "businessRegistrationPublicId" TEXT,
    "taxCertificateDocument" TEXT,
    "taxCertificatePublicId" TEXT,
    "otherDocument" JSONB,
    "verificationStatus" "OperatorVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" UUID,
    "rejectionReason" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operators_userId_key" ON "operators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "operators_email_key" ON "operators"("email");

-- CreateIndex
CREATE UNIQUE INDEX "operators_tradeLicenseNo_key" ON "operators"("tradeLicenseNo");

-- CreateIndex
CREATE UNIQUE INDEX "operators_businessRegistrationNo_key" ON "operators"("businessRegistrationNo");

-- CreateIndex
CREATE INDEX "idx_operator_email" ON "operators"("email");

-- CreateIndex
CREATE INDEX "idx_operator_isDeleted" ON "operators"("isDeleted");

-- AddForeignKey
ALTER TABLE "buses" ADD CONSTRAINT "buses_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operators" ADD CONSTRAINT "operators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operators" ADD CONSTRAINT "operators_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
