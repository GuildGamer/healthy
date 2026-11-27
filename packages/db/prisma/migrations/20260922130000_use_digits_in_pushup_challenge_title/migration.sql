-- Push-up titles are regenerated from the member's target on read, so this only
-- fixes the stored fallback that the admin catalog shows.
UPDATE "challenges"
SET "title" = 'Do 20 push-ups'
WHERE "slug" = 'twenty-push-ups'
  AND "title" = 'Do twenty push-ups';
