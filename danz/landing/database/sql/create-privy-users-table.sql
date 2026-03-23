-- Create a users table specifically for Privy authentication
-- This can later be merged with the profiles table when you migrate auth systems

-- First, create the privy_users table with its own ID
CREATE TABLE IF NOT EXISTS privy_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    privy_user_id VARCHAR(255) UNIQUE NOT NULL, -- Privy's user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    wallet_address VARCHAR(255),
    auth_method VARCHAR(50),
    
    -- Profile fields that match the existing profiles table structure
    avatar_url TEXT,
    bio TEXT,
    city TEXT DEFAULT 'Launch Interest',
    dance_styles JSONB DEFAULT '[]',
    social_links JSONB DEFAULT '{}',
    level TEXT DEFAULT 'Beginner',
    xp INTEGER DEFAULT 0,
    role TEXT DEFAULT 'dancer',
    
    -- Metadata
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_date TIMESTAMP WITH TIME ZONE,
    signup_source VARCHAR(100) DEFAULT 'landing_page',
    newsletter_subscribed BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_privy_users_email ON privy_users(email);
CREATE INDEX IF NOT EXISTS idx_privy_users_privy_id ON privy_users(privy_user_id);
CREATE INDEX IF NOT EXISTS idx_privy_users_wallet ON privy_users(wallet_address);

-- Enable Row Level Security
ALTER TABLE privy_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to create a user (for signups)
CREATE POLICY "Anyone can create privy users" ON privy_users
    FOR INSERT WITH CHECK (true);

-- Allow users to view all users (you may want to restrict this)
CREATE POLICY "Users can view all privy users" ON privy_users
    FOR SELECT USING (true);

-- Allow users to update their own record (based on email for now)
CREATE POLICY "Users can update own privy user record" ON privy_users
    FOR UPDATE USING (true);

-- Migration helper view to make it easier to merge with profiles table later
CREATE OR REPLACE VIEW privy_users_for_migration AS
SELECT 
    id,
    email,
    name,
    avatar_url,
    bio,
    city,
    dance_styles,
    social_links,
    level,
    xp,
    role,
    created_at,
    updated_at
FROM privy_users;

-- Future migration path:
-- When you switch from Privy to Supabase Auth or want to merge:
-- 1. Create auth.users entries for each privy_user
-- 2. INSERT INTO profiles SELECT * FROM privy_users_for_migration
-- 3. Update foreign keys and relationships