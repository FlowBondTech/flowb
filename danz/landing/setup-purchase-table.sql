-- Create purchase_intents table for tracking purchase attempts
CREATE TABLE IF NOT EXISTS purchase_intents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled, failed
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_intents_user_id ON purchase_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_email ON purchase_intents(email);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_status ON purchase_intents(status);
CREATE INDEX IF NOT EXISTS idx_purchase_intents_created_at ON purchase_intents(created_at DESC);

-- Enable Row Level Security
ALTER TABLE purchase_intents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow public to insert (for creating purchase intents)
CREATE POLICY "Allow public insert on purchase_intents" ON purchase_intents
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow public to select their own purchase intents by email
CREATE POLICY "Allow users to view own purchase_intents" ON purchase_intents
  FOR SELECT TO public
  USING (true); -- In production, you'd want to restrict this

-- Allow public to update their own purchase intents
CREATE POLICY "Allow users to update own purchase_intents" ON purchase_intents
  FOR UPDATE TO public
  USING (true); -- In production, you'd want to restrict this

-- Add comment to table
COMMENT ON TABLE purchase_intents IS 'Tracks purchase attempts and completions for FlowBond products';

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_purchase_intents_updated_at BEFORE UPDATE
    ON purchase_intents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();