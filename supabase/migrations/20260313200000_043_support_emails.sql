-- 043: Support email system
-- Inbound emails stored for tracking, AI draft generation, and staff replies

-- Inbound support emails
CREATE TABLE flowb_support_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id text NOT NULL UNIQUE,           -- Resend email ID
  from_address text NOT NULL,
  from_name text,
  to_address text NOT NULL,
  subject text,
  text_body text,
  html_body text,
  status text DEFAULT 'new',               -- new | in_progress | replied | closed
  assigned_to text,                        -- admin user_id
  priority text DEFAULT 'normal',          -- low | normal | high | urgent
  tags text[],
  tg_message_id bigint,                    -- message ID in support channel (for editing)
  tg_chat_id bigint,                       -- chat ID where notification was sent
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Staff replies (history)
CREATE TABLE flowb_support_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES flowb_support_emails(id),
  replied_by text NOT NULL,                -- admin user_id
  reply_text text NOT NULL,
  reply_html text,
  ai_generated boolean DEFAULT false,
  ai_edited boolean DEFAULT false,
  sent_at timestamptz DEFAULT now()
);

CREATE INDEX idx_support_emails_status ON flowb_support_emails(status);
CREATE INDEX idx_support_emails_created ON flowb_support_emails(created_at DESC);
CREATE INDEX idx_support_replies_ticket ON flowb_support_replies(ticket_id);
