-- Add parentId to FeedComment for nested replies
ALTER TABLE "FeedComment" ADD COLUMN "parentId" TEXT;
ALTER TABLE "FeedComment" ADD CONSTRAINT "FeedComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FeedComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
