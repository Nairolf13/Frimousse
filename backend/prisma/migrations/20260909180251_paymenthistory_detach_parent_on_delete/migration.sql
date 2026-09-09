-- Allow PaymentHistory to survive Parent deletion: parentId becomes optional
-- and the FK switches from RESTRICT to SET NULL. A parentSnapshot column
-- stores the parent's identity (name, email, centerId) so detached invoices
-- remain legible and tenant-scoped after the Parent record is gone.

-- DropForeignKey
ALTER TABLE "PaymentHistory" DROP CONSTRAINT "PaymentHistory_parentId_fkey";

-- AlterTable
ALTER TABLE "PaymentHistory" ALTER COLUMN "parentId" DROP NOT NULL,
  ADD COLUMN "parentSnapshot" JSONB;

-- AddForeignKey
ALTER TABLE "PaymentHistory" ADD CONSTRAINT "PaymentHistory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"(id) ON DELETE SET NULL ON UPDATE CASCADE;
