-- Migration: Rename privy_id to id in users table
-- Date: 2026-03-23
-- Description: Remove Privy auth dependency, rename users.privy_id to users.id
-- IMPORTANT: Deploy together with backend auth changes (Supabase JWT replaces Privy)
--
-- PostgreSQL ALTER TABLE RENAME COLUMN automatically updates:
--   - All 86 FK constraints referencing users(privy_id)
--   - All 3 views (admin_user_points_summary, gig_worker_performance, pending_organizer_approvals)
--   - All indexes (users_pkey, etc.)
--   - All RLS policies (stored as parsed expression trees)
-- Only PL/pgSQL function bodies need manual updating (stored as raw text).

BEGIN;

-- ============================================================
-- Step 1: Rename users.privy_id -> users.id
-- ============================================================
ALTER TABLE public.users RENAME COLUMN privy_id TO id;

-- ============================================================
-- Step 2: Drop update_user_stats (has p_privy_id param name)
-- Must drop before recreating with renamed parameter.
-- ============================================================
DROP FUNCTION IF EXISTS public.update_user_stats(text, integer, integer, boolean);

-- ============================================================
-- Step 3: Recreate all functions that reference privy_id
-- ============================================================
DO $$
DECLARE
    func_record RECORD;
    func_def TEXT;
BEGIN
    FOR func_record IN
        SELECT p.oid, p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prosrc LIKE '%privy_id%'
    LOOP
        func_def := pg_get_functiondef(func_record.oid);
        func_def := replace(func_def, 'privy_id', 'id');
        EXECUTE func_def;
        RAISE NOTICE 'Updated function: %', func_record.proname;
    END LOOP;
END $$;

-- ============================================================
-- Step 4: Verification
-- ============================================================
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosrc LIKE '%privy_id%';

    IF remaining_count > 0 THEN
        RAISE WARNING '% functions still reference privy_id!', remaining_count;
    ELSE
        RAISE NOTICE 'All functions updated successfully.';
    END IF;

    -- Verify column renamed
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id'
    ) THEN
        RAISE NOTICE 'Column users.id confirmed.';
    ELSE
        RAISE WARNING 'Column users.id NOT found!';
    END IF;
END $$;

COMMIT;
