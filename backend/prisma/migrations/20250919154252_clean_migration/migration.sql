/*
  Warnings:

  - Made the column `notifyByEmail` on table `Center` required. This step will fail if there are existing NULL values in that column.
  - Made the column `notifyByEmail` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."Center" ALTER COLUMN "notifyByEmail" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "notifyByEmail" SET NOT NULL;
