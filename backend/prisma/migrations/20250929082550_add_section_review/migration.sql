-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "authorName" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "centerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Review" ADD CONSTRAINT "Review_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;
