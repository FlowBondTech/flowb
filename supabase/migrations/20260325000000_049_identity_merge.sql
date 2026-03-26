-- 049: Cross-platform identity merge function
-- Merges all data from merge_id into keep_id when linking accounts
-- (e.g., telegram_123 + web_abc -> single canonical identity)

CREATE OR REPLACE FUNCTION flowb_merge_identities(
  p_keep_id TEXT,
  p_merge_id TEXT
) RETURNS INT AS $$
DECLARE
  v_rows INT := 0;
  v_tmp INT;
BEGIN
  -- Safety: don't merge into self
  IF p_keep_id = p_merge_id THEN
    RETURN 0;
  END IF;

  -- ====================================================================
  -- 1. IDENTITY TABLES — point merge_id's identities to keep_id
  -- ====================================================================

  UPDATE flowb_identities
  SET canonical_id = p_keep_id
  WHERE canonical_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- Update passport canonical_id if it exists
  UPDATE flowb_passport
  SET canonical_id = p_keep_id
  WHERE canonical_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ====================================================================
  -- 2. PK TABLES — user_id is primary key, merge carefully
  -- ====================================================================

  -- flowb_sessions: copy missing fields from merge into keep, then delete merge
  UPDATE flowb_sessions k
  SET
    display_name = COALESCE(k.display_name, m.display_name),
    bio = COALESCE(k.bio, m.bio),
    email = COALESCE(k.email, m.email),
    tg_username = COALESCE(k.tg_username, m.tg_username),
    locale = COALESCE(k.locale, m.locale),
    current_city = COALESCE(k.current_city, m.current_city),
    destination_city = COALESCE(k.destination_city, m.destination_city),
    flow_purpose = COALESCE(k.flow_purpose, m.flow_purpose),
    onboarding_complete = k.onboarding_complete OR m.onboarding_complete
  FROM flowb_sessions m
  WHERE k.user_id = p_keep_id AND m.user_id = p_merge_id;
  -- If keep_id had no session row but merge_id did, re-key it
  UPDATE flowb_sessions SET user_id = p_keep_id
  WHERE user_id = p_merge_id
    AND NOT EXISTS (SELECT 1 FROM flowb_sessions WHERE user_id = p_keep_id);
  -- Delete leftover merge row
  DELETE FROM flowb_sessions WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_kanban_user_prefs: keep the one with data
  DELETE FROM flowb_kanban_user_prefs
  WHERE user_id = p_merge_id
    AND EXISTS (SELECT 1 FROM flowb_kanban_user_prefs WHERE user_id = p_keep_id);
  UPDATE flowb_kanban_user_prefs SET user_id = p_keep_id
  WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_admins: skip if already admin
  DELETE FROM flowb_admins
  WHERE user_id = p_merge_id
    AND EXISTS (SELECT 1 FROM flowb_admins WHERE user_id = p_keep_id);
  UPDATE flowb_admins SET user_id = p_keep_id
  WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ====================================================================
  -- 3. UNIQUE CONSTRAINT TABLES — delete merge row if keep row exists
  -- ====================================================================

  -- flowb_group_members: (user_id, group_id) unique
  DELETE FROM flowb_group_members gm
  WHERE gm.user_id = p_merge_id
    AND EXISTS (
      SELECT 1 FROM flowb_group_members
      WHERE user_id = p_keep_id AND group_id = gm.group_id
    );
  UPDATE flowb_group_members SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_user_points: (user_id, platform) — SUM total_points
  UPDATE flowb_user_points k
  SET total_points = k.total_points + m.total_points
  FROM flowb_user_points m
  WHERE k.user_id = p_keep_id
    AND m.user_id = p_merge_id
    AND k.platform = m.platform;
  DELETE FROM flowb_user_points
  WHERE user_id = p_merge_id
    AND EXISTS (
      SELECT 1 FROM flowb_user_points
      WHERE user_id = p_keep_id AND platform = flowb_user_points.platform
    );
  UPDATE flowb_user_points SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_connections: (user_id, friend_id) unique — skip duplicates
  -- Also handle the reverse direction (friend_id = merge_id)
  DELETE FROM flowb_connections c
  WHERE c.user_id = p_merge_id
    AND EXISTS (
      SELECT 1 FROM flowb_connections
      WHERE user_id = p_keep_id AND friend_id = c.friend_id
    );
  UPDATE flowb_connections SET user_id = p_keep_id WHERE user_id = p_merge_id;
  -- Don't create self-connections
  DELETE FROM flowb_connections WHERE user_id = p_keep_id AND friend_id = p_keep_id;
  -- Also update friend_id references
  DELETE FROM flowb_connections c
  WHERE c.friend_id = p_merge_id
    AND EXISTS (
      SELECT 1 FROM flowb_connections
      WHERE user_id = c.user_id AND friend_id = p_keep_id
    );
  UPDATE flowb_connections SET friend_id = p_keep_id WHERE friend_id = p_merge_id;
  DELETE FROM flowb_connections WHERE user_id = p_keep_id AND friend_id = p_keep_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_event_attendance: (user_id, event_id) unique
  DELETE FROM flowb_event_attendance ea
  WHERE ea.user_id = p_merge_id
    AND EXISTS (
      SELECT 1 FROM flowb_event_attendance
      WHERE user_id = p_keep_id AND event_id = ea.event_id
    );
  UPDATE flowb_event_attendance SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_event_bookmarks: skip duplicates
  DELETE FROM flowb_event_bookmarks eb
  WHERE eb.user_id = p_merge_id
    AND EXISTS (
      SELECT 1 FROM flowb_event_bookmarks
      WHERE user_id = p_keep_id AND event_id = eb.event_id
    );
  UPDATE flowb_event_bookmarks SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_event_reminders: skip duplicates
  DELETE FROM flowb_event_reminders er
  WHERE er.user_id = p_merge_id
    AND EXISTS (
      SELECT 1 FROM flowb_event_reminders
      WHERE user_id = p_keep_id AND event_id = er.event_id
    );
  UPDATE flowb_event_reminders SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_meeting_attendees: (meeting_id, user_id) unique
  DELETE FROM flowb_meeting_attendees ma
  WHERE ma.user_id = p_merge_id
    AND EXISTS (
      SELECT 1 FROM flowb_meeting_attendees
      WHERE user_id = p_keep_id AND meeting_id = ma.meeting_id
    );
  UPDATE flowb_meeting_attendees SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_keyword_alerts: skip duplicates
  DELETE FROM flowb_keyword_alerts ka
  WHERE ka.user_id = p_merge_id
    AND EXISTS (
      SELECT 1 FROM flowb_keyword_alerts
      WHERE user_id = p_keep_id AND keyword = ka.keyword
    );
  UPDATE flowb_keyword_alerts SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_push_tokens: per-device, just update user_id
  UPDATE flowb_push_tokens SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- flowb_notification_tokens: same as push_tokens
  UPDATE flowb_notification_tokens SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT;
  v_rows := v_rows + v_tmp;

  -- ====================================================================
  -- 4. SIMPLE UPDATE TABLES — no conflict risk, just re-key
  -- ====================================================================

  UPDATE flowb_checkins SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_schedules SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_points_ledger SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_crew_messages SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_feedback SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_notification_log SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_notifications_sent SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_crew_join_requests SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_crew_invites SET invited_by = p_keep_id WHERE invited_by = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_crew_activities SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_crew_member_settings SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_meeting_messages SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_meeting_notes SET created_by = p_keep_id WHERE created_by = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_orders SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_subscriptions SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_user_products SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_connected_wallets SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_user_locations SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_leads SET created_by = p_keep_id WHERE created_by = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_lead_activities SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_meetings SET created_by = p_keep_id WHERE created_by = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_tasklists SET created_by = p_keep_id WHERE created_by = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_groups SET created_by = p_keep_id WHERE created_by = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_events SET created_by = p_keep_id WHERE created_by = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_event_verifications SET verified_by = p_keep_id WHERE verified_by = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_shared_results SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_doc_access SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_doc_views SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_agent_transactions SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_pending_auth SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_socialb_activity SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_social_posts SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_referral_links SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  UPDATE flowb_cuflow_access SET user_id = p_keep_id WHERE user_id = p_merge_id;
  GET DIAGNOSTICS v_tmp = ROW_COUNT; v_rows := v_rows + v_tmp;

  RETURN v_rows;
END;
$$ LANGUAGE plpgsql;
