-- Split single capacity into Premium + Basic seat tiers
-- capacity_premium: seats reserved for Premium members (null = unlimited)
-- capacity_basic: seats for Basic members (null = unlimited, 0 = Premium exclusive)

ALTER TABLE community_events ADD COLUMN IF NOT EXISTS capacity_premium INTEGER;
ALTER TABLE community_events ADD COLUMN IF NOT EXISTS capacity_basic INTEGER;

-- Migrate existing capacity data: treat old capacity as premium seats
UPDATE community_events SET capacity_premium = capacity WHERE capacity IS NOT NULL;
