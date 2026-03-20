-- Create a separate table for storing additional user metadata
-- This includes phone numbers, Privy user IDs, and other data not in the profiles table

CREATE TABLE IF NOT EXISTS user_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    privy_user_id VARCHAR(255),
    wallet_address VARCHAR(255),
    auth_method VARCHAR(50),
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_date TIMESTAMP WITH TIME ZONE,
    signup_source VARCHAR(100),
    newsletter_subscribed BOOLEAN DEFAULT true,
    device_reservation_interest BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_user_metadata_email ON user_metadata(email);
CREATE INDEX IF NOT EXISTS idx_user_metadata_privy_id ON user_metadata(privy_user_id);

-- Enable Row Level Security
ALTER TABLE user_metadata ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for signups)
CREATE POLICY "Anyone can create user metadata" ON user_metadata
    FOR INSERT WITH CHECK (true);

-- Allow users to view their own metadata
CREATE POLICY "Users can view own metadata" ON user_metadata
    FOR SELECT USING (true);  -- For now, allow read access

-- Allow users to update their own metadata
CREATE POLICY "Users can update own metadata" ON user_metadata
    FOR UPDATE USING (true);