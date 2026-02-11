-- Migrate existing users from old role values to new ones
UPDATE "User" SET "role" = 'Admin' WHERE "role" = 'admin';
UPDATE "User" SET "role" = 'DC_R' WHERE "role" = 'user';

-- Update the default for the column
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DC_R'::"UserRole";
