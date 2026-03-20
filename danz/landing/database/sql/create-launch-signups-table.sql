-- Simple launch signups table that doesn't depend on Supabase Auth
-- This is independent of the profiles table which requires auth.users

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

-- Allow anyone to insert (for public signups)
CREATE POLICY "Anyone can create launch signups" ON launch_signups
    FOR INSERT WITH CHECK (true);

-- Allow public read (you may want to restrict this later)
CREATE POLICY "Public can view launch signups" ON launch_signups
    FOR SELECT USING (true);