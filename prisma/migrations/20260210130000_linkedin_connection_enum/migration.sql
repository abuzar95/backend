-- CreateEnum
CREATE TYPE "LinkedInConnection" AS ENUM ('none', 'invite', 'connected');

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN "linkedin_connection" "LinkedInConnection" DEFAULT 'none';

-- Migrate existing data: connected where flag was true
UPDATE "Prospect" SET "linkedin_connection" = 'connected' WHERE "linkedin_connection_flag" = true;

-- Drop old column
ALTER TABLE "Prospect" DROP COLUMN "linkedin_connection_flag";
