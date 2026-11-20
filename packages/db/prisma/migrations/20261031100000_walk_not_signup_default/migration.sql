-- Competitive fitness: walk is opt-in. A stale isDefault on ten-minute-walk
-- must not put the walk on new accounts after signup enrollment.
UPDATE "challenges"
SET "isDefault" = false
WHERE "slug" = 'ten-minute-walk';
