-- DropForeignKey
ALTER TABLE "PasswordResetCode" DROP CONSTRAINT "PasswordResetCode_dealerId_fkey";

-- AlterTable
ALTER TABLE "Dealer" DROP COLUMN "passwordHash";

-- DropTable
DROP TABLE "PasswordResetCode";
