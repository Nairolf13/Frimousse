-- CreateEnum
CREATE TYPE "public"."NannyRole" AS ENUM ('Nounou_Senior', 'Responsable', 'Stagiaire', 'Remplacante', 'Autre');

-- CreateEnum
CREATE TYPE "public"."ChildGroup" AS ENUM ('G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'Autre');

-- AlterTable
ALTER TABLE "public"."Child" ADD COLUMN     "group" "public"."ChildGroup" NOT NULL DEFAULT 'G1';

-- AlterTable
ALTER TABLE "public"."Nanny" ADD COLUMN     "role" "public"."NannyRole" NOT NULL DEFAULT 'Nounou_Senior';

-- CreateTable
CREATE TABLE "public"."Report" (
    "id" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "nannyId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "duration" TEXT,
    "childrenInvolved" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_nannyId_fkey" FOREIGN KEY ("nannyId") REFERENCES "public"."Nanny"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
