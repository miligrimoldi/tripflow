-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "paidById" TEXT;

-- CreateTable
CREATE TABLE "expense_participant" (
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "expense_participant_pkey" PRIMARY KEY ("expenseId","userId")
);

-- CreateTable
CREATE TABLE "settlement" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "amountCents" BIGINT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_participant_userId_idx" ON "expense_participant"("userId");

-- CreateIndex
CREATE INDEX "settlement_tripId_createdAt_idx" ON "settlement"("tripId", "createdAt");

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participant" ADD CONSTRAINT "expense_participant_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participant" ADD CONSTRAINT "expense_participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_toId_fkey" FOREIGN KEY ("toId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing expenses were split among the whole group: keep it that way by
-- including every current member of their trip.
INSERT INTO "expense_participant" ("expenseId", "userId")
SELECT "expense"."id", "trip_member"."userId"
FROM "expense"
JOIN "trip_member" ON "trip_member"."tripId" = "expense"."tripId";
