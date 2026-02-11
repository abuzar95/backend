-- Rename old enum values and add new ones
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DC_R';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'LNCtoLC';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'Pitcher';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'Admin';
