/*
  Warnings:

  - The `availability` column on the `Nanny` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('Disponible', 'En_congé', 'Maladie');

-- AlterTable
ALTER TABLE "Nanny" DROP COLUMN "availability",
ADD COLUMN     "availability" "Availability" NOT NULL DEFAULT 'Disponible';
