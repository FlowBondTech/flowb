-- Create device_reservations table for storing pre-orders
CREATE TABLE IF NOT EXISTS device_reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    package_id VARCHAR(50) NOT NULL, -- 'device-only' or 'device-plus'
    package_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, refunded
    payment_method VARCHAR(50), -- card, crypto
    payment_reference VARCHAR(255), -- External payment ID from Stripe/NOWPayments
    
    -- Customer details
    full_name VARCHAR(255),
    shipping_address TEXT,
    phone VARCHAR(50),
    
    -- Metadata
    reservation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_date TIMESTAMP WITH TIME ZONE,
    estimated_shipping VARCHAR(50) DEFAULT 'Q4 2025',
    notes TEXT,
    
    -- Tracking
    ip_address INET,
    user_agent TEXT,
    referral_source VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_reservations_email ON device_reservations(email);
CREATE INDEX IF NOT EXISTS idx_device_reservations_payment_status ON device_reservations(payment_status);
CREATE INDEX IF NOT EXISTS idx_device_reservations_reservation_date ON device_reservations(reservation_date);

-- Enable Row Level Security
ALTER TABLE device_reservations ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows insert for everyone (for pre-orders)
CREATE POLICY "Anyone can create device reservations" ON device_reservations
    FOR INSERT WITH CHECK (true);

-- Create a policy that allows users to view their own reservations
CREATE POLICY "Users can view own device reservations" ON device_reservations
    FOR SELECT USING (email = current_user_email());

-- Note: You'll need to create a function to get current_user_email() 
-- or adjust the policy based on your auth setup

-- Create a simple email_signups table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_signups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    signup_type VARCHAR(50) DEFAULT 'launch_notification', -- launch_notification, device_reservation
    source VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_email_signups_email ON email_signups(email);

-- Enable RLS
ALTER TABLE email_signups ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert signups
CREATE POLICY "Anyone can signup for notifications" ON email_signups
    FOR INSERT WITH CHECK (true);