-- Competitive fitness pivot: hide chronic-condition and non-fitness catalog
-- items. Code paths stay; isActive gates Today, catalog, and tips.
UPDATE "challenges"
SET "isActive" = false
WHERE "category" IN ('hypertension', 'diabetes', 'asthma')
   OR "slug" IN (
     'log-water-intake',
     'sleep-log',
     'weekly-weigh-in',
     'medication-refill'
   );

UPDATE "tips"
SET "isActive" = false
WHERE "category" IN ('hypertension', 'diabetes', 'asthma');
