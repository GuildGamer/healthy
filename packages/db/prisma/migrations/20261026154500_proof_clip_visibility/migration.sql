-- CreateEnum
CREATE TYPE "ProofClipVisibility" AS ENUM ('group', 'shared');

-- AlterTable
ALTER TABLE "proof_clips" ADD COLUMN "visibility" "ProofClipVisibility";
