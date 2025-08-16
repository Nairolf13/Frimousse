/*
  Warnings:

  - You are about to drop the column `parentId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Parent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ParentChild` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ParentChild" DROP CONSTRAINT "ParentChild_childId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ParentChild" DROP CONSTRAINT "ParentChild_parentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_parentId_fkey";

-- DropIndex
DROP INDEX "public"."User_parentId_key";

-- AlterTable
ALTER TABLE "public"."Child" ADD COLUMN     "parentContact" TEXT,
ADD COLUMN     "parentMail" TEXT,
ADD COLUMN     "parentName" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "parentId";

-- DropTable
DROP TABLE "public"."Parent";

-- DropTable
DROP TABLE "public"."ParentChild";
