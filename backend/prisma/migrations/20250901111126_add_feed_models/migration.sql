-- CreateEnum
CREATE TYPE "public"."FeedVisibility" AS ENUM ('CENTER', 'PARENTS', 'PUBLIC');

-- CreateTable
CREATE TABLE "public"."FeedPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "centerId" TEXT,
    "childId" TEXT,
    "text" TEXT,
    "visibility" "public"."FeedVisibility" NOT NULL DEFAULT 'CENTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedMedia" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PhotoConsent" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoConsent_childId_parentId_key" ON "public"."PhotoConsent"("childId", "parentId");

-- AddForeignKey
ALTER TABLE "public"."FeedPost" ADD CONSTRAINT "FeedPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedPost" ADD CONSTRAINT "FeedPost_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "public"."Center"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedPost" ADD CONSTRAINT "FeedPost_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedMedia" ADD CONSTRAINT "FeedMedia_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."FeedPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoConsent" ADD CONSTRAINT "PhotoConsent_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoConsent" ADD CONSTRAINT "PhotoConsent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
