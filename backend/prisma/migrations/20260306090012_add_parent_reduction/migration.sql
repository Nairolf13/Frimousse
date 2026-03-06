-- create table for parent reductions (later renamed to InvoiceAdjustment)
CREATE TABLE "ParentReduction" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "parentId" text NOT NULL,
  "amount" double precision NOT NULL,
  "comment" text NOT NULL,
  "date" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "month" text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ParentReduction"
  ADD CONSTRAINT "ParentReduction_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE;

CREATE INDEX "ParentReduction_parentId_month_idx" ON "ParentReduction" ("parentId", "month");
