-- Add optional address fields to User
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
