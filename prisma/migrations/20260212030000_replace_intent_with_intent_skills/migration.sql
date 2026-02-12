-- AlterTable: Drop intent column and add intent_skills array column
ALTER TABLE "Prospect" DROP COLUMN IF EXISTS "intent";
ALTER TABLE "Prospect" ADD COLUMN "intent_skills" TEXT[] NOT NULL DEFAULT '{}';
