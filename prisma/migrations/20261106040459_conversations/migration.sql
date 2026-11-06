-- CreateEnum
CREATE TYPE "CaseKind" AS ENUM ('QUESTION', 'SHIPPING', 'RETURN', 'EXCHANGE', 'CLAIM', 'CANCEL');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'WAITING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REFUNDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MessageAuthor" AS ENUM ('BUYER', 'AGENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL,
    "externalRef" TEXT,
    "kind" "CaseKind" NOT NULL DEFAULT 'QUESTION',
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "returnStatus" "ReturnStatus",
    "subject" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "orderId" TEXT,
    "unread" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "author" "MessageAuthor" NOT NULL,
    "authorName" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_externalRef_key" ON "Conversation"("externalRef");

-- CreateIndex
CREATE INDEX "Conversation_status_lastMessageAt_idx" ON "Conversation"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_channel_lastMessageAt_idx" ON "Conversation"("channel", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_orderId_idx" ON "Conversation"("orderId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
