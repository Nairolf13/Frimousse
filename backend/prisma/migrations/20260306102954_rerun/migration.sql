/*
  Warnings:

  - You are about to drop the `ParentReduction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ParentReduction" DROP CONSTRAINT "ParentReduction_parentId_fkey";

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "emailVerified" DROP NOT NULL,
ALTER COLUMN "verificationCodeExpires" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "profileCompleted" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."ParentReduction";

-- CreateTable
CREATE TABLE "public"."InvoiceAdjustment" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceAdjustment_parentId_month_idx" ON "public"."InvoiceAdjustment"("parentId", "month");

-- AddForeignKey
ALTER TABLE "public"."InvoiceAdjustment" ADD CONSTRAINT "InvoiceAdjustment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
