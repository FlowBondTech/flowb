-- Migration: Bond Requests System
-- Date: 2024-12-24
-- Description: Creates bond_requests table for two-way bond acceptance workflow
-- Enables users to send bond requests with similarity matching and expiration

-- ============================================================================
-- BOND REQUESTS TABLE
-- ============================================================================

-- Create enum for bond request status
DO $$ BEGIN
    CREATE TYPE bond_request_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create bond_requests table
CREATE TABLE IF NOT EXISTS public.bond_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES public.users(privy_id) ON DELETE CASCADE,
    status bond_request_status NOT NULL DEFAULT 'pending',

    -- Optional message from requester
    message TEXT,

    -- Similarity/match data stored as JSON
    match_reasons JSONB DEFAULT '{}',
    -- Example: {"mutual_bonds": 3, "same_events": 2, "music_overlap": ["house", "techno"],
    --           "dance_styles": ["freestyle"], "similarity_score": 0.75}

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

    -- Constraints
    CONSTRAINT bond_request_not_self CHECK (requester_id != recipient_id),
    CONSTRAINT bond_request_unique UNIQUE (requester_id, recipient_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_bond_requests_requester ON public.bond_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_bond_requests_recipient ON public.bond_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_bond_requests_status ON public.bond_requests(status);
CREATE INDEX IF NOT EXISTS idx_bond_requests_pending ON public.bond_requests(recipient_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bond_requests_expires ON public.bond_requests(expires_at) WHERE status = 'pending';

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_bond_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected', 'cancelled') THEN
        NEW.responded_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bond_request_updated_at ON public.bond_requests;
CREATE TRIGGER bond_request_updated_at
    BEFORE UPDATE ON public.bond_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_bond_request_updated_at();

-- ============================================================================
-- AUTO-EXPIRE PENDING REQUESTS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_old_bond_requests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.bond_requests
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.bond_requests ENABLE ROW LEVEL SECURITY;

-- Users can view bond requests they sent or received
CREATE POLICY "Users can view their bond requests"
    ON public.bond_requests
    FOR SELECT
    USING (
        auth.uid()::text = requester_id
        OR auth.uid()::text = recipient_id
    );

-- Users can create bond requests (as requester only)
CREATE POLICY "Users can send bond requests"
    ON public.bond_requests
    FOR INSERT
    WITH CHECK (
        auth.uid()::text = requester_id
    );

-- Requesters can cancel their pending requests
CREATE POLICY "Requesters can cancel their requests"
    ON public.bond_requests
    FOR UPDATE
    USING (
        auth.uid()::text = requester_id
        AND status = 'pending'
    )
    WITH CHECK (
        status = 'cancelled'
    );

-- Recipients can accept or reject pending requests
CREATE POLICY "Recipients can respond to requests"
    ON public.bond_requests
    FOR UPDATE
    USING (
        auth.uid()::text = recipient_id
        AND status = 'pending'
    )
    WITH CHECK (
        status IN ('accepted', 'rejected')
    );

-- Service role can do anything (for admin/cleanup operations)
CREATE POLICY "Service role has full access"
    ON public.bond_requests
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- NOTIFICATION TRIGGERS FOR BOND REQUESTS
-- ============================================================================

-- Trigger function for new bond request notification
CREATE OR REPLACE FUNCTION notify_bond_request_received()
RETURNS TRIGGER AS $$
DECLARE
    requester_username TEXT;
    requester_avatar TEXT;
BEGIN
    -- Get requester info
    SELECT username, avatar_url INTO requester_username, requester_avatar
    FROM public.users
    WHERE privy_id = NEW.requester_id;

    -- Create notification for recipient
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data,
        read
    ) VALUES (
        NEW.recipient_id,
        'bond_request_received',
        'New Bond Request',
        requester_username || ' wants to bond with you!',
        jsonb_build_object(
            'request_id', NEW.id,
            'requester_id', NEW.requester_id,
            'requester_username', requester_username,
            'requester_avatar', requester_avatar,
            'match_reasons', NEW.match_reasons,
            'message', NEW.message
        ),
        false
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bond_request_created ON public.bond_requests;
CREATE TRIGGER on_bond_request_created
    AFTER INSERT ON public.bond_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_bond_request_received();

-- Trigger function for bond request response notification
CREATE OR REPLACE FUNCTION notify_bond_request_response()
RETURNS TRIGGER AS $$
DECLARE
    recipient_username TEXT;
    recipient_avatar TEXT;
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    -- Only notify on status changes from pending
    IF OLD.status != 'pending' THEN
        RETURN NEW;
    END IF;

    -- Get recipient info
    SELECT username, avatar_url INTO recipient_username, recipient_avatar
    FROM public.users
    WHERE privy_id = NEW.recipient_id;

    -- Set notification content based on response
    IF NEW.status = 'accepted' THEN
        notification_title := 'Bond Request Accepted!';
        notification_message := recipient_username || ' accepted your bond request! You are now bonded.';

        -- Create the actual dance bond when request is accepted
        INSERT INTO public.dance_bonds (user1_id, user2_id, bond_strength, dance_count)
        VALUES (
            LEAST(NEW.requester_id, NEW.recipient_id),
            GREATEST(NEW.requester_id, NEW.recipient_id),
            10, -- Starting bond strength
            0
        )
        ON CONFLICT (user1_id, user2_id) DO UPDATE
        SET bond_strength = dance_bonds.bond_strength + 10,
            updated_at = NOW();

    ELSIF NEW.status = 'rejected' THEN
        notification_title := 'Bond Request Declined';
        notification_message := recipient_username || ' has declined your bond request.';
    ELSE
        -- Don't notify for cancelled or expired
        RETURN NEW;
    END IF;

    -- Create notification for requester
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data,
        read
    ) VALUES (
        NEW.requester_id,
        CASE WHEN NEW.status = 'accepted' THEN 'bond_request_accepted' ELSE 'bond_request_rejected' END,
        notification_title,
        notification_message,
        jsonb_build_object(
            'request_id', NEW.id,
            'recipient_id', NEW.recipient_id,
            'recipient_username', recipient_username,
            'recipient_avatar', recipient_avatar,
            'status', NEW.status
        ),
        false
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_bond_request_response ON public.bond_requests;
CREATE TRIGGER on_bond_request_response
    AFTER UPDATE ON public.bond_requests
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status != 'pending')
    EXECUTE FUNCTION notify_bond_request_response();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate similarity score between two users
CREATE OR REPLACE FUNCTION calculate_user_similarity(user1 TEXT, user2 TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    mutual_bonds_count INTEGER;
    same_events_count INTEGER;
    user1_music JSONB;
    user2_music JSONB;
    music_overlap TEXT[];
    user1_styles TEXT[];
    user2_styles TEXT[];
    style_overlap TEXT[];
    similarity_score NUMERIC;
BEGIN
    -- Count mutual bonds
    SELECT COUNT(*) INTO mutual_bonds_count
    FROM public.dance_bonds b1
    JOIN public.dance_bonds b2 ON (
        (b1.user1_id = b2.user1_id OR b1.user1_id = b2.user2_id OR b1.user2_id = b2.user1_id OR b1.user2_id = b2.user2_id)
        AND b1.user1_id != user2 AND b1.user2_id != user2
        AND b2.user1_id != user1 AND b2.user2_id != user1
    )
    WHERE (b1.user1_id = user1 OR b1.user2_id = user1)
    AND (b2.user1_id = user2 OR b2.user2_id = user2);

    -- Count same events attended
    SELECT COUNT(DISTINCT r1.event_id) INTO same_events_count
    FROM public.event_registrations r1
    JOIN public.event_registrations r2 ON r1.event_id = r2.event_id
    WHERE r1.user_id = user1 AND r2.user_id = user2;

    -- Get music preferences (from user interests or profile)
    SELECT COALESCE(interests->'music', '[]'::jsonb), COALESCE(dance_styles, ARRAY[]::TEXT[])
    INTO user1_music, user1_styles
    FROM public.users WHERE privy_id = user1;

    SELECT COALESCE(interests->'music', '[]'::jsonb), COALESCE(dance_styles, ARRAY[]::TEXT[])
    INTO user2_music, user2_styles
    FROM public.users WHERE privy_id = user2;

    -- Calculate overlap (simplified - actual implementation depends on data structure)
    SELECT ARRAY(
        SELECT value::text FROM jsonb_array_elements_text(user1_music)
        INTERSECT
        SELECT value::text FROM jsonb_array_elements_text(user2_music)
    ) INTO music_overlap;

    style_overlap := user1_styles & user2_styles;

    -- Calculate weighted similarity score (0-1)
    similarity_score := (
        (LEAST(mutual_bonds_count, 10) * 0.3 / 10.0) +  -- 30% weight for mutual bonds
        (LEAST(same_events_count, 5) * 0.25 / 5.0) +    -- 25% weight for same events
        (LEAST(array_length(music_overlap, 1), 5) * 0.25 / 5.0) +  -- 25% weight for music
        (LEAST(array_length(style_overlap, 1), 3) * 0.2 / 3.0)     -- 20% weight for dance styles
    );

    result := jsonb_build_object(
        'mutual_bonds', mutual_bonds_count,
        'same_events', same_events_count,
        'music_overlap', to_jsonb(music_overlap),
        'dance_styles', to_jsonb(style_overlap),
        'similarity_score', ROUND(COALESCE(similarity_score, 0)::numeric, 2)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can send bond request
CREATE OR REPLACE FUNCTION can_send_bond_request(sender TEXT, recipient TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    existing_bond BOOLEAN;
    pending_request_exists BOOLEAN;
    recipient_allows TEXT;
    are_mutual_followers BOOLEAN;
BEGIN
    -- Check if already bonded
    SELECT EXISTS(
        SELECT 1 FROM public.dance_bonds
        WHERE (user1_id = LEAST(sender, recipient) AND user2_id = GREATEST(sender, recipient))
    ) INTO existing_bond;

    IF existing_bond THEN
        RETURN jsonb_build_object('can_send', false, 'reason', 'already_bonded');
    END IF;

    -- Check for existing pending request (either direction)
    SELECT EXISTS(
        SELECT 1 FROM public.bond_requests
        WHERE status = 'pending'
        AND ((requester_id = sender AND recipient_id = recipient)
             OR (requester_id = recipient AND recipient_id = sender))
    ) INTO pending_request_exists;

    IF pending_request_exists THEN
        RETURN jsonb_build_object('can_send', false, 'reason', 'pending_request_exists');
    END IF;

    -- Check recipient's privacy settings
    SELECT allow_bond_requests_from INTO recipient_allows
    FROM public.user_privacy_settings
    WHERE user_id = recipient;

    recipient_allows := COALESCE(recipient_allows, 'everyone');

    IF recipient_allows = 'no_one' THEN
        RETURN jsonb_build_object('can_send', false, 'reason', 'recipient_not_accepting');
    END IF;

    IF recipient_allows = 'mutual_follows' THEN
        -- Check if they follow each other
        SELECT EXISTS(
            SELECT 1 FROM public.user_follows f1
            JOIN public.user_follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
            WHERE f1.follower_id = sender AND f1.following_id = recipient
        ) INTO are_mutual_followers;

        IF NOT are_mutual_followers THEN
            RETURN jsonb_build_object('can_send', false, 'reason', 'not_mutual_follows');
        END IF;
    END IF;

    RETURN jsonb_build_object('can_send', true, 'reason', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.bond_requests IS 'Stores bond requests between users with two-way acceptance workflow';
COMMENT ON COLUMN public.bond_requests.match_reasons IS 'JSON object containing similarity data: mutual_bonds, same_events, music_overlap, dance_styles, similarity_score';
COMMENT ON COLUMN public.bond_requests.expires_at IS 'Bond requests expire after 7 days if not responded to';
COMMENT ON FUNCTION calculate_user_similarity IS 'Calculates similarity score between two users based on mutual bonds, events, music, and dance styles';
COMMENT ON FUNCTION can_send_bond_request IS 'Checks if a user can send a bond request based on existing bonds, pending requests, and privacy settings';
