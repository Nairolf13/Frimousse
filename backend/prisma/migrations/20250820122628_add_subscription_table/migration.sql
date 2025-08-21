-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AbandonedSignupReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbandonedSignupReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "public"."Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "public"."Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AbandonedSignupReminder_userId_key" ON "public"."AbandonedSignupReminder"("userId");

-- CreateIndex
CREATE INDEX "AbandonedSignupReminder_userId_idx" ON "public"."AbandonedSignupReminder"("userId");
