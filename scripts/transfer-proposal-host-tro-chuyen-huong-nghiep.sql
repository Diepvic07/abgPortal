-- Transfer host (created_by_member_id) of the proposal
--   "Hướng nghiệp cho con: Chọn đúng ngành hay giúp con tìm đúng đường?"
--   slug: tro-chuyen-ve-huong-nghiep-tu-goc-do-cua-nha-truong-gia-dinh-va-tu-van-huong-nghiep
--
-- FROM: Vũ Thị Thu Uyên   <thuuyenvu1310@gmail.com>   (Future Leaders 1)
-- TO:   Mẫn Thị Thu Hường <me@huongman.com>           (Edu 2)
--
-- Both members already have a will_participate commitment row, and the
-- current host's commitment_level is also will_participate (not will_lead),
-- so we only need to flip created_by_member_id. The "Trưởng nhóm" badge in
-- the proposal-detail UI is driven solely by created_by_member_id.
--
-- Run in Supabase Studio → SQL Editor.

DO $$
DECLARE
  v_proposal_id   TEXT;
  v_old_member_id TEXT;
  v_new_member_id TEXT;
BEGIN
  SELECT id INTO v_proposal_id
  FROM community_proposals
  WHERE slug = 'tro-chuyen-ve-huong-nghiep-tu-goc-do-cua-nha-truong-gia-dinh-va-tu-van-huong-nghiep';

  IF v_proposal_id IS NULL THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  SELECT id INTO v_old_member_id FROM members WHERE email = 'thuuyenvu1310@gmail.com';
  IF v_old_member_id IS NULL THEN
    RAISE EXCEPTION 'Old host (thuuyenvu1310@gmail.com) not found';
  END IF;

  SELECT id INTO v_new_member_id FROM members WHERE email = 'me@huongman.com';
  IF v_new_member_id IS NULL THEN
    RAISE EXCEPTION 'New host (me@huongman.com) not found';
  END IF;

  RAISE NOTICE 'Proposal: %', v_proposal_id;
  RAISE NOTICE 'Old host: % (Vũ Thị Thu Uyên)', v_old_member_id;
  RAISE NOTICE 'New host: % (Mẫn Thị Thu Hường)', v_new_member_id;

  UPDATE community_proposals
  SET created_by_member_id = v_new_member_id,
      updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  WHERE id = v_proposal_id;
END$$;

-- Verification: should show Mẫn Thị Thu Hường as the host.
SELECT p.slug, p.title, m.email AS host_email, m.name AS host_name
FROM community_proposals p
JOIN members m ON m.id = p.created_by_member_id
WHERE p.slug = 'tro-chuyen-ve-huong-nghiep-tu-goc-do-cua-nha-truong-gia-dinh-va-tu-van-huong-nghiep';
