-- Drop the default FIRST so the type cast works
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- Rename old enum
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

-- Create new enum with updated values
CREATE TYPE "UserRole" AS ENUM ('admin', 'DC_R', 'LH', 'EM');

-- Migrate existing data: map removed roles
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING (
  CASE
    WHEN "role"::text = 'DC_R' THEN 'DC_R'::"UserRole"
    WHEN "role"::text = 'Admin' THEN 'admin'::"UserRole"
    WHEN "role"::text = 'LNCtoLC' THEN 'LH'::"UserRole"
    WHEN "role"::text = 'Pitcher' THEN 'EM'::"UserRole"
    ELSE 'DC_R'::"UserRole"
  END
);

-- Re-set the default
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DC_R'::"UserRole";

-- Drop old enum
DROP TYPE "UserRole_old";
