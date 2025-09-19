-- Migration: add_notifyByEmail
-- Idempotent: uses IF NOT EXISTS so applying on DBs that already have the column is safe

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notifyByEmail" boolean DEFAULT true;
ALTER TABLE "Center" ADD COLUMN IF NOT EXISTS "notifyByEmail" boolean DEFAULT true;

-- You can apply this migration with `prisma migrate deploy` (recommended in CI) or
-- execute the SQL directly against the database.
