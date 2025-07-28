-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('masculin', 'feminin');

-- AlterTable
ALTER TABLE "Child" ADD COLUMN     "sexe" "Sexe" NOT NULL DEFAULT 'masculin';
