-- Optional host-authored contest label. Null keeps derived titles.
ALTER TABLE "matches" ADD COLUMN "title" TEXT;
