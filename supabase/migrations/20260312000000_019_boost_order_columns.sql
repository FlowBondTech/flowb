-- Add order_id and product_slug columns to flowb_event_boosts
-- This enables linking boosts to product purchases through the payment system

ALTER TABLE flowb_event_boosts ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES flowb_orders(id);
ALTER TABLE flowb_event_boosts ADD COLUMN IF NOT EXISTS product_slug TEXT;

-- Index for looking up boosts by order
CREATE INDEX IF NOT EXISTS idx_event_boosts_order ON flowb_event_boosts(order_id) WHERE order_id IS NOT NULL;

COMMENT ON COLUMN flowb_event_boosts.order_id IS 'Links to flowb_orders when boost was purchased via payment system';
COMMENT ON COLUMN flowb_event_boosts.product_slug IS 'Product slug (event-boost-basic, event-boost-pro, event-boost-mega) that created this boost';
