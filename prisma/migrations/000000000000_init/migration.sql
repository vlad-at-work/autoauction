-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('MAX', 'TELEGRAM');

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformUserId" TEXT NOT NULL,
    "platformChatId" TEXT,
    "platformUserName" TEXT,
    "inquiriesUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
    "inquiryLimitResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "submodel" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "comment" TEXT,
    "consentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "subName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "platform" "Platform",
    "platformUserId" TEXT,
    "platformChatId" TEXT,
    "passwordHash" TEXT,
    "inviteToken" TEXT,
    "inviteTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetCode" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "configuration" TEXT,
    "deliveryTime" TEXT,
    "additionalComments" TEXT,
    "confirmedMatch" BOOLEAN NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "buyerPhone" TEXT NOT NULL,
    "offerPrice" INTEGER,
    "inquiryModel" TEXT,
    "inquirySubmodel" TEXT,
    "inquiryTransmission" TEXT,
    "inquiryColor" TEXT,
    "dealerUsername" TEXT,
    "dealerName" TEXT,
    "dealerSubName" TEXT,
    "dealerPhone" TEXT,
    "dealerEmail" TEXT,
    "dealerDescription" TEXT,
    "amount" INTEGER,
    "invoicedAt" TIMESTAMP(3),
    "billedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Buyer_deletedAt_idx" ON "Buyer"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_platform_platformUserId_key" ON "Buyer"("platform", "platformUserId");

-- CreateIndex
CREATE INDEX "Inquiry_expiresAt_idx" ON "Inquiry"("expiresAt");

-- CreateIndex
CREATE INDEX "Inquiry_buyerId_idx" ON "Inquiry"("buyerId");

-- CreateIndex
CREATE INDEX "Inquiry_deletedAt_idx" ON "Inquiry"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_username_key" ON "Dealer"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_inviteToken_key" ON "Dealer"("inviteToken");

-- CreateIndex
CREATE INDEX "Dealer_deletedAt_idx" ON "Dealer"("deletedAt");

-- CreateIndex
CREATE INDEX "Dealer_active_idx" ON "Dealer"("active");

-- CreateIndex
CREATE INDEX "Dealer_inviteToken_idx" ON "Dealer"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_platform_platformUserId_key" ON "Dealer"("platform", "platformUserId");

-- CreateIndex
CREATE INDEX "PasswordResetCode_dealerId_idx" ON "PasswordResetCode"("dealerId");

-- CreateIndex
CREATE INDEX "PasswordResetCode_expiresAt_idx" ON "PasswordResetCode"("expiresAt");

-- CreateIndex
CREATE INDEX "Offer_inquiryId_idx" ON "Offer"("inquiryId");

-- CreateIndex
CREATE INDEX "Offer_dealerId_idx" ON "Offer"("dealerId");

-- CreateIndex
CREATE INDEX "Offer_inquiryId_dealerId_idx" ON "Offer"("inquiryId", "dealerId");

-- CreateIndex
CREATE INDEX "Offer_deletedAt_idx" ON "Offer"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_offerId_key" ON "Transaction"("offerId");

-- CreateIndex
CREATE INDEX "Transaction_inquiryId_idx" ON "Transaction"("inquiryId");

-- CreateIndex
CREATE INDEX "Transaction_dealerId_idx" ON "Transaction"("dealerId");

-- CreateIndex
CREATE INDEX "Transaction_deletedAt_idx" ON "Transaction"("deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_voidedAt_idx" ON "Transaction"("voidedAt");

-- CreateIndex
CREATE INDEX "Transaction_billedAt_idx" ON "Transaction"("billedAt");

-- CreateIndex
CREATE INDEX "Transaction_paidAt_idx" ON "Transaction"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_inquiryId_dealerId_key" ON "Transaction"("inquiryId", "dealerId");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetCode" ADD CONSTRAINT "PasswordResetCode_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

