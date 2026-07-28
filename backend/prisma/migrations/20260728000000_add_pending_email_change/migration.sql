-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "pendingEmailCode" TEXT,
ADD COLUMN     "pendingEmailCodeExpires" TIMESTAMP(3);
