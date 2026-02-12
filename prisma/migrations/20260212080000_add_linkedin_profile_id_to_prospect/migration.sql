-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN "linkedin_profile_id" TEXT;

-- CreateIndex
CREATE INDEX "Prospect_linkedin_profile_id_idx" ON "Prospect"("linkedin_profile_id");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_linkedin_profile_id_fkey" FOREIGN KEY ("linkedin_profile_id") REFERENCES "LinkedInProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
