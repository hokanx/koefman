
ALTER TABLE public.lead_analyses ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS idx_lead_analyses_submission_id ON public.lead_analyses(submission_id);
CREATE INDEX IF NOT EXISTS idx_lead_analyses_analysis_status ON public.lead_analyses(analysis_status);
CREATE INDEX IF NOT EXISTS idx_lead_analyses_created_at ON public.lead_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_submissions_created_at ON public.diagnostic_submissions(created_at DESC);
