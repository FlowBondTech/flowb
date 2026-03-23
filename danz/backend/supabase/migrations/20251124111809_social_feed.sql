-- Social Feed Schema
-- Posts, Likes, Comments, and Dance Bonds

-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT NULL,
  media_type TEXT NULL, -- 'image', 'video', null
  event_id UUID NULL,
  location TEXT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT posts_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  CONSTRAINT posts_media_type_check CHECK (
    media_type IS NULL OR media_type IN ('image', 'video')
  )
) TABLESPACE pg_default;

-- Post likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT post_likes_pkey PRIMARY KEY (id),
  CONSTRAINT post_likes_unique UNIQUE (post_id, user_id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(privy_id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Post comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT post_comments_pkey PRIMARY KEY (id),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(privy_id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Dance bonds table (for tracking dance partnerships)
CREATE TABLE IF NOT EXISTS public.dance_bonds (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id_1 TEXT NOT NULL,
  user_id_2 TEXT NOT NULL,
  bond_level INTEGER NOT NULL DEFAULT 1,
  shared_events_count INTEGER NOT NULL DEFAULT 0,
  total_dances INTEGER NOT NULL DEFAULT 0,
  last_dance_date TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT dance_bonds_pkey PRIMARY KEY (id),
  CONSTRAINT dance_bonds_unique UNIQUE (user_id_1, user_id_2),
  CONSTRAINT dance_bonds_user_id_1_fkey FOREIGN KEY (user_id_1) REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT dance_bonds_user_id_2_fkey FOREIGN KEY (user_id_2) REFERENCES users(privy_id) ON DELETE CASCADE,
  CONSTRAINT dance_bonds_different_users CHECK (user_id_1 < user_id_2), -- Ensure consistent ordering
  CONSTRAINT dance_bonds_level_check CHECK (bond_level >= 1 AND bond_level <= 10)
) TABLESPACE pg_default;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_event_id ON public.posts(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON public.post_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dance_bonds_user_id_1 ON public.dance_bonds(user_id_1);
CREATE INDEX IF NOT EXISTS idx_dance_bonds_user_id_2 ON public.dance_bonds(user_id_2);

-- Enable Row Level Security (RLS)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dance_bonds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
CREATE POLICY "Public posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for post_likes
CREATE POLICY "Likes are viewable by everyone"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for post_comments
CREATE POLICY "Comments are viewable by everyone"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for dance_bonds
CREATE POLICY "Dance bonds are viewable by participants"
  ON public.dance_bonds FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can create dance bonds"
  ON public.dance_bonds FOR INSERT
  WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Participants can update dance bonds"
  ON public.dance_bonds FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Participants can delete dance bonds"
  ON public.dance_bonds FOR DELETE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
