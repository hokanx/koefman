
ALTER TABLE public.diagnostic_submissions
  ADD COLUMN IF NOT EXISTS company_size text DEFAULT '',
  ADD COLUMN IF NOT EXISTS problems text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS free_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS importance text DEFAULT '',
  ADD COLUMN IF NOT EXISTS commitment text DEFAULT '',
  ADD COLUMN IF NOT EXISTS urgency text DEFAULT '',
  ADD COLUMN IF NOT EXISTS intent_score text DEFAULT 'medium';
