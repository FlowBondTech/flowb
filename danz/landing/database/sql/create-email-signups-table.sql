-- Email Signups Table for Email Tracking
-- This table tracks all email signups and newsletter subscriptions

CREATE TABLE IF NOT EXISTS email_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    signup_type VARCHAR(50) DEFAULT 'launch_notification', -- launch_notification, newsletter, waitlist, beta_access
    source VARCHAR(100) DEFAULT 'landing_page', -- landing_page, onboarding, referral, social
    
    -- Tracking fields
    referral_code VARCHAR(50), -- If they signed up via referral
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    
    -- Email preferences
    newsletter_subscribed BOOLEAN DEFAULT true,
    launch_updates BOOLEAN DEFAULT true,
    product_updates BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT true,
    
    -- Status tracking
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verification_sent_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Engagement tracking
    emails_sent INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    last_email_sent_at TIMESTAMP WITH TIME ZONE,
    last_email_opened_at TIMESTAMP WITH TIME ZONE,
    last_email_clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Unsubscribe tracking
    unsubscribed BOOLEAN DEFAULT false,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    unsubscribe_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_signups_email ON email_signups(email);
CREATE INDEX IF NOT EXISTS idx_email_signups_signup_type ON email_signups(signup_type);
CREATE INDEX IF NOT EXISTS idx_email_signups_source ON email_signups(source);
CREATE INDEX IF NOT EXISTS idx_email_signups_referral_code ON email_signups(referral_code);
CREATE INDEX IF NOT EXISTS idx_email_signups_newsletter ON email_signups(newsletter_subscribed) WHERE newsletter_subscribed = true;
CREATE INDEX IF NOT EXISTS idx_email_signups_created_at ON email_signups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_signups_unsubscribed ON email_signups(unsubscribed) WHERE unsubscribed = false;

-- Enable Row Level Security
ALTER TABLE email_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can create an email signup (for public signups)
DROP POLICY IF EXISTS "Anyone can create email signups" ON email_signups;
CREATE POLICY "Anyone can create email signups" ON email_signups
    FOR INSERT WITH CHECK (true);

-- Public can view their own signup by email
DROP POLICY IF EXISTS "Users can view own email signup" ON email_signups;
CREATE POLICY "Users can view own email signup" ON email_signups
    FOR SELECT USING (true); -- You might want to restrict this later

-- Users can update their own preferences
DROP POLICY IF EXISTS "Users can update own email preferences" ON email_signups;
CREATE POLICY "Users can update own email preferences" ON email_signups
    FOR UPDATE USING (true); -- You might want to restrict this later

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_email_signups_updated_at ON email_signups;
CREATE TRIGGER trigger_update_email_signups_updated_at
    BEFORE UPDATE ON email_signups
    FOR EACH ROW
    EXECUTE FUNCTION update_email_signups_updated_at();

-- Helper views for email management

-- Active newsletter subscribers
DROP VIEW IF EXISTS active_newsletter_subscribers;
CREATE VIEW active_newsletter_subscribers AS
SELECT 
    id,
    email,
    source,
    referral_code,
    created_at
FROM email_signups
WHERE newsletter_subscribed = true 
    AND unsubscribed = false
    AND email_verified = true
ORDER BY created_at DESC;

-- Launch notification list
DROP VIEW IF EXISTS launch_notification_list;
CREATE VIEW launch_notification_list AS
SELECT 
    id,
    email,
    source,
    referral_code,
    created_at
FROM email_signups
WHERE launch_updates = true 
    AND unsubscribed = false
    AND (signup_type = 'launch_notification' OR signup_type = 'beta_access')
ORDER BY created_at DESC;

-- Email engagement stats
DROP VIEW IF EXISTS email_engagement_stats;
CREATE VIEW email_engagement_stats AS
SELECT 
    email,
    emails_sent,
    emails_opened,
    emails_clicked,
    CASE 
        WHEN emails_sent > 0 THEN ROUND((emails_opened::numeric / emails_sent) * 100, 2)
        ELSE 0
    END as open_rate,
    CASE 
        WHEN emails_opened > 0 THEN ROUND((emails_clicked::numeric / emails_opened) * 100, 2)
        ELSE 0
    END as click_rate,
    last_email_opened_at,
    created_at
FROM email_signups
WHERE unsubscribed = false
ORDER BY emails_sent DESC;

-- Comments for documentation
COMMENT ON TABLE email_signups IS 'Tracks all email signups and manages email preferences for DANZ NOW platform';
COMMENT ON COLUMN email_signups.signup_type IS 'Type of signup: launch_notification, newsletter, waitlist, beta_access';
COMMENT ON COLUMN email_signups.source IS 'Where the signup originated: landing_page, onboarding, referral, social';
COMMENT ON COLUMN email_signups.email_verified IS 'Whether the email has been verified via confirmation link';