-- Migration: Add Missing Social Feed RLS Policies
-- Date: 2024-12-16
-- Description: Create RLS policies for posts, post_likes, post_comments, and dance_bonds tables
--
-- These policies should have been created in the original social_feed migration but were missing.

-- ===== POSTS POLICIES =====

CREATE POLICY "Public posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own posts"
  ON public.posts FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid()::text = user_id);

-- ===== POST LIKES POLICIES =====

CREATE POLICY "Likes are viewable by everyone"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own likes"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own likes"
  ON public.post_likes FOR DELETE
  USING (auth.uid()::text = user_id);

-- ===== POST COMMENTS POLICIES =====

CREATE POLICY "Comments are viewable by everyone"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.post_comments FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.post_comments FOR DELETE
  USING (auth.uid()::text = user_id);

-- ===== DANCE BONDS POLICIES =====

CREATE POLICY "Dance bonds are viewable by participants"
  ON public.dance_bonds FOR SELECT
  USING (auth.uid()::text = user_id_1 OR auth.uid()::text = user_id_2);

CREATE POLICY "Users can create dance bonds"
  ON public.dance_bonds FOR INSERT
  WITH CHECK (auth.uid()::text = user_id_1 OR auth.uid()::text = user_id_2);

CREATE POLICY "Participants can update dance bonds"
  ON public.dance_bonds FOR UPDATE
  USING (auth.uid()::text = user_id_1 OR auth.uid()::text = user_id_2);

CREATE POLICY "Participants can delete dance bonds"
  ON public.dance_bonds FOR DELETE
  USING (auth.uid()::text = user_id_1 OR auth.uid()::text = user_id_2);

-- Add comments for documentation
COMMENT ON POLICY "Public posts are viewable by everyone" ON public.posts IS
  'Allow anyone to view public posts';

COMMENT ON POLICY "Dance bonds are viewable by participants" ON public.dance_bonds IS
  'Dance bonds are private - only visible to the two users involved';
