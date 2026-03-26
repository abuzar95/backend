CREATE TYPE "EMProspectType" AS ENUM ('business', 'individual');

ALTER TABLE "User"
ADD COLUMN "em_prospect_type" "EMProspectType";

CREATE INDEX "User_em_prospect_type_idx" ON "User"("em_prospect_type");

ALTER TABLE "Prospect"
ADD COLUMN "last_contacted_at_em" TIMESTAMP(3),
ADD COLUMN "lead_score_em" INTEGER,
ADD COLUMN "pitched_description_em" TEXT,
ADD COLUMN "next_follow_up_em" TIMESTAMP(3),
ADD COLUMN "response_lh" BOOLEAN DEFAULT false,
ADD COLUMN "response_em" BOOLEAN DEFAULT false;
