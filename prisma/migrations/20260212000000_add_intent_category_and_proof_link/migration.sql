-- CreateEnum
CREATE TYPE "IntentCategory" AS ENUM ('Individual', 'Business', 'Both');

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN "intent_category" "IntentCategory",
ADD COLUMN "intent_proof_link" TEXT;
