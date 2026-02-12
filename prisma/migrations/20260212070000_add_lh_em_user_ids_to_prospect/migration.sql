-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN "lh_user_id" TEXT,
ADD COLUMN "em_user_id" TEXT;

-- CreateIndex
CREATE INDEX "Prospect_lh_user_id_idx" ON "Prospect"("lh_user_id");
CREATE INDEX "Prospect_em_user_id_idx" ON "Prospect"("em_user_id");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_lh_user_id_fkey" FOREIGN KEY ("lh_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_em_user_id_fkey" FOREIGN KEY ("em_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
