/*
  Warnings:

  - A unique constraint covering the columns `[nannyId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "nannyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_nannyId_key" ON "User"("nannyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_nannyId_fkey" FOREIGN KEY ("nannyId") REFERENCES "Nanny"("id") ON DELETE SET NULL ON UPDATE CASCADE;
