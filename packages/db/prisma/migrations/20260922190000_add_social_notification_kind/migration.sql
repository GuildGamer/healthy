-- Being seated in a group challenge from a crew is the first notification that
-- comes from another person rather than from a clock. Adding a value is
-- forward-only; every existing row keeps its kind.
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'social';
