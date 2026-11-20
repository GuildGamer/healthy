-- Sleep stays a check_in for older apps. New apps open the sleep sheet when
-- captureKind is structured_log and deviceMetric is sleep.
UPDATE "challenges"
SET
  "captureKind" = 'structured_log',
  "deviceMetric" = 'sleep'
WHERE "slug" = 'sleep-log'
  AND "completionKind" = 'check_in';
