-- Drop status fields from Inquiry table
ALTER TABLE "Inquiry" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Inquiry" DROP COLUMN IF EXISTS "statusDescription";
