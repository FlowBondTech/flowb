-- Create table for launch notification signups
CREATE TABLE IF NOT EXISTS launch_signups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    signup_location TEXT, -- Which launch city they're interested in
    source TEXT DEFAULT 'website', -- Where they signed up from
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed BOOLEAN DEFAULT false,
    confirmation_token UUID DEFAULT uuid_generate_v4(),
    confirmed_at TIMESTAMPTZ
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_launch_signups_email ON launch_signups(email);
CREATE INDEX IF NOT EXISTS idx_launch_signups_created ON launch_signups(created_at DESC);

-- Enable RLS
ALTER TABLE launch_signups ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert their email
CREATE POLICY "Anyone can sign up for launch notifications" ON launch_signups
    FOR INSERT WITH CHECK (true);

-- Only authenticated admin users can view signups
CREATE POLICY "Admins can view signups" ON launch_signups
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );

-- Grant permissions
GRANT INSERT ON launch_signups TO anon;
GRANT ALL ON launch_signups TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Launch signups table created successfully!';
END $$;