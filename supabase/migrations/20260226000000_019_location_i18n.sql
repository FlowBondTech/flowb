-- Location & i18n columns for flowb_sessions
ALTER TABLE public.flowb_sessions ADD COLUMN IF NOT EXISTS home_city TEXT;
ALTER TABLE public.flowb_sessions ADD COLUMN IF NOT EXISTS home_country TEXT;
ALTER TABLE public.flowb_sessions ADD COLUMN IF NOT EXISTS current_city TEXT;
ALTER TABLE public.flowb_sessions ADD COLUMN IF NOT EXISTS current_country TEXT;
ALTER TABLE public.flowb_sessions ADD COLUMN IF NOT EXISTS destination_city TEXT;
ALTER TABLE public.flowb_sessions ADD COLUMN IF NOT EXISTS destination_country TEXT;
ALTER TABLE public.flowb_sessions ADD COLUMN IF NOT EXISTS location_visibility TEXT DEFAULT 'country';
ALTER TABLE public.flowb_sessions ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;
ALTER TABLE public.flowb_sessions ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en';

CREATE INDEX IF NOT EXISTS idx_sessions_home_country ON public.flowb_sessions (home_country) WHERE home_country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_current_city ON public.flowb_sessions (current_city) WHERE current_city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_destination_city ON public.flowb_sessions (destination_city) WHERE destination_city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_locale ON public.flowb_sessions (locale);

-- Connection context columns
ALTER TABLE public.flowb_connections ADD COLUMN IF NOT EXISTS met_at_event TEXT;
ALTER TABLE public.flowb_connections ADD COLUMN IF NOT EXISTS met_at_city TEXT;
