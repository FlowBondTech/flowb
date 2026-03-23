-- Social Feed Schema - Minimal version
-- Run this to clean up first if needed:
-- DROP TABLE IF EXISTS public.post_comments CASCADE;
-- DROP TABLE IF EXISTS public.post_likes CASCADE;
-- DROP TABLE IF EXISTS public.posts CASCADE;
-- DROP TABLE IF EXISTS public.dance_bonds CASCADE;

-- Posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  event_id UUID,
  location TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Foreign keys for posts
ALTER TABLE public.posts
  ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(privy_id)
  ON DELETE CASCADE;

-- Only add event foreign key if events table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'events') THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_event_id_fkey
      FOREIGN KEY (event_id)
      REFERENCES events(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Post likes table
CREATE TABLE public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes
  ADD CONSTRAINT post_likes_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;

ALTER TABLE public.post_likes
  ADD CONSTRAINT post_likes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(privy_id)
  ON DELETE CASCADE;

-- Post comments table
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.post_comments
  ADD CONSTRAINT post_comments_post_id_fkey
  FOREIGN KEY (post_id)
  REFERENCES posts(id)
  ON DELETE CASCADE;

ALTER TABLE public.post_comments
  ADD CONSTRAINT post_comments_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(privy_id)
  ON DELETE CASCADE;

-- Dance bonds table
CREATE TABLE public.dance_bonds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1 TEXT NOT NULL,
  user_id_2 TEXT NOT NULL,
  bond_level INTEGER NOT NULL DEFAULT 1 CHECK (bond_level >= 1 AND bond_level <= 10),
  shared_events_count INTEGER NOT NULL DEFAULT 0,
  total_dances INTEGER NOT NULL DEFAULT 0,
  last_dance_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 < user_id_2)
);

ALTER TABLE public.dance_bonds
  ADD CONSTRAINT dance_bonds_user_id_1_fkey
  FOREIGN KEY (user_id_1)
  REFERENCES users(privy_id)
  ON DELETE CASCADE;

ALTER TABLE public.dance_bonds
  ADD CONSTRAINT dance_bonds_user_id_2_fkey
  FOREIGN KEY (user_id_2)
  REFERENCES users(privy_id)
  ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_event_id ON public.posts(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_created_at ON public.post_comments(created_at DESC);
CREATE INDEX idx_dance_bonds_user_id_1 ON public.dance_bonds(user_id_1);
CREATE INDEX idx_dance_bonds_user_id_2 ON public.dance_bonds(user_id_2);
