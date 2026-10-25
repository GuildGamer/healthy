-- Competitive fitness pivot: hide chronic-condition and non-fitness catalog
-- items. Code paths stay; isActive gates Today, catalog, and tips.
UPDATE "Challenge"
SET "isActive" = false
WHERE "category" IN ('hypertension', 'diabetes', 'asthma')
   OR "slug" IN (
     'log-water-intake',
     'sleep-log',
     'weekly-weigh-in',
     'medication-refill'
   );

UPDATE "Tip"
SET "isActive" = false
WHERE "category" IN ('hypertension', 'diabetes', 'asthma');
