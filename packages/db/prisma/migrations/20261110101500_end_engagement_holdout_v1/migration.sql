-- Cadence treatment caps (daily budget, quiet hours, fewer habit slots,
-- skip-if-active) were retired. Burst control remains on board_move only
-- (group-board-push-policy). End the experiment so new assignments stop.
UPDATE "experiments"
SET
  "status" = 'ended'::"ExperimentStatus",
  "description" = 'Ended: cadence treatment caps retired; all members keep original six-slot schedule. Group board_move burst policy is unchanged.',
  "endAt" = CURRENT_TIMESTAMP,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'engagement_holdout_v1'
  AND "status" = 'running'::"ExperimentStatus";
