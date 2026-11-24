-- CreateTable
CREATE TABLE "activity_vote" (
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_vote_pkey" PRIMARY KEY ("activityId","userId")
);

-- CreateTable
CREATE TABLE "activity_comment" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_comment_activityId_createdAt_idx" ON "activity_comment"("activityId", "createdAt");

-- AddForeignKey
ALTER TABLE "activity_vote" ADD CONSTRAINT "activity_vote_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_vote" ADD CONSTRAINT "activity_vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_comment" ADD CONSTRAINT "activity_comment_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_comment" ADD CONSTRAINT "activity_comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
