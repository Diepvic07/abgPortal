-- Backfill: promote existing poll/discussion voters to `will_participate`.
--
-- Rule (matches the new go-forward behavior in
--   app/api/community/proposals/[id]/discussion/respond/route.ts
--   app/api/community/proposals/[id]/poll/respond/route.ts):
--   If a member has voted on a proposal's discussion (available_dates non-empty
--   OR a question), or on its content poll (selected_options non-empty), and
--   they have no commitment (or only `interested`), upgrade them to
--   `will_participate`. Never downgrades an existing `will_lead`.
--
-- Safe to re-run: idempotent via ON CONFLICT.
-- Trigger `trg_commitment_counts` will recompute commitment_count/score on the
-- affected proposals automatically.
--
-- USAGE
--   1. Run the PREVIEW query first (section A) to see who will change.
--   2. If the list looks right, run the APPLY block (section B) inside a
--      transaction. Wrap in BEGIN/ROLLBACK first if you want to dry-run.

-- ============================================================================
-- A. PREVIEW — who gets promoted and from what
-- ============================================================================

WITH voters AS (
  SELECT DISTINCT pd.proposal_id, pdr.member_id
  FROM proposal_discussion_responses pdr
  JOIN proposal_discussions pd ON pd.id = pdr.discussion_id
  WHERE COALESCE(array_length(pdr.available_dates, 1), 0) > 0
     OR (pdr.question IS NOT NULL AND btrim(pdr.question) <> '')

  UNION

  SELECT DISTINCT pp.proposal_id, ppr.member_id
  FROM proposal_poll_responses ppr
  JOIN proposal_polls pp ON pp.id = ppr.poll_id
  WHERE COALESCE(array_length(ppr.selected_options, 1), 0) > 0
)
SELECT
  cp.slug,
  cp.title,
  m.name AS member_name,
  COALESCE(cc.commitment_level, '(none)') AS current_level,
  'will_participate' AS new_level
FROM voters v
JOIN community_proposals cp ON cp.id = v.proposal_id
JOIN members m ON m.id = v.member_id
LEFT JOIN community_commitments cc
  ON cc.proposal_id = v.proposal_id AND cc.member_id = v.member_id
WHERE cc.id IS NULL
   OR cc.commitment_level = 'interested'
ORDER BY cp.slug, m.name;

-- ============================================================================
-- B. APPLY — creates or upgrades commitments
-- ============================================================================
-- BEGIN;

INSERT INTO community_commitments (id, proposal_id, member_id, commitment_level, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  v.proposal_id,
  v.member_id,
  'will_participate',
  to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
FROM (
  SELECT DISTINCT pd.proposal_id, pdr.member_id
  FROM proposal_discussion_responses pdr
  JOIN proposal_discussions pd ON pd.id = pdr.discussion_id
  WHERE COALESCE(array_length(pdr.available_dates, 1), 0) > 0
     OR (pdr.question IS NOT NULL AND btrim(pdr.question) <> '')

  UNION

  SELECT DISTINCT pp.proposal_id, ppr.member_id
  FROM proposal_poll_responses ppr
  JOIN proposal_polls pp ON pp.id = ppr.poll_id
  WHERE COALESCE(array_length(ppr.selected_options, 1), 0) > 0
) v
ON CONFLICT (proposal_id, member_id) DO UPDATE
  SET commitment_level = 'will_participate',
      updated_at = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  WHERE community_commitments.commitment_level = 'interested';

-- COMMIT;   -- uncomment together with BEGIN above if you want a wrapped tx
