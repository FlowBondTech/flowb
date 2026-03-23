-- Complete Database Setup for DANZ NOW with Privy Authentication
-- Run this in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (careful in production!)
-- Comment these out if you want to preserve existing data
-- DROP TABLE IF EXISTS danz_users CASCADE;
-- DROP TABLE IF EXISTS launch_signups CASCADE;
-- DROP TABLE IF EXISTS privy_users CASCADE;

-- =====================================================
-- MAIN USER TABLE: danz_users
-- This is the primary table for all user data
-- =====================================================

CREATE TABLE IF NOT EXISTS danz_users (
    -- Primary identification
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    privy_id VARCHAR(255) UNIQUE NOT NULL, -- Privy's user ID (primary auth identifier)
    
    -- User profile information
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE, -- For referral codes and social features
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- Web3 information
    wallet_address VARCHAR(255), -- Primary wallet address
    wallet_addresses JSONB DEFAULT '[]', -- Array of all connected wallets
    ens_name VARCHAR(255), -- ENS or other blockchain names
    
    -- Authentication metadata
    auth_method VARCHAR(50), -- email, google, twitter, discord, wallet
    auth_providers JSONB DEFAULT '[]', -- List of all linked auth methods
    has_embedded_wallet BOOLEAN DEFAULT false,
    
    -- DANZ-specific profile data
    avatar_url TEXT,
    bio TEXT,
    city TEXT,
    country VARCHAR(100),
    dance_styles JSONB DEFAULT '[]',
    social_links JSONB DEFAULT '{}',
    
    -- Gamification
    level TEXT DEFAULT 'Beginner' CHECK (level IN ('Beginner', 'Mover', 'Groover', 'Flow Master', 'Legend')),
    xp INTEGER DEFAULT 0,
    total_danz_earned DECIMAL(10, 2) DEFAULT 0,
    
    -- User type and permissions
    role TEXT DEFAULT 'dancer' CHECK (role IN ('dancer', 'facilitator', 'venue', 'organizer', 'admin')),
    is_verified BOOLEAN DEFAULT false,
    is_beta_tester BOOLEAN DEFAULT false,
    
    -- Referral system
    referral_code VARCHAR(50) UNIQUE,
    referred_by UUID REFERENCES danz_users(id),
    referral_count INTEGER DEFAULT 0,
    
    -- Settings and preferences
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    privacy_settings JSONB DEFAULT '{"profile_public": true, "show_earnings": false}',
    
    -- Launch signup specific
    launch_interest_location VARCHAR(100), -- Bali, Austin, Tulum
    device_reservation_status VARCHAR(50), -- null, interested, reserved, paid
    newsletter_subscribed BOOLEAN DEFAULT true,
    
    -- Timestamps
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_danz_users_privy_id ON danz_users(privy_id);
CREATE INDEX IF NOT EXISTS idx_danz_users_email ON danz_users(email);
CREATE INDEX IF NOT EXISTS idx_danz_users_username ON danz_users(username);
CREATE INDEX IF NOT EXISTS idx_danz_users_wallet_address ON danz_users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_danz_users_referral_code ON danz_users(referral_code);
CREATE INDEX IF NOT EXISTS idx_danz_users_role ON danz_users(role);
CREATE INDEX IF NOT EXISTS idx_danz_users_created_at ON danz_users(created_at DESC);

-- Enable Row Level Security
ALTER TABLE danz_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create danz users" ON danz_users;
DROP POLICY IF EXISTS "Users can view public danz profiles" ON danz_users;
DROP POLICY IF EXISTS "Users can update own danz profile" ON danz_users;

-- RLS Policies
-- Anyone can create a user (for signups)
CREATE POLICY "Anyone can create danz users" ON danz_users
    FOR INSERT WITH CHECK (true);

-- Users can view all public profiles
CREATE POLICY "Users can view public danz profiles" ON danz_users
    FOR SELECT USING (true);

-- Users can update their own record
CREATE POLICY "Users can update own danz profile" ON danz_users
    FOR UPDATE USING (true); -- Simplified for now, can be restricted later

-- Create a function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code() 
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    done BOOLEAN DEFAULT false;
BEGIN
    WHILE NOT done LOOP
        -- Generate a random 6-character alphanumeric code
        new_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));
        
        -- Check if it already exists
        IF NOT EXISTS (SELECT 1 FROM danz_users WHERE referral_code = new_code) THEN
            done := true;
        END IF;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code on insert
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_referral_code ON danz_users;
CREATE TRIGGER trigger_set_referral_code
    BEFORE INSERT ON danz_users
    FOR EACH ROW
    EXECUTE FUNCTION set_referral_code();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_updated_at ON danz_users;
