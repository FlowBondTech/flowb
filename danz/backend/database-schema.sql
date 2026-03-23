-- This are all table schemas for the database.

-- achievements table schema

create table public.achievements (
  id uuid not null default gen_random_uuid (),
  user_id text null,
  achievement_type text not null,
  title text not null,
  description text null,
  icon text null,
  xp_reward integer null default 0,
  danz_reward numeric(20, 2) null default 0,
  unlocked_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint achievements_pkey primary key (id),
  constraint achievements_user_id_achievement_type_key unique (user_id, achievement_type),
  constraint achievements_user_id_fkey foreign KEY (user_id) references users (privy_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_achievements_user_id on public.achievements using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_achievements_type on public.achievements using btree (achievement_type) TABLESPACE pg_default;


-- dance_bonds table schema

create table public.dance_bonds (
  id uuid not null default gen_random_uuid (),
  user1_id text null,
  user2_id text null,
  bond_level integer null default 1,
  shared_sessions integer null default 0,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint dance_bonds_pkey primary key (id),
  constraint dance_bonds_user1_id_user2_id_key unique (user1_id, user2_id),
  constraint dance_bonds_user1_id_fkey foreign KEY (user1_id) references users (privy_id) on delete CASCADE,
  constraint dance_bonds_user2_id_fkey foreign KEY (user2_id) references users (privy_id) on delete CASCADE,
  constraint dance_bonds_bond_level_check check (
    (
      (bond_level >= 1)
      and (bond_level <= 100)
    )
  ),
  constraint dance_bonds_check check ((user1_id < user2_id))
) TABLESPACE pg_default;

create index IF not exists idx_dance_bonds_user1 on public.dance_bonds using btree (user1_id) TABLESPACE pg_default;

create index IF not exists idx_dance_bonds_user2 on public.dance_bonds using btree (user2_id) TABLESPACE pg_default;

create trigger update_dance_bonds_updated_at BEFORE
update on dance_bonds for EACH row
execute FUNCTION update_updated_at_column ();

-- event_registrations table schema

create table public.event_registrations (
  id uuid not null default gen_random_uuid (),
  event_id uuid not null,
  user_id text not null,
  status text null default 'registered'::text,
  registration_date timestamp with time zone null default timezone ('utc'::text, now()),
  payment_status text null default 'pending'::text,
  payment_amount numeric(10, 2) null,
  payment_date timestamp with time zone null,
  checked_in boolean null default false,
  check_in_time timestamp with time zone null,
  user_notes text null,
  admin_notes text null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint event_registrations_pkey primary key (id),
  constraint event_registrations_event_id_user_id_key unique (event_id, user_id),
  constraint event_registrations_event_id_fkey foreign KEY (event_id) references events (id) on update CASCADE on delete CASCADE,
  constraint event_registrations_user_id_fkey foreign KEY (user_id) references users (privy_id) on update CASCADE on delete CASCADE,
  constraint event_registrations_payment_status_check check (
    (
      payment_status = any (
        array[
          'pending'::text,
          'paid'::text,
          'refunded'::text,
          'free'::text
        ]
      )
    )
  ),
  constraint event_registrations_status_check check (
    (
      status = any (
        array[
          'registered'::text,
          'waitlisted'::text,
          'cancelled'::text,
          'attended'::text,
          'no-show'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_registrations_date on public.event_registrations using btree (registration_date desc) TABLESPACE pg_default;

create index IF not exists idx_registrations_event on public.event_registrations using btree (event_id) TABLESPACE pg_default;

create index IF not exists idx_registrations_status on public.event_registrations using btree (status) TABLESPACE pg_default;

create index IF not exists idx_registrations_user on public.event_registrations using btree (user_id) TABLESPACE pg_default;

create trigger update_event_capacity_on_registration
after INSERT
or DELETE
or
update on event_registrations for EACH row
execute FUNCTION update_event_participant_count ();

create trigger update_user_event_stats_trigger
after INSERT
or DELETE
or
update on event_registrations for EACH row
execute FUNCTION update_user_event_stats ();

-- events table schema

create table public.events (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  category text null,
  image_url text null,
  location_name text not null,
  location_address text null,
  location_city text null,
  location_latitude numeric(10, 8) null,
  location_longitude numeric(11, 8) null,
  facilitator_id text null,
  max_capacity integer null default 50,
  current_capacity integer null default 0,
  price_usd numeric(10, 2) null,
  price_danz numeric(20, 2) null,
  is_featured boolean null default false,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  skill_level text null default 'all'::text,
  is_virtual boolean null default false,
  virtual_link text null,
  requirements text null,
  tags text[] null,
  dance_styles text[] null,
  currency text null default 'USD'::text,
  start_date_time timestamp with time zone not null,
  end_date_time timestamp with time zone not null,
  constraint events_pkey primary key (id),
  constraint events_facilitator_id_fkey foreign KEY (facilitator_id) references users (privy_id) on update CASCADE on delete set null,
  constraint events_category_check check (
    (
      category = any (
        array[
          'salsa'::text,
          'hip-hop'::text,
          'contemporary'::text,
          'ballet'::text,
          'jazz'::text,
          'ballroom'::text,
          'street'::text,
          'cultural'::text,
          'fitness'::text,
          'class'::text,
          'social'::text,
          'battle'::text,
          'workshop'::text,
          'performance'::text,
          'other'::text
        ]
      )
    )
  ),
  constraint events_date_time_check check ((end_date_time > start_date_time)),
  constraint events_skill_level_check check (
    (
      (skill_level is null)
      or (
        skill_level = any (
          array[
            'all'::text,
            'beginner'::text,
            'intermediate'::text,
            'advanced'::text
          ]
        )
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_events_category on public.events using btree (category) TABLESPACE pg_default;

create index IF not exists idx_events_dance_styles on public.events using gin (dance_styles) TABLESPACE pg_default;

create index IF not exists idx_events_date_range on public.events using btree (start_date_time, end_date_time) TABLESPACE pg_default;

create index IF not exists idx_events_end_date_time on public.events using btree (end_date_time) TABLESPACE pg_default;

create index IF not exists idx_events_facilitator on public.events using btree (facilitator_id) TABLESPACE pg_default;

create index IF not exists idx_events_is_virtual on public.events using btree (is_virtual) TABLESPACE pg_default;

create index IF not exists idx_events_skill_level on public.events using btree (skill_level) TABLESPACE pg_default;

create index IF not exists idx_events_start_date_time on public.events using btree (start_date_time) TABLESPACE pg_default;

create index IF not exists idx_events_tags on public.events using gin (tags) TABLESPACE pg_default;

-- feed_posts table schema

create table public.feed_posts (
  id uuid not null default gen_random_uuid (),
  user_id text null,
  content text not null,
  media_urls text[] null,
  media_type text null,
  likes_count integer null default 0,
  comments_count integer null default 0,
  shares_count integer null default 0,
  post_type text null default 'post'::text,
  is_public boolean null default true,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint feed_posts_pkey primary key (id),
  constraint feed_posts_user_id_fkey foreign KEY (user_id) references users (privy_id) on delete CASCADE,
  constraint feed_posts_media_type_check check (
    (
      media_type = any (
        array['image'::text, 'video'::text, 'mixed'::text]
      )
    )
  ),
  constraint feed_posts_post_type_check check (
    (
      post_type = any (
        array[
          'post'::text,
          'achievement'::text,
          'event'::text,
          'challenge'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_feed_posts_user_id on public.feed_posts using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_feed_posts_created_at on public.feed_posts using btree (created_at desc) TABLESPACE pg_default;

create trigger update_feed_posts_updated_at BEFORE
update on feed_posts for EACH row
execute FUNCTION update_updated_at_column ();

-- notifications table schema

create table public.notifications (
  id uuid not null default gen_random_uuid (),
  user_id text null,
  type text not null,
  title text not null,
  message text null,
  data jsonb null,
  is_read boolean null default false,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign KEY (user_id) references users (privy_id) on delete CASCADE,
  constraint notifications_type_check check (
    (
      type = any (
        array[
          'achievement'::text,
          'event'::text,
          'social'::text,
          'system'::text,
          'reward'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_notifications_user_id on public.notifications using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_notifications_is_read on public.notifications using btree (is_read) TABLESPACE pg_default;

create index IF not exists idx_notifications_created_at on public.notifications using btree (created_at desc) TABLESPACE pg_default;

-- users table schema

create table public.users (
  privy_id text not null,
  username text null,
  display_name text null,
  bio text null,
  avatar_url text null,
  cover_image_url text null,
  location text null,
  city text null,
  latitude numeric(10, 8) null,
  longitude numeric(11, 8) null,
  website text null,
  instagram text null,
  tiktok text null,
  youtube text null,
  twitter text null,
  dance_styles text[] null,
  skill_level text null,
  favorite_music text[] null,
  age integer null,
  pronouns text null,
  is_public boolean null default true,
  allow_messages boolean null default true,
  show_location boolean null default true,
  notification_preferences jsonb null default '{"push": true, "email": true, "dance_reminders": true}'::jsonb,
  xp integer null default 0,
  level integer null default 1,
  subscription_tier text null default 'free'::text,
  total_dance_time integer null default 0,
  total_sessions integer null default 0,
  longest_streak integer null default 0,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  last_active_at timestamp with time zone null default CURRENT_TIMESTAMP,
  role text null default 'user'::text,
  is_organizer_approved boolean null default false,
  organizer_approved_by text null,
  organizer_approved_at timestamp with time zone null,
  company_name character varying(255) null,
  event_types text[] null,
  invited_by character varying(255) null,
  social_media_links jsonb null default '{}'::jsonb,
  website_url character varying(500) null,
  organizer_bio text null,
  organizer_requested_at timestamp with time zone null,
  organizer_rejection_reason text null,
  total_events_attended integer null default 0,
  total_events_created integer null default 0,
  upcoming_events_count integer null default 0,
  total_achievements integer null default 0,
  dance_bonds_count integer null default 0,
  is_premium text null default 'inactive'::text,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  subscription_status text null default 'inactive'::text,
  subscription_plan text null,
  subscription_start_date timestamp with time zone null,
  subscription_end_date timestamp with time zone null,
  subscription_cancelled_at timestamp with time zone null,
  constraint users_pkey primary key (privy_id),
  constraint users_stripe_customer_id_key unique (stripe_customer_id),
  constraint users_username_key unique (username),
  constraint users_organizer_approved_by_fkey foreign KEY (organizer_approved_by) references users (privy_id) on update CASCADE on delete set null,
  constraint users_skill_level_check check (
    (
      (skill_level is null)
      or (
        skill_level = any (
          array[
            'all'::text,
            'beginner'::text,
            'intermediate'::text,
            'advanced'::text
          ]
        )
      )
    )
  ),
  constraint users_subscription_plan_check check (
    (
      subscription_plan = any (array['monthly'::text, 'yearly'::text])
    )
  ),
  constraint users_subscription_status_check check (
    (
      subscription_status = any (
        array[
          'active'::text,
          'inactive'::text,
          'cancelled'::text,
          'past_due'::text,
          'trialing'::text,
          'incomplete'::text,
          'incomplete_expired'::text,
          'unpaid'::text
        ]
      )
    )
  ),
  constraint users_subscription_tier_check check (
    (
      subscription_tier = any (
        array[
          'free'::text,
          'mover'::text,
          'groover'::text,
          'legend'::text
        ]
      )
    )
  ),
  constraint users_age_check check (
    (
      (age >= 13)
      and (age <= 120)
    )
  ),
  constraint valid_username check ((username ~* '^[a-zA-Z0-9_]{3,30}$'::text)),
  constraint users_is_premium_check check (
    (
      is_premium = any (
        array[
          'active'::text,
          'inactive'::text,
          'cancelled'::text,
          'past_due'::text,
          'trialing'::text
        ]
      )
    )
  ),
  constraint users_privy_id_check check ((privy_id is not null)),
  constraint users_role_check check (
    (
      role = any (
        array[
          'user'::text,
          'manager'::text,
          'admin'::text,
          'organizer'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_users_city on public.users using btree (city) TABLESPACE pg_default;

create index IF not exists idx_users_created_at on public.users using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_users_dance_styles on public.users using gin (dance_styles) TABLESPACE pg_default;

create index IF not exists idx_users_role on public.users using btree (role) TABLESPACE pg_default;

create index IF not exists idx_users_skill_level on public.users using btree (skill_level) TABLESPACE pg_default;

create index IF not exists idx_users_username on public.users using btree (username) TABLESPACE pg_default;

create index IF not exists idx_users_xp on public.users using btree (xp desc) TABLESPACE pg_default;

create index IF not exists idx_users_organizer_approval on public.users using btree (role, is_organizer_approved) TABLESPACE pg_default
where
  (role = 'organizer'::text);

create index IF not exists idx_users_pending_organizers on public.users using btree (organizer_requested_at) TABLESPACE pg_default
where
  (
    (role = 'organizer'::text)
    and (is_organizer_approved = false)
  );

create index IF not exists idx_users_stripe_customer_id on public.users using btree (stripe_customer_id) TABLESPACE pg_default
where
  (stripe_customer_id is not null);

create index IF not exists idx_users_is_premium on public.users using btree (is_premium) TABLESPACE pg_default
where
  (is_premium = 'active'::text);

create index IF not exists idx_users_organizer_approved_by on public.users using btree (organizer_approved_by) TABLESPACE pg_default
where
  (organizer_approved_by is not null);

-- subscription_history table schema

create table public.subscription_history (
  id uuid not null default gen_random_uuid (),
  user_id text not null,
  stripe_subscription_id text null,
  status text not null,
  plan text null,
  event_type text not null,
  metadata jsonb null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint subscription_history_pkey primary key (id),
  constraint subscription_history_user_id_fkey foreign KEY (user_id) references users (privy_id) on delete CASCADE,
  constraint subscription_history_event_type_check check (
    (
      event_type = any (
        array[
          'created'::text,
          'updated'::text,
          'cancelled'::text,
          'reactivated'::text,
          'payment_failed'::text,
          'payment_succeeded'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_subscription_history_user_id on public.subscription_history using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_subscription_history_created_at on public.subscription_history using btree (created_at desc) TABLESPACE pg_default;