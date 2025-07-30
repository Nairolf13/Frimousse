/*
  Warnings:

  - Added the required column `name` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Schedule" ADD COLUMN     "name" TEXT NOT NULL;
