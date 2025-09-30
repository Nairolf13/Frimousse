-- CreateTable
CREATE TABLE "public"."EmailLog" (
    "id" TEXT NOT NULL,
    "paymentHistoryId" TEXT,
    "recipients" JSONB NOT NULL,
    "subject" TEXT,
    "messageId" TEXT,
    "status" TEXT NOT NULL,
    "errorText" TEXT,
    "bypassOptOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_paymentHistoryId_idx" ON "public"."EmailLog"("paymentHistoryId");

-- AddForeignKey
ALTER TABLE "public"."EmailLog" ADD CONSTRAINT "EmailLog_paymentHistoryId_fkey" FOREIGN KEY ("paymentHistoryId") REFERENCES "public"."PaymentHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
