-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "exchangeRate" DECIMAL(20,8),
ADD COLUMN     "originalAmountCents" BIGINT,
ADD COLUMN     "originalCurrency" TEXT;
