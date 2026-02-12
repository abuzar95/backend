-- AlterTable
ALTER TABLE "User" ADD COLUMN "linkedin_profile_id" TEXT;

-- CreateIndex
CREATE INDEX "User_linkedin_profile_id_idx" ON "User"("linkedin_profile_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_linkedin_profile_id_fkey" FOREIGN KEY ("linkedin_profile_id") REFERENCES "LinkedInProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
