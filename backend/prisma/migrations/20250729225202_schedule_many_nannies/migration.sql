/*
  Warnings:

  - You are about to drop the column `nannyId` on the `Schedule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Schedule" DROP CONSTRAINT "Schedule_nannyId_fkey";

-- AlterTable
ALTER TABLE "public"."Schedule" DROP COLUMN "nannyId";

-- CreateTable
CREATE TABLE "public"."_NannySchedules" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NannySchedules_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_NannySchedules_B_index" ON "public"."_NannySchedules"("B");

-- AddForeignKey
ALTER TABLE "public"."_NannySchedules" ADD CONSTRAINT "_NannySchedules_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Nanny"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_NannySchedules" ADD CONSTRAINT "_NannySchedules_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
