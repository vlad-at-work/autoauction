-- AlterTable
ALTER TABLE "Buyer" ADD COLUMN "platformHandle" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "buyerPlatformHandle" TEXT;
