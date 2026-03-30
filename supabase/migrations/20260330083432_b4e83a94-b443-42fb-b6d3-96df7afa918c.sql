ALTER TABLE public.diagnostic_submissions
  ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'neu',
  ADD COLUMN IF NOT EXISTS last_contacted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS follow_up_notes text,
  ADD COLUMN IF NOT EXISTS call_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS call_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS call_result text,
  ADD COLUMN IF NOT EXISTS internal_notes text;