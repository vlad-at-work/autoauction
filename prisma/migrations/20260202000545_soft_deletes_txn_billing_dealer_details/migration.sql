-- AlterTable
ALTER TABLE "Buyer" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Dealer" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "subName" TEXT;

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "billedAt" TIMESTAMP(3),
ADD COLUMN     "dealerDescription" TEXT,
ADD COLUMN     "dealerEmail" TEXT,
ADD COLUMN     "dealerName" TEXT,
ADD COLUMN     "dealerPhone" TEXT,
ADD COLUMN     "dealerSubName" TEXT,
ADD COLUMN     "dealerUsername" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "inquiryColor" TEXT,
ADD COLUMN     "inquiryModel" TEXT,
ADD COLUMN     "inquirySubmodel" TEXT,
ADD COLUMN     "inquiryTransmission" TEXT,
ADD COLUMN     "invoicedAt" TIMESTAMP(3),
ADD COLUMN     "offerPrice" INTEGER,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Buyer_deletedAt_idx" ON "Buyer"("deletedAt");

-- CreateIndex
CREATE INDEX "Dealer_deletedAt_idx" ON "Dealer"("deletedAt");

-- CreateIndex
CREATE INDEX "Dealer_active_idx" ON "Dealer"("active");

-- CreateIndex
CREATE INDEX "Inquiry_deletedAt_idx" ON "Inquiry"("deletedAt");

-- CreateIndex
CREATE INDEX "Offer_deletedAt_idx" ON "Offer"("deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_deletedAt_idx" ON "Transaction"("deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_voidedAt_idx" ON "Transaction"("voidedAt");

-- CreateIndex
CREATE INDEX "Transaction_billedAt_idx" ON "Transaction"("billedAt");

-- CreateIndex
CREATE INDEX "Transaction_paidAt_idx" ON "Transaction"("paidAt");
