-- CreateEnum
CREATE TYPE "Category" AS ENUM ('Entrepreneur', 'Subcontractor', 'SME', 'HR', 'C_Level');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('upwork', 'linkedin', 'clutch', 'crunchbase', 'producthunt', 'glassdoor', 'indeed', 'others');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('new', 'data_refined', 'use_in_campaign', 'pitch');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "category" "Category",
    "name" TEXT,
    "email" TEXT,
    "company_name" TEXT,
    "website_link" TEXT,
    "sources" "Source",
    "intent" TEXT,
    "intent_date" TIMESTAMP(3),
    "linkedin_connection_flag" BOOLEAN DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'new',
    "pitch_description" TEXT,
    "pitched_source" TEXT,
    "user_id" TEXT NOT NULL,
    "about_prospect" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_contacted_at" TIMESTAMP(3),
    "next_follow_up_date" TIMESTAMP(3),
    "campaign_name" TEXT,
    "campaign_added_date" TIMESTAMP(3),
    "email_opened" BOOLEAN DEFAULT false,
    "email_clicked" BOOLEAN DEFAULT false,
    "email_replied" BOOLEAN DEFAULT false,
    "priority" TEXT,
    "lead_score" INTEGER,
    "linkedin_url" TEXT,
    "data_refined_date" TIMESTAMP(3),
    "pitch_date" TIMESTAMP(3),
    "pitch_response" TEXT,
    "job_title" TEXT,
    "company_size" TEXT,
    "location" TEXT,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Prospect_user_id_idx" ON "Prospect"("user_id");

-- CreateIndex
CREATE INDEX "Prospect_status_idx" ON "Prospect"("status");

-- CreateIndex
CREATE INDEX "Prospect_category_idx" ON "Prospect"("category");

-- CreateIndex
CREATE INDEX "Prospect_sources_idx" ON "Prospect"("sources");

-- CreateIndex
CREATE INDEX "Prospect_created_at_idx" ON "Prospect"("created_at");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
