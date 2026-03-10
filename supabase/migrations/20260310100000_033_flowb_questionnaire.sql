-- Biz questionnaire submissions
create table if not exists flowb_questionnaire_submissions (
  id            bigint generated always as identity primary key,
  name          text,
  biz_name      text,
  email         text,
  phone         text,
  data          jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- Index for lookups by email
create index if not exists idx_questionnaire_email on flowb_questionnaire_submissions (email) where email is not null;

-- RLS: service role only (no anon access)
alter table flowb_questionnaire_submissions enable row level security;
