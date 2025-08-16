-- AlterTable
ALTER TABLE "public"."Assignment" ADD COLUMN     "centerId" TEXT;

-- AlterTable
ALTER TABLE "public"."Child" ADD COLUMN     "centerId" TEXT;

-- AlterTable
ALTER TABLE "public"."Nanny" ADD COLUMN     "centerId" TEXT;

-- AlterTable
ALTER TABLE "public"."Parent" ADD COLUMN     "centerId" TEXT;

-- AlterTable
ALTER TABLE "public"."Report" ADD COLUMN     "centerId" TEXT;

-- AlterTable
ALTER TABLE "public"."Schedule" ADD COLUMN     "centerId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "centerId" TEXT;

-- CreateTable
CREATE TABLE "public"."Center" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Center_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Parent" ADD CONSTRAINT "Parent_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Nanny" ADD CONSTRAINT "Nanny_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Child" ADD CONSTRAINT "Child_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Assignment" ADD CONSTRAINT "Assignment_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Schedule" ADD CONSTRAINT "Schedule_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Report" ADD CONSTRAINT "Report_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;
