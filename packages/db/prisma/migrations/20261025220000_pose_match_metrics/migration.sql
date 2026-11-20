-- Competitive fitness pivot: camera-counted exercises beyond push-ups.
-- ALTER TYPE ... ADD VALUE must be its own transaction (Postgres).
ALTER TYPE "MatchMetric" ADD VALUE IF NOT EXISTS 'squats';
ALTER TYPE "MatchMetric" ADD VALUE IF NOT EXISTS 'plank';
ALTER TYPE "MatchMetric" ADD VALUE IF NOT EXISTS 'jumping_jacks';
ALTER TYPE "MatchMetric" ADD VALUE IF NOT EXISTS 'burpees';
ALTER TYPE "MatchMetric" ADD VALUE IF NOT EXISTS 'sit_ups';
ALTER TYPE "MatchMetric" ADD VALUE IF NOT EXISTS 'mountain_climbers';
ALTER TYPE "MatchMetric" ADD VALUE IF NOT EXISTS 'lunges';

ALTER TYPE "DeviceMetric" ADD VALUE IF NOT EXISTS 'squats';
ALTER TYPE "DeviceMetric" ADD VALUE IF NOT EXISTS 'plank';
ALTER TYPE "DeviceMetric" ADD VALUE IF NOT EXISTS 'jumping_jacks';
ALTER TYPE "DeviceMetric" ADD VALUE IF NOT EXISTS 'burpees';
ALTER TYPE "DeviceMetric" ADD VALUE IF NOT EXISTS 'sit_ups';
ALTER TYPE "DeviceMetric" ADD VALUE IF NOT EXISTS 'mountain_climbers';
ALTER TYPE "DeviceMetric" ADD VALUE IF NOT EXISTS 'lunges';
