-- Add PGS. TS. Nguyễn Hoàng Ánh as Premium member
-- She is a teacher of ABG institute
-- Facebook: https://www.facebook.com/nguyen.h.anh.92560
-- Reference: Former Vice Dean of FTU, Director of Asia Research Center

DO $$
DECLARE
  v_member_id TEXT;
  v_exists BOOLEAN;
  v_proposal_id TEXT;
BEGIN
  -- Check if member already exists
  SELECT id, TRUE INTO v_member_id, v_exists
  FROM members
  WHERE LOWER(email) = 'nguyenhoanganh.pgs@gmail.com'
  LIMIT 1;

  IF v_exists THEN
    -- Member exists: upgrade to Premium
    RAISE NOTICE 'Member already exists (id=%). Upgrading to Premium...', v_member_id;

    UPDATE members SET
      paid = TRUE,
      payment_status = 'paid',
      membership_expiry = '2026-12-31T23:59:59.000Z',
      status = 'active',
      approval_status = 'approved',
      facebook_url = COALESCE(facebook_url, 'https://www.facebook.com/nguyen.h.anh.92560'),
      updated_at = NOW()
    WHERE id = v_member_id;

  ELSE
    -- Member does not exist: insert new Premium member
    v_member_id := gen_random_uuid()::TEXT;
    RAISE NOTICE 'Creating new Premium member (id=%)...', v_member_id;

    INSERT INTO members (
      id, name, email, role, company, expertise,
      bio, status, paid, payment_status, membership_expiry,
      approval_status, account_status, gender,
      facebook_url, country, locale,
      public_profile_slug, public_profile_enabled,
      is_csv_imported, created_at
    ) VALUES (
      v_member_id,
      'Nguyễn Hoàng Ánh',
      'nguyenhoanganh.pgs@gmail.com',
      'PGS. TS. / Giảng viên',
      'Đại học Ngoại thương (FTU)',
      'Nghiên cứu Châu Á, Kinh tế quốc tế, Thương mại quốc tế',
      'PGS. TS. Nguyễn Hoàng Ánh - Nguyên Phó Trưởng Khoa SĐHH, Nguyên Giám đốc Trung tâm Nghiên cứu Châu Á, Nguyên Phó Viện trưởng Viện KTQT, Đại học Ngoại thương. Giảng viên ABG.',
      'active',
      TRUE,
      'paid',
      '2026-12-31T23:59:59.000Z',
      'approved',
      'active',
      'Female',
      'https://www.facebook.com/nguyen.h.anh.92560',
      'Vietnam',
      'vi',
      'nguyen-hoang-anh-' || LEFT(v_member_id, 6),
      TRUE,
      FALSE,
      NOW()
    );
  END IF;

  -- Create payment record
  INSERT INTO payment_records (id, member_id, amount_vnd, admin_id, notes, created_at)
  VALUES (
    gen_random_uuid()::TEXT,
    v_member_id,
    0,
    'toan@ejoylearning.com',
    'ABG Teacher - Premium membership granted (PGS. TS. Nguyễn Hoàng Ánh)',
    NOW()
  );

  -- Add as participant of proposal "ABG Alumni Hà Nội Connect #1"
  SELECT id INTO v_proposal_id
  FROM community_proposals
  WHERE slug = 'abg-alumni-ha-noi-connect-1-hanh-trinh-rieng-gia-tri-chung'
  LIMIT 1;

  IF v_proposal_id IS NOT NULL THEN
    INSERT INTO community_commitments (id, proposal_id, member_id, commitment_level, created_at, updated_at)
    VALUES (
      gen_random_uuid()::TEXT,
      v_proposal_id,
      v_member_id,
      'will_participate',
      NOW()::TEXT,
      NOW()::TEXT
    )
    ON CONFLICT (proposal_id, member_id) DO UPDATE
      SET commitment_level = 'will_participate', updated_at = NOW()::TEXT;

    RAISE NOTICE 'Added to proposal % as participant.', v_proposal_id;
  ELSE
    RAISE WARNING 'Proposal with slug abg-alumni-ha-noi-connect-1-hanh-trinh-rieng-gia-tri-chung not found!';
  END IF;

  RAISE NOTICE 'Done! Member id=% is now Premium and joined the proposal.', v_member_id;
END $$;
