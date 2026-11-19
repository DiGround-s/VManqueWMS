-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'ERROR');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "MarketplaceAccount" (
    "id" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "sellerId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceNotification" (
    "id" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "externalId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "status" "NotificationStatus" NOT NULL DEFAULT 'RECEIVED',
    "result" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "MarketplaceNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceAccount_channel_key" ON "MarketplaceAccount"("channel");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceNotification_externalId_key" ON "MarketplaceNotification"("externalId");

-- CreateIndex
CREATE INDEX "MarketplaceNotification_channel_receivedAt_idx" ON "MarketplaceNotification"("channel", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_externalId_key" ON "Message"("externalId");