CREATE TRIGGER trigger_update_updated_at
    BEFORE UPDATE ON danz_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- FALLBACK TABLE: launch_signups
-- Simple table for capturing signups if main table fails
-- =====================================================

CREATE TABLE IF NOT EXISTS launch_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    privy_user_id VARCHAR(255),
    wallet_address VARCHAR(255),
    auth_method VARCHAR(50),
    signup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(100) DEFAULT 'landing_page',
    newsletter_subscribed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_launch_signups_email ON launch_signups(email);
CREATE INDEX IF NOT EXISTS idx_launch_signups_privy_id ON launch_signups(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_launch_signups_created ON launch_signups(created_at DESC);

-- Enable Row Level Security
ALTER TABLE launch_signups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create launch signups" ON launch_signups;
DROP POLICY IF EXISTS "Public can view launch signups" ON launch_signups;

-- Allow anyone to insert (for public signups)
CREATE POLICY "Anyone can create launch signups" ON launch_signups
    FOR INSERT WITH CHECK (true);

-- Allow public read
CREATE POLICY "Public can view launch signups" ON launch_signups
    FOR SELECT USING (true);

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- Helper view for launch signups
DROP VIEW IF EXISTS launch_signups_view;
CREATE OR REPLACE VIEW launch_signups_view AS
SELECT 
    id,
    email,
    name,
    phone,
    city as launch_location,
    device_reservation_status,
    newsletter_subscribed,
    created_at as signup_date
FROM danz_users
WHERE newsletter_subscribed = true
ORDER BY created_at DESC;

-- Helper view for referral leaderboard
DROP VIEW IF EXISTS referral_leaderboard;
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT 
    id,
    username,
    name,
    referral_code,
    referral_count,
    level,
    xp
FROM danz_users
WHERE referral_count > 0
ORDER BY referral_count DESC;

-- =====================================================
-- EMAIL TRACKING TABLE: email_signups
-- Tracks all email signups and newsletter subscriptions
-- =====================================================

CREATE TABLE IF NOT EXISTS email_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    signup_type VARCHAR(50) DEFAULT 'launch_notification',
    source VARCHAR(100) DEFAULT 'landing_page',
    
    -- Tracking fields
    referral_code VARCHAR(50),
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

-- Indexes for email_signups
CREATE INDEX IF NOT EXISTS idx_email_signups_email ON email_signups(email);
CREATE INDEX IF NOT EXISTS idx_email_signups_signup_type ON email_signups(signup_type);
CREATE INDEX IF NOT EXISTS idx_email_signups_source ON email_signups(source);
CREATE INDEX IF NOT EXISTS idx_email_signups_referral_code ON email_signups(referral_code);
CREATE INDEX IF NOT EXISTS idx_email_signups_newsletter ON email_signups(newsletter_subscribed) WHERE newsletter_subscribed = true;
CREATE INDEX IF NOT EXISTS idx_email_signups_created_at ON email_signups(created_at DESC);

-- Enable Row Level Security
ALTER TABLE email_signups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can create email signups" ON email_signups;
DROP POLICY IF EXISTS "Users can view own email signup" ON email_signups;
DROP POLICY IF EXISTS "Users can update own email preferences" ON email_signups;

-- RLS Policies
CREATE POLICY "Anyone can create email signups" ON email_signups
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own email signup" ON email_signups
    FOR SELECT USING (true);

CREATE POLICY "Users can update own email preferences" ON email_signups
    FOR UPDATE USING (true);

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

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify everything is set up correctly
-- =====================================================

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('danz_users', 'launch_signups')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('danz_users', 'launch_signups');

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('danz_users', 'launch_signups')
ORDER BY tablename, policyname;

-- Test insert capability (you can run this to test)
-- INSERT INTO danz_users (privy_id, email, name, phone)
-- VALUES ('test_' || gen_random_uuid(), 'test@example.com', 'Test User', '555-0100')
-- ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
-- RETURNING id, email, name, referral_code;