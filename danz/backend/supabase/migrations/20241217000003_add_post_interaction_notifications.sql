-- Migration: Add Notification Triggers for Post Interactions
-- Date: 2024-12-17
-- Description: Automatically create notifications when users like or comment on posts

-- ===== FUNCTION: Notify Post Author on New Like =====

CREATE OR REPLACE FUNCTION public.notify_post_like()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
DECLARE
  v_post_author_id text;
  v_post_content text;
BEGIN
  -- Get the post author and content
  SELECT user_id, content INTO v_post_author_id, v_post_content
  FROM public.posts
  WHERE id = NEW.post_id;

  -- Only create notification if liker is not the post author
  IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (
      id,
      recipient_id,
      type,
      title,
      message,
      data,
      read,
      created_at,
      sender_id,
      sender_type,
      post_id,
      action_type,
      push_sent
    ) VALUES (
      gen_random_uuid(),
      v_post_author_id,
      'social',
      'New Like on Your Post',
      'Someone liked your post!',
      jsonb_build_object(
        'notification_subtype', 'post_like',
        'post_preview', LEFT(v_post_content, 100),
        'liker_id', NEW.user_id
      ),
      false,
      NOW(),
      NEW.user_id,
      'user',
      NEW.post_id,
      'like',
      false
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- ===== FUNCTION: Notify Post Author on New Comment =====

CREATE OR REPLACE FUNCTION public.notify_post_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $function$
DECLARE
  v_post_author_id text;
  v_post_content text;
BEGIN
  -- Get the post author and content
  SELECT user_id, content INTO v_post_author_id, v_post_content
  FROM public.posts
  WHERE id = NEW.post_id;

  -- Only create notification if commenter is not the post author
  IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (
      id,
      recipient_id,
      type,
      title,
      message,
      data,
      read,
      created_at,
      sender_id,
      sender_type,
      post_id,
      action_type,
      push_sent
    ) VALUES (
      gen_random_uuid(),
      v_post_author_id,
      'social',
      'New Comment on Your Post',
      LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'notification_subtype', 'post_comment',
        'post_preview', LEFT(v_post_content, 100),
        'comment_preview', LEFT(NEW.content, 200),
        'commenter_id', NEW.user_id
      ),
      false,
      NOW(),
      NEW.user_id,
      'user',
      NEW.post_id,
      'comment',
      false
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- ===== CREATE TRIGGERS =====

-- Trigger for post likes
DROP TRIGGER IF EXISTS trigger_notify_post_like ON public.post_likes;

CREATE TRIGGER trigger_notify_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_like();

-- Trigger for post comments
DROP TRIGGER IF EXISTS trigger_notify_post_comment ON public.post_comments;

CREATE TRIGGER trigger_notify_post_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_comment();

-- ===== ADD COMMENTS FOR DOCUMENTATION =====

COMMENT ON FUNCTION public.notify_post_like() IS
  'Automatically creates a notification when someone likes a post. Does not notify if user likes their own post.';

COMMENT ON FUNCTION public.notify_post_comment() IS
  'Automatically creates a notification when someone comments on a post. Does not notify if user comments on their own post.';

COMMENT ON TRIGGER trigger_notify_post_like ON public.post_likes IS
  'Notifies post authors when their posts receive likes';

COMMENT ON TRIGGER trigger_notify_post_comment ON public.post_comments IS
  'Notifies post authors when their posts receive comments';

-- ===== VERIFICATION =====
-- Test by creating a like or comment on a post:
--
-- -- Create a test like (as a different user than post author)
-- INSERT INTO post_likes (id, post_id, user_id)
-- VALUES (gen_random_uuid(), '<post_id>', '<different_user_id>');
--
-- -- Check notifications created
-- SELECT * FROM notifications
-- WHERE type = 'social'
--   AND data->>'notification_subtype' IN ('post_like', 'post_comment')
-- ORDER BY created_at DESC
-- LIMIT 5;
