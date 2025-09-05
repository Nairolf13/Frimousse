-- CreateTable
CREATE TABLE "public"."ChildNanny" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "nannyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildNanny_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChildNanny_nannyId_idx" ON "public"."ChildNanny"("nannyId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildNanny_childId_nannyId_key" ON "public"."ChildNanny"("childId", "nannyId");

-- AddForeignKey
ALTER TABLE "public"."ChildNanny" ADD CONSTRAINT "ChildNanny_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChildNanny" ADD CONSTRAINT "ChildNanny_nannyId_fkey" FOREIGN KEY ("nannyId") REFERENCES "public"."Nanny"("id") ON DELETE CASCADE ON UPDATE CASCADE;
