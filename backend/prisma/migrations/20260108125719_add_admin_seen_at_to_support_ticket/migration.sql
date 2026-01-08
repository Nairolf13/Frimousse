/*
  Warnings:

  - You are about to drop the `SupportReply` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportTicket` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."SupportReply" DROP CONSTRAINT "SupportReply_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SupportTicket" DROP CONSTRAINT "SupportTicket_userId_fkey";

-- DropTable
DROP TABLE "public"."SupportReply";

-- DropTable
DROP TABLE "public"."SupportTicket";
