-- Migration: Sponsor Categories
-- Date: 2026-01-17
-- Description: Creates sponsor category definitions for the sponsorship system

-- ============================================================================
-- SPONSOR CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sponsor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji or icon identifier
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_categories_slug ON public.sponsor_categories(slug);
CREATE INDEX IF NOT EXISTS idx_sponsor_categories_active ON public.sponsor_categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sponsor_categories_display_order ON public.sponsor_categories(display_order);

-- ============================================================================
-- SEED SPONSOR CATEGORIES (10 categories)
-- ============================================================================

INSERT INTO public.sponsor_categories (slug, name, description, icon, display_order) VALUES
  ('apparel', 'Dance Apparel & Footwear', 'Dance shoes, athletic wear, costumes, and performance gear', '👟', 1),
  ('music', 'Music & Audio', 'Streaming platforms, DJ equipment, record labels, and audio gear', '🎵', 2),
  ('wellness', 'Health & Wellness', 'Sports drinks, supplements, fitness apps, and wellness products', '💪', 3),
  ('tech', 'Technology & Wearables', 'Fitness trackers, AR/VR experiences, and dance technology apps', '⌚', 4),
  ('venues', 'Entertainment Venues', 'Dance studios, event spaces, and ticketing platforms', '🏟️', 5),
  ('local', 'Local Business', 'Restaurants, cafes, and neighborhood businesses near events', '🏪', 6),
  ('media', 'Media & Influencer', 'Content creators, dance media outlets, and production companies', '📺', 7),
  ('education', 'Education & Training', 'Dance schools, online courses, and instructional platforms', '📚', 8),
  ('lifestyle', 'Lifestyle & Fashion', 'Fashion brands, beauty products, and lifestyle accessories', '✨', 9),
  ('corporate', 'Corporate', 'Companies seeking team building and employee engagement', '🏢', 10)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.sponsor_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active categories
CREATE POLICY "sponsor_categories_select_all" ON public.sponsor_categories
FOR SELECT USING (is_active = true);

-- Only admins can manage categories
CREATE POLICY "sponsor_categories_admin_manage" ON public.sponsor_categories
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE privy_id = auth.uid()::text AND is_admin = true
  )
);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sponsor_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sponsor_categories_updated_at ON public.sponsor_categories;
CREATE TRIGGER trigger_sponsor_categories_updated_at
  BEFORE UPDATE ON public.sponsor_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_sponsor_categories_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.sponsor_categories TO anon;
GRANT SELECT ON public.sponsor_categories TO authenticated;
GRANT ALL ON public.sponsor_categories TO service_role;
