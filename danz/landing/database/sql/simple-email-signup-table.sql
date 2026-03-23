-- Simple email signup table that works with existing database
-- Run this first to enable email signups

-- Create email_signups table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    signup_type VARCHAR(50) DEFAULT 'launch_notification',
    source VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_email_signups_email ON email_signups(email);

-- Enable Row Level Security (RLS)
ALTER TABLE email_signups ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to insert (for public signups)
CREATE POLICY "Anyone can signup for notifications" ON email_signups
    FOR INSERT WITH CHECK (true);

-- Create a policy that allows reading all signups (for admin)
-- You may want to restrict this later based on your auth setup
CREATE POLICY "Public read for email signups" ON email_signups
    FOR SELECT USING (true);