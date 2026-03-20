-- DANZ Users Table - Designed for Privy Auth + Supabase Database
-- This is the primary user table for the DANZ platform using Privy authentication

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
CREATE INDEX idx_danz_users_privy_id ON danz_users(privy_id);
CREATE INDEX idx_danz_users_email ON danz_users(email);
CREATE INDEX idx_danz_users_username ON danz_users(username);
CREATE INDEX idx_danz_users_wallet_address ON danz_users(wallet_address);
CREATE INDEX idx_danz_users_referral_code ON danz_users(referral_code);
CREATE INDEX idx_danz_users_role ON danz_users(role);
CREATE INDEX idx_danz_users_created_at ON danz_users(created_at DESC);

-- Enable Row Level Security
ALTER TABLE danz_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can create a user (for signups)
CREATE POLICY "Anyone can create danz users" ON danz_users
    FOR INSERT WITH CHECK (true);

-- Users can view all public profiles (you can make this more restrictive)
CREATE POLICY "Users can view public danz profiles" ON danz_users
    FOR SELECT USING (true);

-- Users can update their own record (based on privy_id or email)
CREATE POLICY "Users can update own danz profile" ON danz_users
    FOR UPDATE USING (
        email = current_setting('app.current_user_email', true) OR
        privy_id = current_setting('app.current_privy_id', true)
    );

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

CREATE TRIGGER trigger_update_updated_at
    BEFORE UPDATE ON danz_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Helper view for launch signups
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

-- Comments for documentation
COMMENT ON TABLE danz_users IS 'Primary user table for DANZ platform using Privy authentication';
COMMENT ON COLUMN danz_users.privy_id IS 'Unique identifier from Privy authentication service';
COMMENT ON COLUMN danz_users.wallet_addresses IS 'JSON array of all connected wallet addresses';
COMMENT ON COLUMN danz_users.auth_providers IS 'JSON array of all linked authentication methods';